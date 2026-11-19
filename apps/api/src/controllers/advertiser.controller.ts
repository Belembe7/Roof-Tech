import type { RequestHandler } from 'express'
import { z } from 'zod'
import { DomainError } from '../utils/domain-error.js'
import { advertiserService } from '../services/advertiser.service.js'
import {
  imageOrderSchema,
  imageUploadSchema,
  propertyAvailabilitySchema,
  propertyDraftSchema,
  propertyUpdateSchema,
  verificationTypeSchema,
} from '../validations/advertiser.validation.js'

function currentUserId(request: Parameters<RequestHandler>[0]) {
  if (!request.auth)
    throw new DomainError(401, 'AUTHENTICATION_REQUIRED', 'Inicie sessão para continuar.')
  return request.auth.user.id
}

function propertyIdFrom(request: Parameters<RequestHandler>[0]) {
  return z.uuid().parse(request.params.propertyId)
}

export const getDashboard: RequestHandler = async (request, response) => {
  response.status(200).json(await advertiserService.getDashboard(currentUserId(request)))
}

export const listProperties: RequestHandler = async (request, response) => {
  response.status(200).json(await advertiserService.listProperties(currentUserId(request)))
}

export const getProperty: RequestHandler = async (request, response) => {
  const property = await advertiserService.getProperty(
    currentUserId(request),
    propertyIdFrom(request),
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const listFeatures: RequestHandler = async (_request, response) => {
  response.status(200).json(await advertiserService.listFeatures())
}

export const createDraft: RequestHandler = async (request, response) => {
  const input = propertyDraftSchema.parse(request.body)
  const property = await advertiserService.createDraft(currentUserId(request), input)
  if (!property) {
    response.status(400).json({
      error: { code: 'NEIGHBORHOOD_NOT_FOUND', message: 'Seleccione um bairro disponível.' },
    })
    return
  }
  response.status(201).json({ property })
}

export const updateProperty: RequestHandler = async (request, response) => {
  const input = propertyUpdateSchema.parse(request.body)
  const property = await advertiserService.updateProperty(
    currentUserId(request),
    propertyIdFrom(request),
    input,
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio ou bairro não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const submitProperty: RequestHandler = async (request, response) => {
  const property = await advertiserService.submitForReview(
    currentUserId(request),
    propertyIdFrom(request),
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const updateAvailability: RequestHandler = async (request, response) => {
  const { availabilityStatus } = propertyAvailabilitySchema.parse(request.body)
  const property = await advertiserService.setAvailability(
    currentUserId(request),
    propertyIdFrom(request),
    availabilityStatus,
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const archiveProperty: RequestHandler = async (request, response) => {
  const property = await advertiserService.archive(currentUserId(request), propertyIdFrom(request))
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const uploadPropertyImage: RequestHandler = async (request, response) => {
  if (!request.file) {
    response
      .status(400)
      .json({ error: { code: 'IMAGE_REQUIRED', message: 'Seleccione uma fotografia.' } })
    return
  }
  const { altText } = imageUploadSchema.parse(request.body)
  const property = await advertiserService.uploadPropertyImage(
    currentUserId(request),
    propertyIdFrom(request),
    request.file.buffer,
    altText,
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(201).json({ property })
}

export const deletePropertyImage: RequestHandler = async (request, response) => {
  const property = await advertiserService.deletePropertyImage(
    currentUserId(request),
    propertyIdFrom(request),
    z.uuid().parse(request.params.imageId),
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'IMAGE_NOT_FOUND', message: 'Fotografia não encontrada.' } })
    return
  }
  response.status(200).json({ property })
}

export const reorderPropertyImages: RequestHandler = async (request, response) => {
  const { imageIds } = imageOrderSchema.parse(request.body)
  const property = await advertiserService.reorderPropertyImages(
    currentUserId(request),
    propertyIdFrom(request),
    imageIds,
  )
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Anúncio não encontrado.' } })
    return
  }
  response.status(200).json({ property })
}

export const listVerificationRequests: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(await advertiserService.listVerificationRequests(currentUserId(request)))
}

export const createVerificationRequest: RequestHandler = async (request, response) => {
  const { verificationType } = verificationTypeSchema.parse(request.body)
  const files = Array.isArray(request.files) ? request.files : []
  const created = await advertiserService.createVerificationRequest(
    currentUserId(request),
    verificationType,
    files.map((file) => file.buffer),
  )
  response.status(201).json({ request: created })
}

export const downloadVerificationDocument: RequestHandler = async (request, response) => {
  const document = await advertiserService.getVerificationDocument(
    currentUserId(request),
    z.uuid().parse(request.params.requestId),
    z.uuid().parse(request.params.documentId),
  )
  if (!document) {
    response
      .status(404)
      .json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' } })
    return
  }
  response.setHeader('Content-Type', document.mimeType)
  response.setHeader('Content-Length', document.body.byteLength)
  response.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`)
  response.setHeader('Cache-Control', 'private, no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Security-Policy', 'sandbox')
  response.status(200).end(document.body)
}
