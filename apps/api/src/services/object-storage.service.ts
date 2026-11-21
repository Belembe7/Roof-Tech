import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

export type StorageArea = 'public' | 'private'

export class StorageUnavailableError extends Error {
  constructor() {
    super('Object storage is temporarily unavailable')
    this.name = 'StorageUnavailableError'
  }
}

const storageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../.local-storage')
export const localPublicStorageRoot = resolve(storageRoot, 'public')
const localPrivateStorageRoot = resolve(storageRoot, 'private')

const r2Client =
  env.STORAGE_PROVIDER === 'r2'
    ? new S3Client({
        region: 'auto',
        endpoint: env.R2_ENDPOINT!,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID!,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
        },
      })
    : null

function validateKey(key: string) {
  const segments = key.split('/')
  if (
    key.length > 512 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    !/^[a-zA-Z0-9/_\-.]+$/.test(key)
  ) {
    throw new Error('Invalid storage object key')
  }
}

function bucketFor(area: StorageArea) {
  return area === 'public' ? env.R2_PUBLIC_BUCKET! : env.R2_PRIVATE_BUCKET!
}

function localPathFor(area: StorageArea, key: string) {
  validateKey(key)
  const root = area === 'public' ? localPublicStorageRoot : localPrivateStorageRoot
  const path = resolve(root, key)
  const pathFromRoot = relative(root, path)
  if (
    isAbsolute(pathFromRoot) ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith('../') ||
    pathFromRoot.startsWith('..\\')
  ) {
    throw new Error('Invalid local storage path')
  }
  return path
}

export const objectStorage = {
  publicUrl(key: string) {
    validateKey(key)
    if (env.STORAGE_PROVIDER === 'disabled') throw new StorageUnavailableError()
    if (env.STORAGE_PROVIDER === 'local') {
      return `/api/v1/media/public/${key.split('/').map(encodeURIComponent).join('/')}`
    }
    const baseUrl = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')
    return `${baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
  },

  async put(area: StorageArea, key: string, body: Buffer, contentType: string) {
    validateKey(key)
    if (env.STORAGE_PROVIDER === 'disabled') throw new StorageUnavailableError()
    try {
      if (env.STORAGE_PROVIDER === 'r2') {
        await r2Client!.send(
          new PutObjectCommand({
            Bucket: bucketFor(area),
            Key: key,
            Body: body,
            ContentLength: body.byteLength,
            ContentType: contentType,
            ...(area === 'public'
              ? { CacheControl: 'public, max-age=31536000, immutable' }
              : { CacheControl: 'private, no-store', ContentDisposition: 'attachment' }),
          }),
        )
        return
      }

      const path = localPathFor(area, key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body, { flag: 'wx', mode: area === 'private' ? 0o600 : 0o644 })
    } catch {
      throw new StorageUnavailableError()
    }
  },

  async getPrivate(key: string) {
    validateKey(key)
    if (env.STORAGE_PROVIDER === 'disabled') throw new StorageUnavailableError()
    try {
      if (env.STORAGE_PROVIDER === 'r2') {
        const response = await r2Client!.send(
          new GetObjectCommand({ Bucket: bucketFor('private'), Key: key }),
        )
        if (!response.Body) throw new Error('Stored object has no body')
        return Buffer.from(await response.Body.transformToByteArray())
      }
      return await readFile(localPathFor('private', key))
    } catch {
      throw new StorageUnavailableError()
    }
  },

  async delete(area: StorageArea, key: string) {
    validateKey(key)
    if (env.STORAGE_PROVIDER === 'disabled') throw new StorageUnavailableError()
    try {
      if (env.STORAGE_PROVIDER === 'r2') {
        await r2Client!.send(new DeleteObjectCommand({ Bucket: bucketFor(area), Key: key }))
        return
      }
      await rm(localPathFor(area, key), { force: true })
    } catch {
      throw new StorageUnavailableError()
    }
  },
}

export function makeStorageKey(
  prefix: 'property-images' | 'verification-documents',
  ownerId: string,
  extension: 'webp' | 'pdf',
) {
  return `${prefix}/${ownerId}/${randomUUID()}.${extension}`
}
