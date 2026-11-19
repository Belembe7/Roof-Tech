import sharp from 'sharp'

export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_VERIFICATION_UPLOAD_BYTES = 8 * 1024 * 1024

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

function matches(buffer: Buffer, signature: number[], offset = 0) {
  return signature.every((value, index) => buffer[offset + index] === value)
}

function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (matches(buffer, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (matches(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

export async function optimizePropertyImage(buffer: Buffer) {
  if (!detectImageType(buffer)) {
    throw new FileValidationError('Use uma fotografia JPEG, PNG ou WebP válida.')
  }

  try {
    const optimized = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 1500, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
    if (optimized.byteLength > 5 * 1024 * 1024) {
      throw new FileValidationError('A fotografia continua demasiado pesada após optimização.')
    }
    return optimized
  } catch (error) {
    if (error instanceof FileValidationError) throw error
    throw new FileValidationError('Não foi possível processar esta fotografia.')
  }
}

export async function prepareVerificationDocument(buffer: Buffer) {
  const imageType = detectImageType(buffer)
  if (imageType) {
    try {
      const optimized = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, effort: 4 })
        .toBuffer()
      if (optimized.byteLength > 6 * 1024 * 1024) {
        throw new FileValidationError('O documento continua demasiado pesado após optimização.')
      }
      return { body: optimized, mimeType: 'image/webp', extension: 'webp' as const }
    } catch (error) {
      if (error instanceof FileValidationError) throw error
      throw new FileValidationError('Não foi possível processar este documento.')
    }
  }

  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return { body: buffer, mimeType: 'application/pdf', extension: 'pdf' as const }
  }

  throw new FileValidationError('Use um documento PDF ou uma imagem JPEG, PNG ou WebP válida.')
}
