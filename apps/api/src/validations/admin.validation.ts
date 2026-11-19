import { z } from 'zod'

export const propertyReviewSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'REJECT' && (!value.reason || value.reason.length < 10)) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Indique o motivo da rejeição em pelo menos 10 caracteres.',
      })
    }
  })

export const verificationReviewSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'REJECT' && (!value.reason || value.reason.length < 10)) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Indique o motivo da rejeição em pelo menos 10 caracteres.',
      })
    }
  })

export const reportSubmissionSchema = z
  .object({
    reason: z.enum([
      'INCORRECT_INFORMATION',
      'POSSIBLE_FRAUD',
      'UNAVAILABLE_PROPERTY',
      'UNAUTHORIZED_LISTING',
      'OTHER',
    ]),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()

export const reportReviewSchema = z
  .object({
    status: z.enum(['UNDER_REVIEW', 'NEEDS_INFORMATION', 'RESOLVED', 'DISMISSED']),
  })
  .strict()

export const adminUserQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
    role: z.enum(['CLIENT', 'ADVERTISER', 'ADMIN']).optional(),
  })
  .strict()

export const adminUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).strict()

export const adminPropertyIdSchema = z.uuid()
export const adminReportIdSchema = z.uuid()
export const adminRequestIdSchema = z.uuid()

export type PropertyReviewInput = z.infer<typeof propertyReviewSchema>
export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>
