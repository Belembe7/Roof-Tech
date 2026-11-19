import type { RequestHandler } from 'express'
import { clearSessionCookie, setSessionCookie } from '../auth/session-cookie.js'
import { authService } from '../services/auth.service.js'
import {
  loginSchema,
  profileUpdateSchema,
  registrationSchema,
} from '../validations/auth.validation.js'

export const register: RequestHandler = async (request, response) => {
  const input = registrationSchema.parse(request.body)
  try {
    const issued = await authService.register(input)
    if (request.auth) await authService.revokeSession(request.auth.sessionId)
    setSessionCookie(response, issued.token)
    response.status(201).json({
      user: issued.user,
      csrfToken: issued.csrfToken,
      expiresAt: issued.expiresAt.toISOString(),
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      response.status(409).json({
        error: {
          code: 'REGISTRATION_UNAVAILABLE',
          message: 'Não foi possível criar a conta com os dados enviados.',
        },
      })
      return
    }
    throw error
  }
}

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body)
  const issued = await authService.authenticate(input)
  if (!issued) {
    response.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou palavra-passe inválidos.' },
    })
    return
  }
  if (request.auth) await authService.revokeSession(request.auth.sessionId)
  setSessionCookie(response, issued.token)
  response.status(200).json({
    user: issued.user,
    csrfToken: issued.csrfToken,
    expiresAt: issued.expiresAt.toISOString(),
  })
}

export const getSession: RequestHandler = (request, response) => {
  const session = request.auth
  if (!session) {
    response.status(200).json({ user: null, csrfToken: null, expiresAt: null })
    return
  }
  response.status(200).json({
    user: session.user,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt.toISOString(),
  })
}

export const logout: RequestHandler = async (request, response) => {
  const session = request.auth
  if (!session) {
    clearSessionCookie(response)
    response.status(204).end()
    return
  }
  await authService.revokeSession(session.sessionId)
  clearSessionCookie(response)
  response.status(204).end()
}

export const getMe: RequestHandler = (request, response) => {
  if (!request.auth) {
    response.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicie sessão para continuar.' },
    })
    return
  }
  response.status(200).json({ user: request.auth.user })
}

export const updateMe: RequestHandler = async (request, response) => {
  if (!request.auth) {
    response.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicie sessão para continuar.' },
    })
    return
  }
  const input = profileUpdateSchema.parse(request.body)
  const user = await authService.updateProfile(request.auth.user.id, input)
  response.status(200).json({ user })
}

export const getMyAdvertiserProfile: RequestHandler = (request, response) => {
  if (!request.auth?.user.advertiserProfile) {
    response.status(404).json({
      error: {
        code: 'ADVERTISER_PROFILE_NOT_FOUND',
        message: 'Perfil de anunciante não encontrado.',
      },
    })
    return
  }
  response.status(200).json({ advertiserProfile: request.auth.user.advertiserProfile })
}
