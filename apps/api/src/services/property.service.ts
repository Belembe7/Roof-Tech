import type { ApiPublicProperty } from '@roof-tech/shared'
import { propertyRepository } from '../repositories/property.repository.js'
import type { PropertySearchQuery } from '../validations/property-query.validation.js'

function toPublicProperty(
  property: Awaited<ReturnType<typeof propertyRepository.findPublishedBySlug>> & {},
) {
  return {
    id: property.id,
    reference: property.reference,
    slug: property.slug,
    title: property.title,
    description: property.description,
    propertyType: property.propertyType,
    monthlyRent: property.monthlyRent.toFixed(2),
    depositAmount: property.depositAmount?.toFixed(2) ?? null,
    visitFee: property.visitFee?.toFixed(2) ?? null,
    otherInitialCost: property.otherInitialCost?.toFixed(2) ?? null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpaces: property.parkingSpaces,
    areaM2: property.areaM2?.toFixed(2) ?? null,
    availabilityStatus: property.availabilityStatus,
    isDemo: property.isDemo,
    location: {
      neighborhood: property.neighborhood.name,
      neighborhoodSlug: property.neighborhood.slug,
      city: property.neighborhood.city.name,
      citySlug: property.neighborhood.city.slug,
      province: property.neighborhood.city.province,
    },
    features: property.features.map(({ feature }) => feature.name),
    images: property.images.map(({ imageUrl, altText, displayOrder }) => ({
      imageUrl,
      altText,
      displayOrder,
    })),
    advertiser: {
      name: property.advertiser.user.name,
      type: property.advertiser.advertiserType,
      verificationStatus: property.advertiser.verificationStatus,
    },
    publishedAt: property.publishedAt?.toISOString() ?? null,
    createdAt: property.createdAt.toISOString(),
  } satisfies ApiPublicProperty
}

export const propertyService = {
  async search(query: PropertySearchQuery) {
    const { items, totalItems } = await propertyRepository.search(query)
    return {
      items: items.map(toPublicProperty),
      pagination: {
        page: query.page,
        pageSize: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    }
  },

  async getBySlug(slug: string) {
    const property = await propertyRepository.findPublishedBySlug(slug)
    return property ? toPublicProperty(property) : null
  },
}
