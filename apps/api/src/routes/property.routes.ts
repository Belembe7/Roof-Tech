import { Router } from 'express'
import { getPropertyBySlug, searchProperties } from '../controllers/property.controller.js'
import { submitReport } from '../controllers/admin.controller.js'
import { loadOptionalSession } from '../middleware/auth.middleware.js'
import { reportRateLimit } from '../middleware/auth-rate-limit.middleware.js'

export const propertyRouter = Router()

propertyRouter.get('/', searchProperties)
propertyRouter.post('/:slug/reports', loadOptionalSession, reportRateLimit, submitReport)
propertyRouter.get('/:slug', getPropertyBySlug)
