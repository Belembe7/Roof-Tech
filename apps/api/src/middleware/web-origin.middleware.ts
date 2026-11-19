import type { RequestHandler } from 'express'
import { env } from '../config/env.js'

const localDevelopmentOrigins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173'])

function normalizeOrigin(value: string | undefined) {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

function isTrustedOrigin(value: string | undefined) {
  const origin = normalizeOrigin(value)
  if (!origin) return false
  if (origin === normalizeOrigin(env.WEB_ORIGIN)) return true
  return env.NODE_ENV !== 'production' && localDevelopmentOrigins.has(origin)
}

function refererOrigin(value: string | undefined) {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const webOriginMiddleware: RequestHandler = (request, response, next) => {
  const origin = request.get('Origin')

  if (origin) {
    if (!isTrustedOrigin(origin)) {
      response.status(403).json({
        error: { code: 'UNTRUSTED_ORIGIN', message: 'A origem deste pedido não é permitida.' },
      })
      return
    }
    response.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin)!)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')
    response.setHeader('Access-Control-Max-Age', '600')
    response.vary('Origin')
  }

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (unsafeMethods.has(request.method)) {
    const sourceOrigin = origin ?? refererOrigin(request.get('Referer'))
    if (!isTrustedOrigin(sourceOrigin)) {
      response.status(403).json({
        error: { code: 'ORIGIN_REQUIRED', message: 'É necessária uma origem de aplicação válida.' },
      })
      return
    }
  }

  next()
}
