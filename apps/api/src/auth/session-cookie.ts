import type { Response } from 'express'
import { env } from '../config/env.js'
import { SESSION_TTL_MS } from '../services/auth.service.js'

const secure = env.NODE_ENV === 'production'

export const sessionCookieName = secure ? '__Host-rooftech_session' : 'rooftech_session'

export function setSessionCookie(response: Response, token: string) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  })
}
