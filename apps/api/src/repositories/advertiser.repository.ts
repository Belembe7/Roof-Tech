import { randomBytes } from 'node:crypto'
import {
  AvailabilityStatus,
  VerificationDocumentType,
  ModerationStatus,
  Prisma,
  VerificationStatus,
  VerificationType,
} from '../generated/prisma/client.js'
import { prisma } from '../db/client.js'
import { DomainError } from '../utils/domain-error.js'
import type {
  PropertyDraftInput,
  PropertyUpdateInput,
} from '../validations/advertiser.validation.js'

export const advertiserPropertyInclude = {
  neighborhood: { include: { city: true } },
  features: { include: { feature: true } },
  images: { orderBy: { displayOrder: 'asc' as const } },
} satisfies Prisma.PropertyInclude

export type AdvertiserPropertyRecord = Prisma.PropertyGetPayload<{
  include: typeof advertiserPropertyInclude
}>

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function makeReference() {
  return `RT-${randomBytes(5).toString('hex').toUpperCase()}`
}

function makeSlug(title: string, neighborhoodSlug: string) {
  const suffix = randomBytes(4).toString('hex')
  return `${slugify(title).slice(0, 120)}-${neighborhoodSlug}-${suffix}`.slice(0, 180)
}

function ownedPropertyWhere(userId: string, id: string): Prisma.PropertyWhereInput {
  return { id, advertiser: { userId } }
}

