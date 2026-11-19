import { neighborhoodRepository } from '../repositories/neighborhood.repository.js'

export const neighborhoodService = {
  async list(citySlug?: string) {
    const neighborhoods = await neighborhoodRepository.findMany(citySlug)
    return neighborhoods.map(({ id, name, slug, city }) => ({ id, name, slug, city }))
  },
}
