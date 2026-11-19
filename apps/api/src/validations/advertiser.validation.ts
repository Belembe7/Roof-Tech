import { z } from 'zod'

const moneyString = z
  .string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Use um valor monetário com até duas casas decimais.')
const optionalMoneyString = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([moneyString, z.null()]).optional(),
)

export const propertyDraftSchema = z
  .object({
    title: z.string().trim().min(6).max(160),
    description: z.string().trim().min(30).max(5000),
    propertyType: z.enum(['HOUSE', 'APARTMENT', 'ROOM', 'ANNEX']),
    neighborhoodId: z.uuid(),
    monthlyRent: moneyString.refine((value) => !/^0(?:\.0{1,2})?$/.test(value)),
    depositAmount: optionalMoneyString,
    visitFee: optionalMoneyString,
    otherInitialCost: optionalMoneyString,
    bedrooms: z.coerce.number().int().min(0).max(20),
    bathrooms: z.coerce.number().int().min(1).max(20),
    parkingSpaces: z.coerce.number().int().min(0).max(20),
    areaM2: z.preprocess(
      (value) => (value === '' ? null : value),
      z.union([z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/), z.null()]).optional(),
    ),
    featureSlugs: z
      .array(z.string().regex(/^[a-z0-9-]{1,100}$/))
      .max(20)
      .default([])
      .refine((slugs) => new Set(slugs).size === slugs.length, 'Remova características repetidas.'),
  })
  .strict()

export const propertyUpdateSchema = propertyDraftSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Indique os dados que pretende alterar.')

export const propertyAvailabilitySchema = z
  .object({ availabilityStatus: z.enum(['AVAILABLE', 'UNAVAILABLE']) })
  .strict()

export const imageUploadSchema = z
  .object({ altText: z.string().trim().max(180).optional() })
  .strict()

export const imageOrderSchema = z
  .object({ imageIds: z.array(z.uuid()).min(1).max(10) })
  .strict()
  .refine((value) => new Set(value.imageIds).size === value.imageIds.length)

export const verificationTypeSchema = z
  .object({ verificationType: z.enum(['IDENTITY', 'LISTING_AUTHORIZATION']) })
  .strict()

export type PropertyDraftInput = z.infer<typeof propertyDraftSchema>
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>
export type PropertyAvailabilityInput = z.infer<typeof propertyAvailabilitySchema>