export const advertiserRepository = {
  findProfile(userId: string) {
    return prisma.advertiserProfile.findUnique({ where: { userId } })
  },

  async findOwnedProperty(userId: string, id: string) {
    return prisma.property.findFirst({
      where: ownedPropertyWhere(userId, id),
      include: advertiserPropertyInclude,
    })
  },

  async listProperties(userId: string) {
    return prisma.property.findMany({
      where: { advertiser: { userId } },
      include: advertiserPropertyInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    })
  },

  async dashboard(userId: string) {
    const where: Prisma.PropertyWhereInput = { advertiser: { userId } }
    const [properties, countsByStatus, unavailable, advertiser, latestRequests] = await Promise.all(
      [
        prisma.property.findMany({
          where,
          include: advertiserPropertyInclude,
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        prisma.property.groupBy({ by: ['moderationStatus'], where, _count: { _all: true } }),
        prisma.property.count({
          where: {
            ...where,
            moderationStatus: ModerationStatus.APPROVED,
            availabilityStatus: AvailabilityStatus.UNAVAILABLE,
          },
        }),
        prisma.advertiserProfile.findUnique({ where: { userId } }),
        prisma.verificationRequest.findMany({
          where: {
            advertiser: { userId },
            verificationType: VerificationType.LISTING_AUTHORIZATION,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        }),
      ],
    )
    const count = (status: ModerationStatus) =>
      countsByStatus.find((item) => item.moderationStatus === status)?._count._all ?? 0
    return {
      summary: {
        total: countsByStatus.reduce((sum, item) => sum + item._count._all, 0),
        drafts: count(ModerationStatus.DRAFT),
        pending: count(ModerationStatus.PENDING),
        active: await prisma.property.count({
          where: {
            ...where,
            moderationStatus: ModerationStatus.APPROVED,
            availabilityStatus: AvailabilityStatus.AVAILABLE,
          },
        }),
        unavailable,
        suspended: count(ModerationStatus.SUSPENDED),
        rejected: count(ModerationStatus.REJECTED),
        archived: count(ModerationStatus.ARCHIVED),
      },
      verification: {
        identity: advertiser?.verificationStatus ?? VerificationStatus.NOT_SUBMITTED,
        listingAuthorization: latestRequests[0]?.status ?? VerificationStatus.NOT_SUBMITTED,
      },
      recentProperties: properties,
    }
  },

  async createDraft(advertiserId: string, input: PropertyDraftInput, featureIds: string[]) {
    const neighborhood = await prisma.neighborhood.findUnique({
      where: { id: input.neighborhoodId },
      select: { slug: true },
    })
    if (!neighborhood) return null
    return prisma.property.create({
      data: {
        reference: makeReference(),
        slug: makeSlug(input.title, neighborhood.slug),
        advertiserId,
        neighborhoodId: input.neighborhoodId,
        title: input.title,
        description: input.description,
        propertyType: input.propertyType,
        monthlyRent: input.monthlyRent,
        depositAmount: input.depositAmount ?? null,
        visitFee: input.visitFee ?? null,
        otherInitialCost: input.otherInitialCost ?? null,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        parkingSpaces: input.parkingSpaces,
        areaM2: input.areaM2 ?? null,
        moderationStatus: ModerationStatus.DRAFT,
        availabilityStatus: AvailabilityStatus.UNCONFIRMED,
        isDemo: false,
        features: { create: featureIds.map((featureId) => ({ featureId })) },
      },
      include: advertiserPropertyInclude,
    })
  },

  async updateDraft(
    userId: string,
    advertiserId: string,
    id: string,
    input: PropertyUpdateInput,
    featureIds?: string[],
  ) {
    const current = await this.findOwnedProperty(userId, id)
    if (!current) return null
    if (
      current.moderationStatus === ModerationStatus.SUSPENDED ||
      current.moderationStatus === ModerationStatus.ARCHIVED
    ) {
      throw new DomainError(
        409,
        'PROPERTY_LOCKED',
        'Este anúncio não pode ser editado no estado actual.',
      )
    }

    const status =
      current.moderationStatus === ModerationStatus.APPROVED
        ? ModerationStatus.PENDING
        : current.moderationStatus === ModerationStatus.REJECTED
          ? ModerationStatus.DRAFT
          : current.moderationStatus
    const neighborhood = input.neighborhoodId
      ? await prisma.neighborhood.findUnique({
          where: { id: input.neighborhoodId },
          select: { slug: true },
        })
      : null
    if (input.neighborhoodId && !neighborhood) return null

    return prisma.property.update({
      where: { id, advertiserId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.title !== undefined || neighborhood
          ? {
              slug: makeSlug(
                input.title ?? current.title,
                neighborhood?.slug ?? current.neighborhood.slug,
              ),
            }
          : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
        ...(input.neighborhoodId !== undefined ? { neighborhoodId: input.neighborhoodId } : {}),
        ...(input.monthlyRent !== undefined ? { monthlyRent: input.monthlyRent } : {}),
        ...(input.depositAmount !== undefined ? { depositAmount: input.depositAmount } : {}),
        ...(input.visitFee !== undefined ? { visitFee: input.visitFee } : {}),
        ...(input.otherInitialCost !== undefined
          ? { otherInitialCost: input.otherInitialCost }
          : {}),
        ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
        ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
        ...(input.parkingSpaces !== undefined ? { parkingSpaces: input.parkingSpaces } : {}),
        ...(input.areaM2 !== undefined ? { areaM2: input.areaM2 } : {}),
        ...(featureIds !== undefined
          ? { features: { deleteMany: {}, create: featureIds.map((featureId) => ({ featureId })) } }
          : {}),
        moderationStatus: status,
        ...(status === ModerationStatus.PENDING ? { moderationNote: null } : {}),
        ...(status === ModerationStatus.PENDING ? { publishedAt: null } : {}),
      },
      include: advertiserPropertyInclude,
    })
  },

  listAvailableFeatures() {
    return prisma.propertyFeature.findMany({
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    })
  },

  findFeaturesBySlug(slugs: string[]) {
    return prisma.propertyFeature.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    })
  },

  async addImage(
    userId: string,
    propertyId: string,
    image: { storageKey: string; imageUrl: string; altText: string | null },
  ) {
    return prisma.$transaction(
      async (transaction) => {
        const property = await transaction.property.findFirst({
          where: ownedPropertyWhere(userId, propertyId),
          select: { id: true, advertiserId: true, moderationStatus: true },
        })
        if (!property) return null
        if (
          property.moderationStatus === ModerationStatus.SUSPENDED ||
          property.moderationStatus === ModerationStatus.ARCHIVED
        ) {
          throw new DomainError(
            409,
            'PROPERTY_LOCKED',
            'Este anúncio não aceita alterações no estado actual.',
          )
        }
        const images = await transaction.propertyImage.findMany({
          where: { propertyId },
          orderBy: { displayOrder: 'asc' },
          select: { id: true },
        })
        if (images.length >= 10) {
          throw new DomainError(
            409,
            'PROPERTY_IMAGE_LIMIT',
            'Cada anúncio pode ter no máximo 10 fotografias.',
          )
        }
        await transaction.propertyImage.create({
          data: {
            propertyId,
            storageKey: image.storageKey,
            imageUrl: image.imageUrl,
            altText: image.altText,
            displayOrder: images.length,
          },
        })
        const nextStatus =
          property.moderationStatus === ModerationStatus.APPROVED
            ? ModerationStatus.PENDING
            : property.moderationStatus === ModerationStatus.REJECTED
              ? ModerationStatus.DRAFT
              : property.moderationStatus
        if (nextStatus !== property.moderationStatus) {
          await transaction.property.update({
            where: { id: propertyId, advertiserId: property.advertiserId },
            data: {
              moderationStatus: nextStatus,
              ...(nextStatus === ModerationStatus.PENDING ? { publishedAt: null } : {}),
            },
          })
        }
        return transaction.property.findUniqueOrThrow({
          where: { id: propertyId },
          include: advertiserPropertyInclude,
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  },

  async findOwnedImage(userId: string, propertyId: string, imageId: string) {
    const property = await prisma.property.findFirst({
      where: ownedPropertyWhere(userId, propertyId),
      select: { id: true, advertiserId: true, moderationStatus: true },
    })
    if (!property) return null
    const image = await prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    })
    return image ? { property, image } : null
  },

  async deleteImageAndReorder(userId: string, propertyId: string, imageId: string) {
    return prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findFirst({
        where: ownedPropertyWhere(userId, propertyId),
        select: { id: true, advertiserId: true, moderationStatus: true },
      })
      if (!property) return null
      if (
        property.moderationStatus === ModerationStatus.SUSPENDED ||
        property.moderationStatus === ModerationStatus.ARCHIVED
      ) {
        throw new DomainError(
          409,
          'PROPERTY_LOCKED',
          'Este anúncio não aceita alterações no estado actual.',
        )
      }
      const image = await transaction.propertyImage.findFirst({
        where: { id: imageId, propertyId },
      })
      if (!image) return null
      await transaction.propertyImage.delete({ where: { id: imageId } })
      const remaining = await transaction.propertyImage.findMany({
        where: { propertyId },
        orderBy: { displayOrder: 'asc' },
        select: { id: true },
      })
      for (const [index, item] of remaining.entries()) {
        await transaction.propertyImage.update({
          where: { id: item.id },
          data: { displayOrder: -index - 1 },
        })
      }
      for (const [index, item] of remaining.entries()) {
        await transaction.propertyImage.update({
          where: { id: item.id },
          data: { displayOrder: index },
        })
      }
      const nextStatus =
        property.moderationStatus === ModerationStatus.APPROVED
          ? ModerationStatus.PENDING
          : property.moderationStatus === ModerationStatus.REJECTED
            ? ModerationStatus.DRAFT
            : property.moderationStatus
      return transaction.property.update({
        where: { id: propertyId, advertiserId: property.advertiserId },
        data: {
          moderationStatus: nextStatus,
          ...(nextStatus === ModerationStatus.PENDING ? { publishedAt: null } : {}),
        },
        include: advertiserPropertyInclude,
      })
    })
  },

  async reorderImages(userId: string, propertyId: string, imageIds: string[]) {
    return prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findFirst({
        where: ownedPropertyWhere(userId, propertyId),
        select: { id: true, moderationStatus: true },
      })
      if (!property) return null
      if (
        property.moderationStatus === ModerationStatus.SUSPENDED ||
        property.moderationStatus === ModerationStatus.ARCHIVED
      ) {
        throw new DomainError(
          409,
          'PROPERTY_LOCKED',
          'Este anúncio não aceita alterações no estado actual.',
        )
      }
      const current = await transaction.propertyImage.findMany({
        where: { propertyId },
        select: { id: true },
      })
      if (current.length !== imageIds.length || !current.every(({ id }) => imageIds.includes(id))) {
        throw new DomainError(
          400,
          'INVALID_IMAGE_ORDER',
          'A lista de fotografias não corresponde ao anúncio.',
        )
      }
      for (const [index, id] of imageIds.entries()) {
        await transaction.propertyImage.update({
          where: { id },
          data: { displayOrder: -index - 1 },
        })
      }
      for (const [index, id] of imageIds.entries()) {
        await transaction.propertyImage.update({ where: { id }, data: { displayOrder: index } })
      }
      return transaction.property.findUniqueOrThrow({
        where: { id: propertyId },
        include: advertiserPropertyInclude,
      })
    })
  },

  async submitForReview(userId: string, id: string) {
    const property = await this.findOwnedProperty(userId, id)
    if (!property) return null
    if (
      property.moderationStatus !== ModerationStatus.DRAFT &&
      property.moderationStatus !== ModerationStatus.REJECTED
    ) {
      throw new DomainError(
        409,
        'PROPERTY_NOT_SUBMITTABLE',
        'Este anúncio não pode ser submetido neste estado.',
      )
    }
    if (property.images.length === 0) {
      throw new DomainError(
        409,
        'PROPERTY_IMAGE_REQUIRED',
        'Adicione pelo menos uma fotografia antes de submeter.',
      )
    }
    return prisma.property.update({
      where: { id: property.id, advertiserId: property.advertiserId },
      data: {
        moderationStatus: ModerationStatus.PENDING,
        moderationNote: null,
        publishedAt: null,
      },
      include: advertiserPropertyInclude,
    })
  },

  async setAvailability(
    userId: string,
    id: string,
    confirmedById: string,
    status: AvailabilityStatus,
  ) {
    const property = await this.findOwnedProperty(userId, id)
    if (!property) return null
    if (property.moderationStatus !== ModerationStatus.APPROVED) {
      throw new DomainError(
        409,
        'PROPERTY_NOT_APPROVED',
        'A disponibilidade só pode mudar num anúncio aprovado.',
      )
    }
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.property.update({
        where: { id: property.id, advertiserId: property.advertiserId },
        data: { availabilityStatus: status },
        include: advertiserPropertyInclude,
      })
      await transaction.availabilityCheck.create({
        data: { propertyId: property.id, confirmedById, status },
      })
      return updated
    })
  },

  async archive(userId: string, id: string, advertiserId: string) {
    const property = await this.findOwnedProperty(userId, id)
    if (!property) return null
    if (property.moderationStatus === ModerationStatus.SUSPENDED) {
      throw new DomainError(
        409,
        'PROPERTY_SUSPENDED',
        'Um anúncio suspenso não pode ser arquivado pelo anunciante.',
      )
    }
    return prisma.property.update({
      where: { id: property.id, advertiserId },
      data: { moderationStatus: ModerationStatus.ARCHIVED, publishedAt: null },
      include: advertiserPropertyInclude,
    })
  },

  listVerificationRequests(userId: string) {
    return prisma.verificationRequest.findMany({
      where: { advertiser: { userId } },
      include: {
        documents: {
          select: { id: true, documentType: true, mimeType: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createVerificationRequest(
    id: string,
    userId: string,
    advertiserId: string,
    type: 'IDENTITY' | 'LISTING_AUTHORIZATION',
    documents: {
      storageKey: string
      documentType: VerificationDocumentType
      mimeType: string
      fileSize: number
    }[],
  ) {
    return prisma.$transaction(
      async (transaction) => {
        const pending = await transaction.verificationRequest.findFirst({
          where: { advertiserId, verificationType: type, status: VerificationStatus.PENDING },
          select: { id: true },
        })
        if (pending) {
          throw new DomainError(
            409,
            'VERIFICATION_ALREADY_PENDING',
            'Já existe um pedido de verificação pendente deste tipo.',
          )
        }
        const request = await transaction.verificationRequest.create({
          data: {
            id,
            advertiserId,
            verificationType: type,
            status: VerificationStatus.PENDING,
            documents: { create: documents },
          },
          include: {
            documents: {
              select: {
                id: true,
                documentType: true,
                mimeType: true,
                fileSize: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        })
        if (type === VerificationType.IDENTITY) {
          await transaction.advertiserProfile.update({
            where: { id: advertiserId, userId },
            data: { verificationStatus: VerificationStatus.PENDING },
          })
        }
        return request
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  },

  findOwnedVerificationDocument(userId: string, requestId: string, documentId: string) {
    return prisma.verificationDocument.findFirst({
      where: {
        id: documentId,
        verificationRequestId: requestId,
        verificationRequest: { advertiser: { userId } },
      },
      select: { id: true, storageKey: true, mimeType: true, fileSize: true },
    })
  },
}
