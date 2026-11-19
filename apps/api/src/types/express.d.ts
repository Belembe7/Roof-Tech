import type { ApiAuthUser } from '@roof-tech/shared'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string
        csrfToken: string
        expiresAt: Date
        user: ApiAuthUser
      }
    }
  }
}

export {}
