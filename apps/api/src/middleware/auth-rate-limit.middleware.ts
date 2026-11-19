import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'

const authLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: 'Demasiadas tentativas. Aguarde alguns minutos e tente novamente.',
      },
    })
  },
}

export const loginRateLimit = rateLimit(authLimitOptions)
export const registrationRateLimit = rateLimit(authLimitOptions)

export const fileUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMITED',
        message: 'Foram enviados demasiados ficheiros. Aguarde alguns minutos e tente novamente.',
      },
    })
  },
})

export const reportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request: Request, response: Response) => {
    response.status(429).json({
      error: {
        code: 'REPORT_RATE_LIMITED',
        message: 'Foram enviadas demasiadas denúncias. Aguarde alguns minutos e tente novamente.',
      },
    })
  },
})
