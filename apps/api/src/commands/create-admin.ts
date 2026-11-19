import * as argon2 from 'argon2'
import { UserRole, UserStatus } from '../generated/prisma/client.js'
import '../config/load-env.js'
import { prisma } from '../db/client.js'

const name = process.env.ROOFTECH_ADMIN_NAME?.trim()
const email = process.env.ROOFTECH_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ROOFTECH_ADMIN_PASSWORD

try {
  if (!name || name.length < 2 || name.length > 120) {
    throw new Error('Defina ROOFTECH_ADMIN_NAME com um nome entre 2 e 120 caracteres.')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Defina ROOFTECH_ADMIN_EMAIL com um e-mail válido.')
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('Defina ROOFTECH_ADMIN_PASSWORD com 12 a 128 caracteres.')
  }
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ROOFTECH_ALLOW_ADMIN_BOOTSTRAP !== 'true'
  ) {
    throw new Error(
      'Em produção, defina ROOFTECH_ALLOW_ADMIN_BOOTSTRAP=true apenas durante a criação controlada.',
    )
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw new Error('Este e-mail já pertence a uma conta. O comando não altera contas existentes.')
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
  await prisma.user.create({
    data: { name, email, passwordHash, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
  })
  process.stdout.write(`Administrador criado: ${email}\n`)
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Não foi possível criar a conta.'}\n`,
  )
  process.exitCode = 1
} finally {
  process.env.ROOFTECH_ADMIN_PASSWORD = ''
  await prisma.$disconnect()
}
