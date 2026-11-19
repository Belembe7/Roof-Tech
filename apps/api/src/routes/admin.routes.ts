import { Router } from 'express'
import {
  downloadVerificationDocument,
  getOverview,
  listAuditLogs,
  listProperties,
  listReports,
  listUsers,
  listVerificationRequests,
  reviewProperty,
  reviewVerification,
  updateReport,
  updateUserStatus,
} from '../controllers/admin.controller.js'
import {
  loadOptionalSession,
  requireAuth,
  requireCsrf,
  requireRole,
} from '../middleware/auth.middleware.js'

export const adminRouter = Router()

adminRouter.use(loadOptionalSession, requireAuth, requireRole('ADMIN'))
adminRouter.get('/overview', getOverview)
adminRouter.get('/properties', listProperties)
adminRouter.post('/properties/:propertyId/review', requireCsrf, reviewProperty)
adminRouter.get('/verification-requests', listVerificationRequests)
adminRouter.post('/verification-requests/:requestId/review', requireCsrf, reviewVerification)
adminRouter.get(
  '/verification-requests/:requestId/documents/:documentId',
  downloadVerificationDocument,
)
adminRouter.get('/reports', listReports)
adminRouter.patch('/reports/:reportId', requireCsrf, updateReport)
adminRouter.get('/users', listUsers)
adminRouter.patch('/users/:userId/status', requireCsrf, updateUserStatus)
adminRouter.get('/audit-logs', listAuditLogs)
