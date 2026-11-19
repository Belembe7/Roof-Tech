import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { demoProperties } from '@roof-tech/shared/demo-properties'
import dotenv from 'dotenv'
import {
  AdvertiserType,
  AvailabilityStatus,
  ModerationStatus,
  PrismaClient,
  PropertyType,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '../src/generated/prisma/client.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })

if (process.env.NODE_ENV === 'production') {
  throw new Error('A seed de demonstração não pode ser executada em produção.')
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL é obrigatório para executar a seed.')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
const propertyTypeMap: Record<string, PropertyType> = {
  Apartamento: PropertyType.APARTMENT,
  Moradia: PropertyType.HOUSE,
  Quarto: PropertyType.ROOM,
  Dependência: PropertyType.ANNEX,
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function featureSlug(name: string) {
  if (name.toLocaleLowerCase('pt-MZ').includes('água')) return 'water'
  if (name.toLocaleLowerCase('pt-MZ').includes('segurança')) return 'security'
  return slugify(name)
}

async function main() {
  const city = await prisma.city.upsert({
    where: { slug: 'maputo' },
    create: { name: 'Maputo', slug: 'maputo', province: 'Maputo Cidade' },
    update: { name: 'Maputo', province: 'Maputo Cidade' },
  })

  const neighborhoods = new Map<string, string>()
  for (const property of demoProperties) {
    const slug = slugify(property.neighborhood)
    const neighborhood = await prisma.neighborhood.upsert({
      where: { cityId_slug: { cityId: city.id, slug } },
      create: { cityId: city.id, name: property.neighborhood, slug },
      update: { name: property.neighborhood },
    })
    neighborhoods.set(property.neighborhood, neighborhood.id)
  }

  for (const [index, property] of demoProperties.entries()) {
    const email = `demo-advertiser-${index + 1}@rooftech.example`
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name: property.advertiser.name,
        email,
        role: UserRole.ADVERTISER,
        status: UserStatus.PENDING,
      },
      update: {
        name: property.advertiser.name,
        role: UserRole.ADVERTISER,
        status: UserStatus.PENDING,
        passwordHash: null,
      },
    })
    const profile = await prisma.advertiserProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        advertiserType:
          property.advertiser.kind === 'Proprietário' ? AdvertiserType.OWNER : AdvertiserType.AGENT,
        verificationStatus: VerificationStatus.NOT_SUBMITTED,
      },
      update: {
        advertiserType:
          property.advertiser.kind === 'Proprietário' ? AdvertiserType.OWNER : AdvertiserType.AGENT,
        verificationStatus: VerificationStatus.NOT_SUBMITTED,
      },
    })
    const neighborhoodId = neighborhoods.get(property.neighborhood)
    if (!neighborhoodId) throw new Error(`Bairro demonstrativo em falta: ${property.neighborhood}`)

    const record = await prisma.property.upsert({
      where: { slug: property.slug },
      create: {
        reference: property.reference,
        slug: property.slug,
        advertiserId: profile.id,
        neighborhoodId,
        title: property.title,
        description: property.description,
        propertyType: propertyTypeMap[property.type]!,
        monthlyRent: String(property.monthlyRent),
        depositAmount: property.costs.deposit === undefined ? null : String(property.costs.deposit),
        visitFee: property.costs.visitFee === undefined ? null : String(property.costs.visitFee),
        otherInitialCost:
          property.costs.otherInitial === undefined ? null : String(property.costs.otherInitial),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parkingSpaces: property.parkingSpaces,
        areaM2: String(property.areaM2),
        moderationStatus: ModerationStatus.APPROVED,
        availabilityStatus: property.available
          ? AvailabilityStatus.AVAILABLE
          : AvailabilityStatus.UNAVAILABLE,
        isDemo: true,
        publishedAt: new Date('2026-11-19T00:00:00.000Z'),
      },
      update: {
        advertiserId: profile.id,
        neighborhoodId,
        title: property.title,
        description: property.description,
        propertyType: propertyTypeMap[property.type]!,
        monthlyRent: String(property.monthlyRent),
        depositAmount: property.costs.deposit === undefined ? null : String(property.costs.deposit),
        visitFee: property.costs.visitFee === undefined ? null : String(property.costs.visitFee),
        otherInitialCost:
          property.costs.otherInitial === undefined ? null : String(property.costs.otherInitial),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parkingSpaces: property.parkingSpaces,
        areaM2: String(property.areaM2),
        moderationStatus: ModerationStatus.APPROVED,
        availabilityStatus: property.available
          ? AvailabilityStatus.AVAILABLE
          : AvailabilityStatus.UNAVAILABLE,
        isDemo: true,
        publishedAt: new Date('2026-11-19T00:00:00.000Z'),
      },
    })

    await prisma.propertyImage.deleteMany({ where: { propertyId: record.id } })
    if (property.images.length > 0) {
      await prisma.propertyImage.createMany({
        data: property.images.map((image, displayOrder) => ({
          propertyId: record.id,
          imageUrl: image.src,
          altText: image.alt,
          displayOrder,
        })),
      })
    }

    await prisma.propertyFeatureValue.deleteMany({ where: { propertyId: record.id } })
    for (const name of property.features) {
      const slug = featureSlug(name)
      const feature = await prisma.propertyFeature.upsert({
        where: { slug },
        create: {
          name: slug === 'water' ? 'Água canalizada' : slug === 'security' ? 'Segurança' : name,
          slug,
        },
        update: {},
      })
      await prisma.propertyFeatureValue.create({
        data: { propertyId: record.id, featureId: feature.id },
      })
    }
  }

  console.log(
    `Seed demonstrativa concluída: ${demoProperties.length} imóveis assinalados como demonstração.`,
  )
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
