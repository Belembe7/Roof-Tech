import {
  ModerationStatus,
  Prisma,
  ReportReason,
  ReportStatus,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '../generated/prisma/client.js'
import { prisma } from '../db/client.js'
import { DomainError } from '../utils/domain-error.js'
import type {
  PropertyReviewInput,
  VerificationReviewInput,
} from '../validations/admin.validation.js'

const adminPropertyInclude = {
  neighborhood: { include: { city: true } },
  advertiser: {
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  },
  features: { include: { feature: true } },
  images: { orderBy: { displayOrder: 'asc' as const } },
} satisfies Prisma.PropertyInclude

export const adminRepository = {
  async overview() {
    const [
      pendingProperties,
      pendingVerifications,
      openReports,
      activeUsers,
      suspendedUsers,
      activity,
    ] = await Promise.all([
      prisma.property.count({
        where: { isDemo: false, moderationStatus: ModerationStatus.PENDING },
      }),
      prisma.verificationRequest.count({ where: { status: VerificationStatus.PENDING } }),
      prisma.report.count({
        where: {
          property: { isDemo: false },
          status: {
            in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW, ReportStatus.NEEDS_INFORMATION],
          },
        },
      }),
      prisma.user.count({ where: { passwordHash: { not: null }, status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { passwordHash: { not: null }, status: UserStatus.SUSPENDED } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ])
    return {
      summary: {
        pendingProperties,
        pendingVerifications,
        openReports,
        activeUsers,
        suspendedUsers,
      },
      recentActivity: activity,
    }
  },

  listProperties() {
    return prisma.property.findMany({
      where: { isDemo: false, moderationStatus: ModerationStatus.PENDING },
      include: adminPropertyInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    })
  },

  async reviewProperty(propertyId: string, actorId: string, input: PropertyReviewInput) {
    return prisma.$transaction(async (transaction) => {
      const changed = await transaction.property.updateMany({
        where: { id: propertyId, isDemo: false, moderationStatus: ModerationStatus.PENDING },
        data: {
          moderationStatus:
            input.decision === 'APPROVE' ? ModerationStatus.APPROVED : ModerationStatus.REJECTED,
          moderationNote: input.decision === 'REJECT' ? (input.reason ?? null) : null,
          publishedAt: input.decision === 'APPROVE' ? new Date() : null,
        },
      })
      if (changed.count === 0) return null
      const property = await transaction.property.findUniqueOrThrow({
        where: { id: propertyId },
        select: { id: true, reference: true, moderationStatus: true },
      })
      await transaction.auditLog.create({
        data: {
          actorId,
          action: input.decision === 'APPROVE' ? 'property.approved' : 'property.rejected',
          entityType: 'property',
          entityId: propertyId,
          metadata: { decision: input.decision, reason: input.reason ?? null },
        },
      })
      return property
    })
  },

  listVerificationRequests() {
    return prisma.verificationRequest.findMany({
      where: { status: VerificationStatus.PENDING },
      include: {
        advertiser: {
          include: { user: { select: { name: true, email: true } } },
        },
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
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    })
  },

  findVerificationDocument(requestId: string, documentId: string) {
    return prisma.verificationDocument.findFirst({
      where: { verificationRequestId: requestId, id: documentId },
      select: { storageKey: true, mimeType: true, id: true },
    })
  },

  async reviewVerification(requestId: string, actorId: string, input: VerificationReviewInput) {
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.verificationRequest.findFirst({
        where: { id: requestId, status: VerificationStatus.PENDING },
        select: { id: true, advertiserId: true, verificationType: true },
      })
      if (!request) return null
      const status =
        input.decision === 'APPROVE' ? VerificationStatus.APPROVED : VerificationStatus.REJECTED
      const changed = await transaction.verificationRequest.updateMany({
        where: { id: requestId, status: VerificationStatus.PENDING },
        data: {
          status,
          reviewNote: input.decision === 'REJECT' ? (input.reason ?? null) : null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      })
      if (changed.count === 0) return null
      if (request.verificationType === 'IDENTITY') {
        await transaction.advertiserProfile.update({
          where: { id: request.advertiserId },
          data: { verificationStatus: status },
        })
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: input.decision === 'APPROVE' ? 'verification.approved' : 'verification.rejected',
          entityType: 'verification_request',
          entityId: requestId,
          metadata: {
            decision: input.decision,
            verificationType: request.verificationType,
            reason: input.reason ?? null,
          },
        },
      })
      return { id: requestId, status }
    })
  },

  listReports(status?: ReportStatus) {
    return prisma.report.findMany({
      where: {
        property: { isDemo: false },
        ...(status
          ? { status }
          : {
              status: {
                in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW, ReportStatus.NEEDS_INFORMATION],
              },
            }),
      },
      include: {
        property: { select: { id: true, reference: true, title: true, slug: true } },
        reporter: { select: { name: true, email: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    })
  },

  async submitReport(
    propertySlug: string,
    reporterId: string | null,
    reason: ReportReason,
    description?: string,
  ) {
    const property = await prisma.property.findFirst({
      where: {
        slug: propertySlug,
        isDemo: false,
        moderationStatus: ModerationStatus.APPROVED,
      },
      select: { id: true },
    })
    if (!property) return null
    return prisma.$transaction(async (transaction) => {
      const report = await transaction.report.create({
        data: {
          propertyId: property.id,
          reporterId,
          reason,
          description: description || null,
        },
        select: { id: true, status: true, createdAt: true },
      })
      await transaction.auditLog.create({
        data: {
          actorId: reporterId,
          action: 'report.submitted',
          entityType: 'report',
          entityId: report.id,
          metadata: { propertyId: property.id, reason },
        },
      })
      return report
    })
  },

  async updateReport(reportId: string, actorId: string, status: ReportStatus) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.report.findFirst({
        where: { id: reportId, property: { isDemo: false } },
        select: { status: true },
      })
      if (!current) return null
      if (current.status === ReportStatus.RESOLVED || current.status === ReportStatus.DISMISSED) {
        throw new DomainError(409, 'REPORT_ALREADY_CLOSED', 'Esta denúncia já foi encerrada.')
      }
      const changed = await transaction.report.updateMany({
        where: { id: reportId, status: current.status },
        data: { status, reviewedById: actorId, reviewedAt: new Date() },
      })
      if (changed.count === 0) {
        throw new DomainError(
          409,
          'REPORT_ALREADY_UPDATED',
          'A denúncia foi alterada por outro revisor.',
        )
      }
      const report = await transaction.report.findUniqueOrThrow({
        where: { id: reportId },
        select: { id: true, status: true },
      })
      await transaction.auditLog.create({
        data: {
          actorId,
          action: `report.${status.toLowerCase()}`,
          entityType: 'report',
          entityId: reportId,
          metadata: { previousStatus: current.status, status },
        },
      })
      return report
    })
  },

  listUsers(query: { search?: string; role?: UserRole; status?: UserStatus }) {
    const search = query.search?.trim()
    return prisma.user.findMany({
      where: {
        passwordHash: { not: null },
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        advertiserProfile: { select: { advertiserType: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
    })
  },

  async setUserStatus(userId: string, actorId: string, status: UserStatus) {
    if (userId === actorId && status !== UserStatus.ACTIVE) {
      throw new DomainError(409, 'CANNOT_SUSPEND_SELF', 'Não pode suspender a sua própria conta.')
    }
    return prisma.$transaction(
      async (transaction) => {
        const current = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, status: true },
        })
        if (!current) return null
        if (
          current.role === UserRole.ADMIN &&
          status === UserStatus.SUSPENDED &&
          current.status === UserStatus.ACTIVE
        ) {
          const activeAdmins = await transaction.user.count({
            where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
          })
          if (activeAdmins <= 1) {
            throw new DomainError(
              409,
              'LAST_ACTIVE_ADMIN',
              'A última conta de administrador activa não pode ser suspensa.',
            )
          }
        }
        const updated = await transaction.user.update({
          where: { id: userId },
          data: { status },
          select: { id: true, status: true },
        })
        if (status === UserStatus.SUSPENDED) {
          await transaction.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: status === UserStatus.SUSPENDED ? 'user.suspended' : 'user.activated',
            entityType: 'user',
            entityId: userId,
            metadata: { previousStatus: current.status, status },
          },
        })
        return updated
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  },

  listAuditLogs() {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { name: true, email: true } } },
    })
  },

  async getDocument(requestId: string, documentId: string) {
    return prisma.verificationDocument.findFirst({
      where: { verificationRequestId: requestId, id: documentId },
      select: { id: true, storageKey: true, mimeType: true },
    })
  },
}
