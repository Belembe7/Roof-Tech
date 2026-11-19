import type { RequestHandler } from 'express'
import { neighborhoodQuerySchema } from '../validations/property-query.validation.js'
import { neighborhoodService } from '../services/neighborhood.service.js'

export const listNeighborhoods: RequestHandler = async (request, response) => {
  const query = neighborhoodQuerySchema.parse(request.query)
  response.status(200).json({ items: await neighborhoodService.list(query.city) })
}
