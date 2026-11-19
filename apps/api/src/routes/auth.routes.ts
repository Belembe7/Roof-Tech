import { Router } from 'express'
import {
  getMe,
  getMyAdvertiserProfile,
  getSession,
  login,
  logout,
  register,
  updateMe,
} from '../controllers/auth.controller.js'
import { loginRateLimit, registrationRateLimit } from '../middleware/auth-rate-limit.middleware.js'
import {
  loadOptionalSession,
  requireAuth,
  requireCsrf,
  requireRole,
} from '../middleware/auth.middleware.js'

export const authRouter = Router()

authRouter.get('/session', loadOptionalSession, getSession)
authRouter.post('/register', loadOptionalSession, registrationRateLimit, register)
authRouter.post('/login', loadOptionalSession, loginRateLimit, login)
authRouter.post('/logout', loadOptionalSession, requireAuth, requireCsrf, logout)
authRouter.get('/me', loadOptionalSession, requireAuth, getMe)
authRouter.patch('/me', loadOptionalSession, requireAuth, requireCsrf, updateMe)
authRouter.get(
  '/me/advertiser-profile',
  loadOptionalSession,
  requireAuth,
  requireRole('ADVERTISER'),
  getMyAdvertiserProfile,
)
