import { createHash, randomBytes } from 'node:crypto'
import * as argon2 from 'argon2'
import type { ApiAuthUser } from '@roof-tech/shared'
import {
  AdvertiserType,
  Prisma,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '../generated/prisma/client.js'
import { prisma } from '../db/client.js'
import type {
  LoginInput,
  ProfileUpdateInput,
  RegistrationInput,
} from '../validations/auth.validation.js'

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

function hashPassword(password: string) {
  // node-argon2 0.45 types the `type` option as a string although runtime expects its numeric enum.
  return argon2.hash(password, ARGON2_OPTIONS as unknown as argon2.HashOptions)
}

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

type UserWithAdvertiser = Prisma.UserGetPayload<{
  include: { advertiserProfile: true }
}>

export type AuthSession = {
  id: string
  csrfToken: string
  expiresAt: Date
  user: ApiAuthUser
}

export type IssuedSession = {
  token: string
  csrfToken: string
  expiresAt: Date
  user: ApiAuthUser
}

function toAuthUser(user: UserWithAdvertiser): ApiAuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    advertiserProfile: user.advertiserProfile
      ? {
          type: user.advertiserProfile.advertiserType,
          verificationStatus: user.advertiserProfile.verificationStatus,
        }
      : null,
  }
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

let dummyPasswordHash: Promise<string> | undefined

function getDummyPasswordHash() {
  dummyPasswordHash ??= hashPassword('roof-tech-invalid-login-sentinel')
  return dummyPasswordHash
}

async function issueSession(
  user: UserWithAdvertiser,
  database: Pick<Prisma.TransactionClient, 'session'> = prisma,
): Promise<IssuedSession> {
  const token = randomBytes(32).toString('hex')
  const csrfToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await database.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      csrfToken,
      expiresAt,
    },
  })

  return { token, csrfToken, expiresAt, user: toAuthUser(user) }
}

export const authService = {
  async register(input: RegistrationInput): Promise<IssuedSession> {
    const passwordHash = await hashPassword(input.password)
    const role = input.accountType === 'ADVERTISER' ? UserRole.ADVERTISER : UserRole.CLIENT

    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          phone: input.phone ?? null,
          role,
          status: UserStatus.ACTIVE,
          advertiserProfile:
            input.accountType === 'ADVERTISER'
              ? {
                  create: {
                    advertiserType:
                      input.advertiserType === 'OWNER'
                        ? AdvertiserType.OWNER
                        : AdvertiserType.AGENT,
                    verificationStatus: VerificationStatus.NOT_SUBMITTED,
                  },
                }
              : undefined,
        },
        include: { advertiserProfile: true },
      })

      const createdUser = await transaction.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { advertiserProfile: true },
      })
      return issueSession(createdUser, transaction)
    })
    return user
  },

  async authenticate(input: LoginInput): Promise<IssuedSession | null> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { advertiserProfile: true },
    })
    const storedHash: string = user?.passwordHash ?? (await getDummyPasswordHash())
    let passwordMatches = false
    try {
      passwordMatches = await argon2.verify(storedHash, input.password)
    } catch {
      // Malformed stored hashes behave like an incorrect password below.
    }

    if (!user || !user.passwordHash || !passwordMatches || user.status !== UserStatus.ACTIVE) {
      return null
    }

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lte: new Date() } }, { revokedAt: { not: null } }],
      },
    })
    return issueSession(user)
  },

  async findSession(token: string): Promise<AuthSession | null> {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { advertiserProfile: true } } },
    })
    if (!session) return null

    if (
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      if (!session.revokedAt) {
        await prisma.session.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      return null
    }

    return {
      id: session.id,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      user: toAuthUser(session.user),
    }
  },

  async revokeSession(sessionId: string) {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      include: { advertiserProfile: true },
    })
    return toAuthUser(user)
  },
}
