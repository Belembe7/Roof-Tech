import multer from 'multer'
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VERIFICATION_UPLOAD_BYTES,
} from '../services/file-validation.service.js'

const memoryStorage = multer.memoryStorage()

export const receivePropertyImage = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES, files: 1, fields: 1, fieldSize: 1024, parts: 2 },
}).single('file')

export const receiveVerificationDocuments = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_VERIFICATION_UPLOAD_BYTES,
    files: 3,
    fields: 1,
    fieldSize: 64,
    parts: 4,
  },
}).array('files', 3)
