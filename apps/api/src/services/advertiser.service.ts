import { randomUUID } from 'node:crypto'
import type {
  ApiAdvertiserDashboardResponse,
  ApiAdvertiserProperty,
  ApiAdvertiserVerificationRequest,
} from '@roof-tech/shared'
import { ModerationStatus, VerificationDocumentType } from '../generated/prisma/client.js'
import {
  advertiserRepository,
  type AdvertiserPropertyRecord,
} from '../repositories/advertiser.repository.js'
import { DomainError } from '../utils/domain-error.js'
import {
  FileValidationError,
  optimizePropertyImage,
  prepareVerificationDocument,
} from './file-validation.service.js'
import { makeStorageKey, objectStorage } from './object-storage.service.js'
import type {
  PropertyDraftInput,
  PropertyUpdateInput,
} from '../validations/advertiser.validation.js'

type VerificationDocumentInput = {
  storageKey: string
  documentType: VerificationDocumentType
  mimeType: string
  fileSize: number
}

function toAdvertiserProperty(property: AdvertiserPropertyRecord): ApiAdvertiserProperty {
  return {
    id: property.id,
    reference: property.reference,
    slug: property.slug,
    title: property.title,
    description: property.description,
    propertyType: property.propertyType,
    monthlyRent: property.monthlyRent.toFixed(2),
    depositAmount: property.depositAmount?.toFixed(2) ?? null,
    visitFee: property.visitFee?.toFixed(2) ?? null,
    otherInitialCost: property.otherInitialCost?.toFixed(2) ?? null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpaces: property.parkingSpaces,
    areaM2: property.areaM2?.toFixed(2) ?? null,
    moderationStatus: property.moderationStatus,
    moderationNote: property.moderationNote,
    availabilityStatus: property.availabilityStatus,
    location: {
      neighborhoodId: property.neighborhood.id,
      neighborhood: property.neighborhood.name,
      city: property.neighborhood.city.name,
    },
    features: property.features.map(({ feature }) => ({ slug: feature.slug, name: feature.name })),
    images: property.images.map(({ id, imageUrl, altText, displayOrder }) => ({
      id,
      imageUrl,
      altText,
      displayOrder,
    })),
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  }
}

function toVerificationRequest(request: {
  id: string
  verificationType: 'IDENTITY' | 'LISTING_AUTHORIZATION'
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: Date
  documents: {
    id: string
    documentType: 'IDENTITY_DOCUMENT' | 'AUTHORIZATION_DOCUMENT' | 'OTHER'
    mimeType: string
    fileSize: number
    createdAt: Date
  }[]
}): ApiAdvertiserVerificationRequest {
  return {
    id: request.id,
    verificationType: request.verificationType,
    status: request.status,
    reviewNote: request.reviewNote,
    createdAt: request.createdAt.toISOString(),
    documents: request.documents.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      createdAt: document.createdAt.toISOString(),
    })),
  }
}

async function featureIdsFromSlugs(slugs: string[]) {
  const features = await advertiserRepository.findFeaturesBySlug(slugs)
  if (features.length !== new Set(slugs).size) {
    throw new DomainError(
      400,
      'UNKNOWN_PROPERTY_FEATURE',
      'Uma das características seleccionadas não está disponível.',
    )
  }
  return features.map(({ id }) => id)
}

async function advertiserProfile(userId: string) {
  const profile = await advertiserRepository.findProfile(userId)
  if (!profile)
    throw new DomainError(
      403,
      'ADVERTISER_PROFILE_REQUIRED',
      'O perfil de anunciante não está disponível.',
    )
  return profile
}

