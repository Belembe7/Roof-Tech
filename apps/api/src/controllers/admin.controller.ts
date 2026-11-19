import type { RequestHandler } from 'express'
import { z } from 'zod'
import { ReportStatus, UserRole, UserStatus } from '../generated/prisma/client.js'
import { DomainError } from '../utils/domain-error.js'
import {
  adminPropertyIdSchema,
  adminReportIdSchema,
  adminRequestIdSchema,
  adminUserQuerySchema,
  adminUserStatusSchema,
  propertyReviewSchema,
  reportReviewSchema,
  reportSubmissionSchema,
  verificationReviewSchema,
} from '../validations/admin.validation.js'
import {
  adminService,
  reportReasonFromInput,
  reportStatusFromInput,
} from '../services/admin.service.js'

const reportListQuerySchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'RESOLVED', 'DISMISSED']).optional(),
})

function currentAdminId(request: Parameters<RequestHandler>[0]) {
  if (!request.auth)
    throw new DomainError(401, 'AUTHENTICATION_REQUIRED', 'Inicie sessão para continuar.')
  return request.auth.user.id
}

function notFound(response: Parameters<RequestHandler>[1], message: string) {
  response.status(404).json({ error: { code: 'ADMIN_ITEM_NOT_FOUND', message } })
}

export const getOverview: RequestHandler = async (_request, response) => {
  response.status(200).json(await adminService.overview())
}

export const listProperties: RequestHandler = async (_request, response) => {
  response.status(200).json(await adminService.listProperties())
}

export const reviewProperty: RequestHandler = async (request, response) => {
  const propertyId = adminPropertyIdSchema.parse(request.params.propertyId)
  const input = propertyReviewSchema.parse(request.body)
  const property = await adminService.reviewProperty(propertyId, currentAdminId(request), input)
  if (!property) {
    response.status(409).json({
      error: {
        code: 'PROPERTY_NOT_PENDING',
        message: 'Este anúncio já não está pendente de revisão.',
      },
    })
    return
  }
  response.status(200).json({ property })
}

export const listVerificationRequests: RequestHandler = async (_request, response) => {
  response.status(200).json(await adminService.listVerificationRequests())
}

export const reviewVerification: RequestHandler = async (request, response) => {
  const requestId = adminRequestIdSchema.parse(request.params.requestId)
  const input = verificationReviewSchema.parse(request.body)
  const result = await adminService.reviewVerification(requestId, currentAdminId(request), input)
  if (!result) {
    response.status(409).json({
      error: {
        code: 'VERIFICATION_NOT_PENDING',
        message: 'Este pedido já não está pendente de revisão.',
      },
    })
    return
  }
  response.status(200).json({ request: result })
}

export const downloadVerificationDocument: RequestHandler = async (request, response) => {
  const requestId = adminRequestIdSchema.parse(request.params.requestId)
  const documentId = z.uuid().parse(request.params.documentId)
  const document = await adminService.getVerificationDocument(requestId, documentId)
  if (!document) {
    notFound(response, 'Documento não encontrado.')
    return
  }
  response.setHeader('Content-Type', document.mimeType)
  response.setHeader('Content-Length', document.body.byteLength)
  response.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`)
  response.setHeader('Cache-Control', 'private, no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Security-Policy', 'sandbox')
  response.status(200).end(document.body)
}

export const listReports: RequestHandler = async (request, response) => {
  const { status } = reportListQuerySchema.parse(request.query)
  response.status(200).json(await adminService.listReports(status as ReportStatus | undefined))
}

export const updateReport: RequestHandler = async (request, response) => {
  const reportId = adminReportIdSchema.parse(request.params.reportId)
  const { status } = reportReviewSchema.parse(request.body)
  const report = await adminService.updateReport(
    reportId,
    currentAdminId(request),
    reportStatusFromInput(status),
  )
  if (!report) {
    notFound(response, 'Denúncia não encontrada.')
    return
  }
  response.status(200).json({ report })
}

export const submitReport: RequestHandler = async (request, response) => {
  const propertySlug = z.string().trim().min(1).max(180).parse(request.params.slug)
  const input = reportSubmissionSchema.parse(request.body)
  const report = await adminService.submitReport(propertySlug, request.auth?.user.id ?? null, {
    reason: reportReasonFromInput(input.reason),
    description: input.description,
  })
  if (!report) {
    response.status(404).json({
      error: { code: 'PROPERTY_NOT_REPORTABLE', message: 'Este anúncio não está disponível.' },
    })
    return
  }
  response.status(201).json({ report })
}

export const listUsers: RequestHandler = async (request, response) => {
  const query = adminUserQuerySchema.parse(request.query)
  response.status(200).json(
    await adminService.listUsers({
      ...query,
      role: query.role as UserRole | undefined,
      status: query.status as UserStatus | undefined,
    }),
  )
}

export const updateUserStatus: RequestHandler = async (request, response) => {
  const userId = z.uuid().parse(request.params.userId)
  const { status } = adminUserStatusSchema.parse(request.body)
  const user = await adminService.setUserStatus(
    userId,
    currentAdminId(request),
    status === 'ACTIVE' ? UserStatus.ACTIVE : UserStatus.SUSPENDED,
  )
  if (!user) {
    notFound(response, 'Utilizador não encontrado.')
    return
  }
  response.status(200).json({ user })
}

export const listAuditLogs: RequestHandler = async (_request, response) => {
  response.status(200).json(await adminService.listAuditLogs())
}
