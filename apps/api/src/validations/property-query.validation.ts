import { z } from 'zod'

const flagQuery = z.preprocess((value) => {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return value
}, z.boolean().optional())

export const propertySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  neighborhood: z.string().trim().min(1).max(100).optional(),
  type: z.enum(['HOUSE', 'APARTMENT', 'ROOM', 'ANNEX']).optional(),
  max: z.coerce.number().finite().min(0).max(100_000_000).optional(),
  rooms: z.coerce.number().int().min(0).max(20).optional(),
  water: flagQuery,
  parking: flagQuery,
  security: flagQuery,
  available: flagQuery,
  sort: z.enum(['newest', 'asc', 'desc']).default('newest'),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const neighborhoodQuerySchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
})

export type PropertySearchQuery = z.infer<typeof propertySearchQuerySchema>
