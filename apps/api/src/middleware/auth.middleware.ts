import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { clearSessionCookie, sessionCookieName } from '../auth/session-cookie.js'
import { authService } from '../services/auth.service.js'
import type { ApiAuthRole } from '@roof-tech/shared'

function getSessionCookie(request: Parameters<RequestHandler>[0]) {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return { present: false, token: null }
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
  if (!entry) return { present: false, token: null }
  const token = entry.slice(sessionCookieName.length + 1)
  return { present: true, token: /^[0-9a-f]{64}$/i.test(token) ? token : null }
}

export const loadOptionalSession: RequestHandler = async (request, response, next) => {
  const cookie = getSessionCookie(request)
  if (!cookie.token) {
    if (cookie.present) clearSessionCookie(response)
    next()
    return
  }

  const session = await authService.findSession(cookie.token)
  if (!session) {
    clearSessionCookie(response)
    next()
    return
  }

  request.auth = {
    sessionId: session.id,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
    user: session.user,
  }
  next()
}

export const requireAuth: RequestHandler = (request, response, next) => {
  if (!request.auth) {
    response.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicie sessão para continuar.' },
    })
    return
  }
  next()
}

export const requireCsrf: RequestHandler = (request, response, next) => {
  const supplied = request.get('X-CSRF-Token')
  const expected = request.auth?.csrfToken
  if (!supplied || !expected || supplied.length !== expected.length) {
    response.status(403).json({
      error: { code: 'CSRF_VALIDATION_FAILED', message: 'Não foi possível validar este pedido.' },
    })
    return
  }

  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    response.status(403).json({
      error: { code: 'CSRF_VALIDATION_FAILED', message: 'Não foi possível validar este pedido.' },
    })
    return
  }
  next()
}

export function requireRole(...roles: ApiAuthRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth) {
      response.status(401).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicie sessão para continuar.' },
      })
      return
    }
    if (!roles.includes(request.auth.user.role)) {
      response.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Não tem permissão para aceder a este recurso.' },
      })
      return
    }
    next()
  }
}
