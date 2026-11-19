import {
  AvailabilityStatus,
  ModerationStatus,
  Prisma,
  PropertyType,
  UserStatus,
} from '../generated/prisma/client.js'
import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import type { PropertySearchQuery } from '../validations/property-query.validation.js'

function buildWhere(query: PropertySearchQuery): Prisma.PropertyWhereInput {
  const filters: Prisma.PropertyWhereInput[] = [{ moderationStatus: ModerationStatus.APPROVED }]

  if (env.NODE_ENV === 'production') {
    filters.push({ isDemo: false })
    filters.push({ advertiser: { user: { status: UserStatus.ACTIVE } } })
  }
  if (query.type) filters.push({ propertyType: query.type as PropertyType })
  if (query.max !== undefined) filters.push({ monthlyRent: { lte: query.max } })
  if (query.rooms !== undefined) filters.push({ bedrooms: { gte: query.rooms } })
  if (query.available !== undefined) {
    filters.push({
      availabilityStatus: query.available
        ? AvailabilityStatus.AVAILABLE
        : AvailabilityStatus.UNAVAILABLE,
    })
  }
  if (query.parking !== undefined) {
    filters.push({ parkingSpaces: query.parking ? { gt: 0 } : { equals: 0 } })
  }
  if (query.q) {
    filters.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { neighborhood: { name: { contains: query.q, mode: 'insensitive' } } },
      ],
    })
  }
  if (query.city) {
    filters.push({ neighborhood: { city: { slug: { equals: query.city.toLowerCase() } } } })
  }
  if (query.neighborhood) {
    filters.push({
      neighborhood: {
        OR: [
          { slug: { equals: query.neighborhood.toLowerCase() } },
          { name: { equals: query.neighborhood, mode: 'insensitive' } },
        ],
      },
    })
  }
  if (query.water !== undefined) {
    filters.push({
      features: query.water
        ? { some: { feature: { slug: 'water' } } }
        : { none: { feature: { slug: 'water' } } },
    })
  }
  if (query.security !== undefined) {
    filters.push({
      features: query.security
        ? { some: { feature: { slug: 'security' } } }
        : { none: { feature: { slug: 'security' } } },
    })
  }

  return { AND: filters }
}

const publicPropertyInclude = {
  neighborhood: { include: { city: true } },
  features: { include: { feature: true } },
  images: { orderBy: { displayOrder: 'asc' as const } },
  advertiser: {
    select: {
      advertiserType: true,
      verificationStatus: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.PropertyInclude

export const propertyRepository = {
  async search(query: PropertySearchQuery) {
    const where = buildWhere(query)
    const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
      query.sort === 'asc'
        ? [{ monthlyRent: 'asc' }, { createdAt: 'desc' }]
        : query.sort === 'desc'
          ? [{ monthlyRent: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'asc' }]
    const [totalItems, items] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        include: publicPropertyInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ])
    return { items, totalItems }
  },

  findPublishedBySlug(slug: string) {
    return prisma.property.findFirst({
      where: {
        slug,
        moderationStatus: ModerationStatus.APPROVED,
        ...(env.NODE_ENV === 'production'
          ? { isDemo: false, advertiser: { user: { status: UserStatus.ACTIVE } } }
          : {}),
      },
      include: publicPropertyInclude,
    })
  },
}