export const advertiserService = {
  async getDashboard(userId: string): Promise<ApiAdvertiserDashboardResponse> {
    const result = await advertiserRepository.dashboard(userId)
    return {
      summary: result.summary,
      verification: result.verification,
      recentProperties: result.recentProperties.map(toAdvertiserProperty),
    }
  },

  async listProperties(userId: string) {
    const items = await advertiserRepository.listProperties(userId)
    return { items: items.map(toAdvertiserProperty) }
  },

  async getProperty(userId: string, propertyId: string) {
    const property = await advertiserRepository.findOwnedProperty(userId, propertyId)
    return property ? toAdvertiserProperty(property) : null
  },

  async listFeatures() {
    return { items: await advertiserRepository.listAvailableFeatures() }
  },

  async createDraft(userId: string, input: PropertyDraftInput) {
    const profile = await advertiserProfile(userId)
    const ids = await featureIdsFromSlugs(input.featureSlugs)
    const property = await advertiserRepository.createDraft(profile.id, input, ids)
    return property ? toAdvertiserProperty(property) : null
  },

  async updateProperty(userId: string, propertyId: string, input: PropertyUpdateInput) {
    const profile = await advertiserProfile(userId)
    const ids =
      input.featureSlugs === undefined ? undefined : await featureIdsFromSlugs(input.featureSlugs)
    const property = await advertiserRepository.updateDraft(
      userId,
      profile.id,
      propertyId,
      input,
      ids,
    )
    return property ? toAdvertiserProperty(property) : null
  },

  async submitForReview(userId: string, propertyId: string) {
    const property = await advertiserRepository.submitForReview(userId, propertyId)
    return property ? toAdvertiserProperty(property) : null
  },

  async setAvailability(userId: string, propertyId: string, status: 'AVAILABLE' | 'UNAVAILABLE') {
    const property = await advertiserRepository.setAvailability(userId, propertyId, userId, status)
    return property ? toAdvertiserProperty(property) : null
  },

  async archive(userId: string, propertyId: string) {
    const profile = await advertiserProfile(userId)
    const property = await advertiserRepository.archive(userId, propertyId, profile.id)
    return property ? toAdvertiserProperty(property) : null
  },

  async uploadPropertyImage(userId: string, propertyId: string, file: Buffer, altText?: string) {
    const property = await advertiserRepository.findOwnedProperty(userId, propertyId)
    if (!property) return null
    if (
      property.moderationStatus === ModerationStatus.SUSPENDED ||
      property.moderationStatus === ModerationStatus.ARCHIVED
    ) {
      throw new DomainError(
        409,
        'PROPERTY_LOCKED',
        'Este anúncio não aceita fotografias no estado actual.',
      )
    }
    const optimized = await optimizePropertyImage(file)
    const key = makeStorageKey('property-images', propertyId, 'webp')
    await objectStorage.put('public', key, optimized, 'image/webp')
    try {
      const updated = await advertiserRepository.addImage(userId, propertyId, {
        storageKey: key,
        imageUrl: objectStorage.publicUrl(key),
        altText: altText?.trim() || null,
      })
      if (!updated) {
        await objectStorage.delete('public', key)
        return null
      }
      return toAdvertiserProperty(updated)
    } catch (error) {
      await objectStorage.delete('public', key).catch(() => undefined)
      throw error
    }
  },

  async deletePropertyImage(userId: string, propertyId: string, imageId: string) {
    const existing = await advertiserRepository.findOwnedImage(userId, propertyId, imageId)
    if (!existing) return null
    if (
      existing.property.moderationStatus === ModerationStatus.SUSPENDED ||
      existing.property.moderationStatus === ModerationStatus.ARCHIVED
    ) {
      throw new DomainError(
        409,
        'PROPERTY_LOCKED',
        'Este anúncio não aceita alterações no estado actual.',
      )
    }
    if (!existing.image.storageKey) {
      throw new DomainError(
        409,
        'IMAGE_NOT_MANAGED',
        'Esta fotografia não pode ser removida por aqui.',
      )
    }
    await objectStorage.delete('public', existing.image.storageKey)
    const updated = await advertiserRepository.deleteImageAndReorder(userId, propertyId, imageId)
    return updated ? toAdvertiserProperty(updated) : null
  },

  async reorderPropertyImages(userId: string, propertyId: string, imageIds: string[]) {
    const property = await advertiserRepository.reorderImages(userId, propertyId, imageIds)
    return property ? toAdvertiserProperty(property) : null
  },

  async listVerificationRequests(userId: string) {
    const items = await advertiserRepository.listVerificationRequests(userId)
    return { items: items.map(toVerificationRequest) }
  },

  async createVerificationRequest(
    userId: string,
    type: 'IDENTITY' | 'LISTING_AUTHORIZATION',
    files: Buffer[],
  ) {
    if (files.length < 1 || files.length > 3) {
      throw new DomainError(
        400,
        'VERIFICATION_DOCUMENTS_REQUIRED',
        'Envie entre 1 e 3 documentos para solicitar verificação.',
      )
    }
    const profile = await advertiserProfile(userId)
    const pendingRequests = await advertiserRepository.listVerificationRequests(userId)
    if (
      pendingRequests.some(
        (request) => request.verificationType === type && request.status === 'PENDING',
      )
    ) {
      throw new DomainError(
        409,
        'VERIFICATION_ALREADY_PENDING',
        'Já existe um pedido de verificação pendente deste tipo.',
      )
    }

    const requestId = randomUUID()
    const documentType =
      type === 'IDENTITY'
        ? VerificationDocumentType.IDENTITY_DOCUMENT
        : VerificationDocumentType.AUTHORIZATION_DOCUMENT
    const storedKeys: string[] = []
    const documents: VerificationDocumentInput[] = []
    try {
      for (const file of files) {
        const prepared = await prepareVerificationDocument(file)
        const storageKey = makeStorageKey('verification-documents', requestId, prepared.extension)
        await objectStorage.put('private', storageKey, prepared.body, prepared.mimeType)
        storedKeys.push(storageKey)
        documents.push({
          storageKey,
          documentType,
          mimeType: prepared.mimeType,
          fileSize: prepared.body.byteLength,
        })
      }
      const request = await advertiserRepository.createVerificationRequest(
        requestId,
        userId,
        profile.id,
        type,
        documents,
      )
      return toVerificationRequest(request)
    } catch (error) {
      await Promise.all(
        storedKeys.map((key) => objectStorage.delete('private', key).catch(() => undefined)),
      )
      if (error instanceof FileValidationError) {
        throw new DomainError(400, 'FILE_VALIDATION_ERROR', error.message)
      }
      throw error
    }
  },

  async getVerificationDocument(userId: string, requestId: string, documentId: string) {
    const document = await advertiserRepository.findOwnedVerificationDocument(
      userId,
      requestId,
      documentId,
    )
    if (!document) return null
    const body = await objectStorage.getPrivate(document.storageKey)
    return {
      body,
      mimeType: document.mimeType,
      fileName: `roof-tech-verificacao-${document.id}.${document.mimeType === 'application/pdf' ? 'pdf' : 'webp'}`,
    }
  },
}
