import type {
  ApiPublicProperty,
  ApiPropertySearchResponse,
  ApiPropertyType,
} from '@roof-tech/shared'
import { demoProperties, type DemoProperty } from '@roof-tech/shared/demo-properties'

const propertyTypes: Record<DemoProperty['type'], ApiPropertyType> = {
  Apartamento: 'APARTMENT',
  Moradia: 'HOUSE',
  Quarto: 'ROOM',
  Dependência: 'ANNEX',
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-MZ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const demoPublicProperties: ApiPublicProperty[] = demoProperties.map((property, index) => ({
  id: property.id,
  reference: property.reference,
  slug: property.slug,
  title: property.title,
  description: property.description,
  propertyType: propertyTypes[property.type],
  monthlyRent: String(property.monthlyRent),
  depositAmount: property.costs.deposit === undefined ? null : String(property.costs.deposit),
  visitFee: property.costs.visitFee === undefined ? null : String(property.costs.visitFee),
  otherInitialCost:
    property.costs.otherInitial === undefined ? null : String(property.costs.otherInitial),
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  parkingSpaces: property.parkingSpaces,
  areaM2: String(property.areaM2),
  availabilityStatus: property.available ? 'AVAILABLE' : 'UNAVAILABLE',
  isDemo: true,
  location: {
    neighborhood: property.neighborhood,
    neighborhoodSlug: slugify(property.neighborhood),
    city: 'Maputo',
    citySlug: 'maputo',
    province: 'Maputo Cidade',
  },
  features: property.features,
  images: property.images.map((image, displayOrder) => ({
    imageUrl: image.src,
    altText: image.alt,
    displayOrder,
  })),
  advertiser: {
    name: property.advertiser.name,
    type: property.advertiser.kind === 'Proprietário' ? 'OWNER' : 'AGENT',
    verificationStatus: 'NOT_SUBMITTED',
  },
  publishedAt: '2026-11-19T00:00:00.000Z',
  createdAt: new Date(Date.UTC(2026, 10, 19, 16, 26, 54 - index)).toISOString(),
}))

export function getDemoPublicProperty(slug: string) {
  return demoPublicProperties.find((property) => property.slug === slug)
}

export function searchDemoPublicProperties(query: URLSearchParams): ApiPropertySearchResponse {
  const text = query.get('q')?.trim().toLocaleLowerCase('pt-MZ')
  const propertyType = query.get('type')
  const city = query.get('city')?.trim().toLocaleLowerCase('pt-MZ')
  const neighborhood = query.get('neighborhood')?.trim().toLocaleLowerCase('pt-MZ')
  const maximum = query.has('max') ? Number(query.get('max')) : undefined
  const rooms = query.has('rooms') ? Number(query.get('rooms')) : undefined

  let items = demoPublicProperties.filter((property) => {
    if (city && property.location.citySlug !== city) return false
    if (propertyType && property.propertyType !== propertyType) return false
    if (
      neighborhood &&
      property.location.neighborhood.toLocaleLowerCase('pt-MZ') !== neighborhood &&
      property.location.neighborhoodSlug !== neighborhood
    )
      return false
    if (maximum !== undefined && Number(property.monthlyRent) > maximum) return false
    if (rooms !== undefined && property.bedrooms < rooms) return false
    if (
      query.has('available') &&
      (property.availabilityStatus === 'AVAILABLE') !== (query.get('available') === 'true')
    )
      return false
    if (
      query.has('parking') &&
      (property.parkingSpaces > 0) !== (query.get('parking') === 'true')
    )
      return false

    const features = property.features.map((feature) => feature.toLocaleLowerCase('pt-MZ'))
    if (
      query.has('water') &&
      features.some((feature) => feature.includes('água')) !== (query.get('water') === 'true')
    )
      return false
    if (
      query.has('security') &&
      features.some((feature) => feature.includes('segurança')) !==
        (query.get('security') === 'true')
    )
      return false
    if (
      text &&
      ![property.title, property.description, property.location.neighborhood].some((value) =>
        value.toLocaleLowerCase('pt-MZ').includes(text),
      )
    )
      return false
    return true
  })

  if (query.get('sort') === 'asc') {
    items = items.toSorted((a, b) => Number(a.monthlyRent) - Number(b.monthlyRent))
  } else if (query.get('sort') === 'desc') {
    items = items.toSorted((a, b) => Number(b.monthlyRent) - Number(a.monthlyRent))
  }

  const page = Math.max(1, Number(query.get('page') ?? 1) || 1)
  const pageSize = Math.max(1, Number(query.get('limit') ?? 12) || 12)
  const totalItems = items.length

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  }
}
