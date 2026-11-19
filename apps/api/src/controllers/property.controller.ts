import type { RequestHandler } from 'express'
import { z } from 'zod'
import { propertySearchQuerySchema } from '../validations/property-query.validation.js'
import { propertyService } from '../services/property.service.js'

export const searchProperties: RequestHandler = async (request, response) => {
  const query = propertySearchQuerySchema.parse(request.query)
  response.status(200).json(await propertyService.search(query))
}

export const getPropertyBySlug: RequestHandler = async (request, response) => {
  const slug = z.string().min(1).max(180).parse(request.params.slug)
  const property = await propertyService.getBySlug(slug)
  if (!property) {
    response
      .status(404)
      .json({ error: { code: 'PROPERTY_NOT_FOUND', message: 'Imóvel não encontrado.' } })
    return
  }
  response.status(200).json(property)
}
