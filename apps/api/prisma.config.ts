import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { defineConfig, env } from 'prisma/config'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

const previewBuildDatabaseUrl = 'postgresql://build:build@127.0.0.1:5432/roof_tech_build'
const databaseUrl =
  process.env.VERCEL_ENV === 'preview' && !process.env.DATABASE_URL
    ? previewBuildDatabaseUrl
    : env('DATABASE_URL')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
