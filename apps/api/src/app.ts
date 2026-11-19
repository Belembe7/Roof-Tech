import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { ZodError } from 'zod'
import type { ApiHealthResponse } from '@roof-tech/shared'
import { prisma } from './db/client.js'
import { neighborhoodRouter } from './routes/neighborhood.routes.js'
import { propertyRouter } from './routes/property.routes.js'
import { webOriginMiddleware } from './middleware/web-origin.middleware.js'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.routes.js'
import { advertiserRouter } from './routes/advertiser.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import {
  localPublicStorageRoot,
  StorageUnavailableError,
} from './services/object-storage.service.js'
import { FileValidationError } from './services/file-validation.service.js'
import { DomainError } from './utils/domain-error.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false)
app.use(webOriginMiddleware)
app.use(express.json({ limit: '64kb' }))

app.get('/api/v1/health', (_request, response) => {
  const body: ApiHealthResponse = {
    status: 'ok',
    service: 'roof-tech-api',
  }

  response.status(200).json(body)
})

app.get('/api/v1/health/ready', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    response.status(200).json({
      status: 'ready',
      service: 'roof-tech-api',
      database: 'connected',
    })
  } catch {
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'A base de dados não está disponível.',
      },
    })
  }
})

app.use('/api/v1/properties', propertyRouter)
app.use('/api/v1/neighborhoods', neighborhoodRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/advertiser', advertiserRouter)
app.use('/api/v1/admin', adminRouter)
if (env.STORAGE_PROVIDER === 'local') {
  app.use(
    '/api/v1/media/public',
    express.static(localPublicStorageRoot, {
      dotfiles: 'deny',
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders(response) {
        response.setHeader('X-Content-Type-Options', 'nosniff')
      },
    }),
  )
}

const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Rota não encontrada: ${request.method} ${request.path}`,
    },
  })
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os parâmetros enviados são inválidos.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof DomainError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    })
    return
  }

  if (error instanceof FileValidationError) {
    response.status(400).json({
      error: { code: 'FILE_VALIDATION_ERROR', message: error.message },
    })
    return
  }

  if (error instanceof StorageUnavailableError) {
    response.status(503).json({
      error: {
        code: 'OBJECT_STORAGE_UNAVAILABLE',
        message: 'O armazenamento de ficheiros está temporariamente indisponível.',
      },
    })
    return
  }

  if ((error as { name?: string })?.name === 'MulterError') {
    const uploadCode = (error as { code?: string }).code
    response.status(uploadCode === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error: {
        code: 'UPLOAD_REJECTED',
        message:
          uploadCode === 'LIMIT_FILE_SIZE'
            ? 'O ficheiro ultrapassa o limite de 8 MB.'
            : 'O pedido de carregamento tem campos ou ficheiros inválidos.',
      },
    })
    return
  }

  const errorCode = (error as { code?: string })?.code
  const errorName = (error as { name?: string })?.name
  const causeCode = (error as { cause?: { code?: string } })?.cause?.code
  if (
    errorName === 'PrismaClientInitializationError' ||
    errorCode?.startsWith('P10') ||
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ETIMEDOUT'
  ) {
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'A base de dados não está disponível.',
      },
    })
    return
  }

  console.error('Erro não tratado na API:', { name: errorName, code: errorCode })
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro inesperado.',
    },
  })
}

app.use(notFoundHandler)
app.use(errorHandler)
