import type { ApiPublicProperty, ApiPropertyType, ApiVerificationStatus } from '@roof-tech/shared'
import type { PropertyType } from '../data/demo-properties'
import { apiAssetUrl } from '../services/api-url'

export type PublicListing = {
  id: string
  slug: string
  reference: string
  title: string
  type: PropertyType
  neighborhood: string
  city: string
  monthlyRent: number
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: number | null
  water: boolean
  security: boolean
  availabilityStatus: ApiPublicProperty['availabilityStatus']
  available: boolean
  isDemo: boolean
  description: string
  features: string[]
  advertiser: {
    name: string
    kind: 'Proprietário' | 'Agente imobiliário'
    verificationStatus: ApiVerificationStatus
  }
  costs: { deposit?: number; otherInitial?: number; visitFee?: number }
  images: { src: string; alt: string }[]
}

const propertyTypeLabels: Record<ApiPropertyType, PropertyType> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Moradia',
  ROOM: 'Quarto',
  ANNEX: 'Dependência',
}

const propertyTypeValues: Record<string, ApiPropertyType> = {
  APARTMENT: 'APARTMENT',
  HOUSE: 'HOUSE',
  ROOM: 'ROOM',
  ANNEX: 'ANNEX',
  Apartamento: 'APARTMENT',
  Moradia: 'HOUSE',
  Quarto: 'ROOM',
  Dependência: 'ANNEX',
}

export function apiPropertyTypeFromQuery(value: string | null) {
  return value ? propertyTypeValues[value] : undefined
}

export function toPublicListing(property: ApiPublicProperty): PublicListing {
  const normalizedFeatures = property.features.map((feature) => feature.toLocaleLowerCase('pt-MZ'))
  return {
    id: property.id,
    slug: property.slug,
    reference: property.reference,
    title: property.title,
    type: propertyTypeLabels[property.propertyType],
    neighborhood: property.location.neighborhood,
    city: property.location.city,
    monthlyRent: Number(property.monthlyRent),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpaces: property.parkingSpaces,
    areaM2: property.areaM2 === null ? null : Number(property.areaM2),
    water: normalizedFeatures.some((feature) => feature.includes('água')),
    security: normalizedFeatures.some((feature) => feature.includes('segurança')),
    availabilityStatus: property.availabilityStatus,
    available: property.availabilityStatus === 'AVAILABLE',
    isDemo: property.isDemo,
    description: property.description,
    features: property.features,
    advertiser: {
      name: property.advertiser.name,
      kind: property.advertiser.type === 'OWNER' ? 'Proprietário' : 'Agente imobiliário',
      verificationStatus: property.advertiser.verificationStatus,
    },
    costs: {
      ...(property.depositAmount === null ? {} : { deposit: Number(property.depositAmount) }),
      ...(property.otherInitialCost === null
        ? {}
        : { otherInitial: Number(property.otherInitialCost) }),
      ...(property.visitFee === null ? {} : { visitFee: Number(property.visitFee) }),
    },
    images: property.images.map((image) => ({
      src: apiAssetUrl(image.imageUrl),
      alt: image.altText ?? `Fotografia de ${property.title}`,
    })),
  }
}

export function toApiSearchParams(params: URLSearchParams) {
  const query = new URLSearchParams({ city: 'maputo', limit: '12' })
  const text = params.get('q')?.trim().slice(0, 120)
  if (text) query.set('q', text)
  const propertyType = apiPropertyTypeFromQuery(params.get('type'))
  if (propertyType) query.set('type', propertyType)

  const maximum = Number(params.get('max'))
  if (params.has('max') && Number.isFinite(maximum) && maximum >= 0 && maximum <= 100_000_000) {
    query.set('max', String(maximum))
  }
  const rooms = Number(params.get('rooms'))
  if (params.has('rooms') && Number.isInteger(rooms) && rooms >= 0 && rooms <= 20) {
    query.set('rooms', String(rooms))
  }
  for (const key of ['water', 'parking', 'security', 'available']) {
    if (params.get(key) === '1') query.set(key, 'true')
  }
  const sort = params.get('sort')
  query.set('sort', sort === 'asc' || sort === 'desc' ? sort : 'newest')
  const page = Number(params.get('page') ?? 1)
  query.set('page', String(Number.isInteger(page) && page > 0 && page <= 1_000_000 ? page : 1))
  return query
}

export function imageSrcSet(src: string) {
  if (!/[?&]w=\d+/.test(src)) return undefined
  return [480, 800, 1200]
    .map((width) => `${src.replace(/w=\d+/, `w=${width}`)} ${width}w`)
    .join(', ')
}

export function formatInitialCosts(property: PublicListing) {
  const parts = [
    { label: 'Primeiro mês de renda', value: property.monthlyRent },
    { label: 'Caução declarada', value: property.costs.deposit },
    { label: 'Outros custos iniciais', value: property.costs.otherInitial },
  ]
  const declared = parts.filter((part) => part.value !== undefined)
  const missing = parts.some((part) => part.value === undefined)
  const total = declared.reduce((sum, part) => sum + (part.value ?? 0), 0)
  return { parts, total, missing }
}
