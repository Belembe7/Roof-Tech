import type {
  ApiAdminAuditEntry,
  ApiAdminProperty,
  ApiAdminReport,
  ApiAdminVerificationRequest,
} from '@roof-tech/shared'
import { ReportReason, ReportStatus, UserRole, UserStatus } from '../generated/prisma/client.js'
import { adminRepository } from '../repositories/admin.repository.js'
import { DomainError } from '../utils/domain-error.js'
import type {
  PropertyReviewInput,
  VerificationReviewInput,
} from '../validations/admin.validation.js'
import { objectStorage } from './object-storage.service.js'

export const adminService = {
  async overview() {
    const response = await adminRepository.overview()
    return {
      ...response,
      recentActivity: response.recentActivity.map(toAuditEntry),
    }
  },

  async listProperties(): Promise<{ items: ApiAdminProperty[] }> {
    const properties = await adminRepository.listProperties()
    return {
      items: properties.map((property) => ({
        id: property.id,
        reference: property.reference,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType,
        monthlyRent: property.monthlyRent.toFixed(2),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parkingSpaces: property.parkingSpaces,
        areaM2: property.areaM2?.toFixed(2) ?? null,
        createdAt: property.createdAt.toISOString(),
        neighborhood: {
          name: property.neighborhood.name,
          city: property.neighborhood.city.name,
        },
        advertiser: {
          name: property.advertiser.user.name,
          email: property.advertiser.user.email,
          phone: property.advertiser.user.phone,
          type: property.advertiser.advertiserType,
          verificationStatus: property.advertiser.verificationStatus,
        },
        features: property.features.map(({ feature }) => ({
          slug: feature.slug,
          name: feature.name,
        })),
        images: property.images.map(({ id, imageUrl, altText, displayOrder }) => ({
          id,
          imageUrl,
          altText,
          displayOrder,
        })),
      })),
    }
  },

  reviewProperty(propertyId: string, actorId: string, input: PropertyReviewInput) {
    return adminRepository.reviewProperty(propertyId, actorId, input)
  },

  async listVerificationRequests(): Promise<{ items: ApiAdminVerificationRequest[] }> {
    const requests = await adminRepository.listVerificationRequests()
    return {
      items: requests.map((request) => ({
        id: request.id,
        verificationType: request.verificationType,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        advertiser: {
          name: request.advertiser.user.name,
          email: request.advertiser.user.email,
          type: request.advertiser.advertiserType,
        },
        documents: request.documents.map((document) => ({
          id: document.id,
          documentType: document.documentType,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          createdAt: document.createdAt.toISOString(),
        })),
      })),
    }
  },

  reviewVerification(requestId: string, actorId: string, input: VerificationReviewInput) {
    return adminRepository.reviewVerification(requestId, actorId, input)
  },

  async getVerificationDocument(requestId: string, documentId: string) {
    const document = await adminRepository.getDocument(requestId, documentId)
    if (!document) return null
    const body = await objectStorage.getPrivate(document.storageKey)
    return {
      body,
      mimeType: document.mimeType,
      fileName: `roof-tech-verificacao-${document.id}.${document.mimeType === 'application/pdf' ? 'pdf' : 'webp'}`,
    }
  },

  async listReports(status?: ReportStatus): Promise<{ items: ApiAdminReport[] }> {
    const reports = await adminRepository.listReports(status)
    return {
      items: reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        property: report.property,
        reporter: report.reporter,
      })),
    }
  },

  submitReport(
    propertySlug: string,
    reporterId: string | null,
    input: { reason: ReportReason; description?: string },
  ) {
    return adminRepository.submitReport(propertySlug, reporterId, input.reason, input.description)
  },

  updateReport(reportId: string, actorId: string, status: ReportStatus) {
    return adminRepository.updateReport(reportId, actorId, status)
  },

  async listUsers(query: { search?: string; status?: UserStatus; role?: UserRole }) {
    const users = await adminRepository.listUsers(query)
    return {
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        advertiserType: user.advertiserProfile?.advertiserType ?? null,
      })),
    }
  },

  setUserStatus(userId: string, actorId: string, status: UserStatus) {
    return adminRepository.setUserStatus(userId, actorId, status)
  },

  async listAuditLogs(): Promise<{ items: ApiAdminAuditEntry[] }> {
    const items = await adminRepository.listAuditLogs()
    return { items: items.map(toAuditEntry) }
  },
}

function toAuditEntry(entry: Awaited<ReturnType<typeof adminRepository.listAuditLogs>>[number]) {
  const metadata = entry.metadata
  return {
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : null,
    createdAt: entry.createdAt.toISOString(),
    actor: entry.actor,
  } satisfies ApiAdminAuditEntry
}

export function reportStatusFromInput(status: string) {
  const mapped: Record<string, ReportStatus> = {
    UNDER_REVIEW: ReportStatus.UNDER_REVIEW,
    NEEDS_INFORMATION: ReportStatus.NEEDS_INFORMATION,
    RESOLVED: ReportStatus.RESOLVED,
    DISMISSED: ReportStatus.DISMISSED,
  }
  const value = mapped[status]
  if (!value) throw new DomainError(400, 'INVALID_REPORT_STATUS', 'Estado de denúncia inválido.')
  return value
}

export function reportReasonFromInput(reason: string) {
  const mapped: Record<string, ReportReason> = {
    INCORRECT_INFORMATION: ReportReason.INCORRECT_INFORMATION,
    POSSIBLE_FRAUD: ReportReason.POSSIBLE_FRAUD,
    UNAVAILABLE_PROPERTY: ReportReason.UNAVAILABLE_PROPERTY,
    UNAUTHORIZED_LISTING: ReportReason.UNAUTHORIZED_LISTING,
    OTHER: ReportReason.OTHER,
  }
  const value = mapped[reason]
  if (!value) throw new DomainError(400, 'INVALID_REPORT_REASON', 'Motivo de denúncia inválido.')
  return value
}
