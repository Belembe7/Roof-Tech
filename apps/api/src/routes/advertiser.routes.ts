import { Router } from 'express'
import {
  archiveProperty,
  createDraft,
  createVerificationRequest,
  deletePropertyImage,
  downloadVerificationDocument,
  getDashboard,
  getProperty,
  listFeatures,
  listProperties,
  listVerificationRequests,
  reorderPropertyImages,
  submitProperty,
  updateAvailability,
  updateProperty,
  uploadPropertyImage,
} from '../controllers/advertiser.controller.js'
import {
  loadOptionalSession,
  requireAuth,
  requireCsrf,
  requireRole,
} from '../middleware/auth.middleware.js'
import {
  receivePropertyImage,
  receiveVerificationDocuments,
} from '../middleware/file-upload.middleware.js'
import { fileUploadRateLimit } from '../middleware/auth-rate-limit.middleware.js'

export const advertiserRouter = Router()

advertiserRouter.use(loadOptionalSession, requireAuth, requireRole('ADVERTISER'))
advertiserRouter.get('/dashboard', getDashboard)
advertiserRouter.get('/properties', listProperties)
advertiserRouter.post('/properties', requireCsrf, createDraft)
advertiserRouter.get('/properties/:propertyId', getProperty)
advertiserRouter.patch('/properties/:propertyId', requireCsrf, updateProperty)
advertiserRouter.post('/properties/:propertyId/submit', requireCsrf, submitProperty)
advertiserRouter.patch('/properties/:propertyId/availability', requireCsrf, updateAvailability)
advertiserRouter.post('/properties/:propertyId/archive', requireCsrf, archiveProperty)
advertiserRouter.post(
  '/properties/:propertyId/images',
  requireCsrf,
  fileUploadRateLimit,
  receivePropertyImage,
  uploadPropertyImage,
)
advertiserRouter.patch('/properties/:propertyId/images/order', requireCsrf, reorderPropertyImages)
advertiserRouter.delete('/properties/:propertyId/images/:imageId', requireCsrf, deletePropertyImage)
advertiserRouter.get('/features', listFeatures)
advertiserRouter.get('/verification-requests', listVerificationRequests)
advertiserRouter.post(
  '/verification-requests',
  requireCsrf,
  fileUploadRateLimit,
  receiveVerificationDocuments,
  createVerificationRequest,
)
advertiserRouter.get(
  '/verification-requests/:requestId/documents/:documentId',
  downloadVerificationDocument,
)
