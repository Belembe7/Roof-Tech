import { prisma } from '../db/client.js'

export const neighborhoodRepository = {
  findMany(citySlug?: string) {
    return prisma.neighborhood.findMany({
      where: citySlug ? { city: { slug: citySlug.toLowerCase() } } : undefined,
      include: { city: { select: { name: true, slug: true, province: true } } },
      orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
    })
  },
}
