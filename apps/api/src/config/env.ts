import { z } from 'zod'

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.preprocess(
      (value) => value ?? process.env.PORT,
      z.coerce.number().int().min(1).max(65_535).default(4000),
    ),
    DATABASE_URL: z.string().url(),
    WEB_ORIGIN: z.string().url().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
    R2_ENDPOINT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional(),
    ),
    R2_ACCESS_KEY_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    R2_SECRET_ACCESS_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    R2_PUBLIC_BUCKET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(3).max(63).optional(),
    ),
    R2_PRIVATE_BUCKET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(3).max(63).optional(),
    ),
    R2_PUBLIC_BASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional(),
    ),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV === 'production' && !values.WEB_ORIGIN) {
      context.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'WEB_ORIGIN é obrigatório em produção.',
      })
    }
    if (values.NODE_ENV === 'production' && values.STORAGE_PROVIDER !== 'r2') {
      context.addIssue({
        code: 'custom',
        path: ['STORAGE_PROVIDER'],
        message: 'O armazenamento local não é permitido em produção.',
      })
    }
    if (values.STORAGE_PROVIDER === 'r2') {
      const requiredR2Values = [
        ['R2_ENDPOINT', values.R2_ENDPOINT],
        ['R2_ACCESS_KEY_ID', values.R2_ACCESS_KEY_ID],
        ['R2_SECRET_ACCESS_KEY', values.R2_SECRET_ACCESS_KEY],
        ['R2_PUBLIC_BUCKET', values.R2_PUBLIC_BUCKET],
        ['R2_PRIVATE_BUCKET', values.R2_PRIVATE_BUCKET],
        ['R2_PUBLIC_BASE_URL', values.R2_PUBLIC_BASE_URL],
      ] as const
      for (const [name, value] of requiredR2Values) {
        if (!value) {
          context.addIssue({
            code: 'custom',
            path: [name],
            message: `${name} é obrigatório quando STORAGE_PROVIDER=r2.`,
          })
        }
      }
      if (values.R2_PUBLIC_BUCKET && values.R2_PUBLIC_BUCKET === values.R2_PRIVATE_BUCKET) {
        context.addIssue({
          code: 'custom',
          path: ['R2_PRIVATE_BUCKET'],
          message: 'O bucket de documentos tem de ser separado do bucket público.',
        })
      }
      if (
        values.NODE_ENV === 'production' &&
        values.R2_PUBLIC_BASE_URL &&
        new URL(values.R2_PUBLIC_BASE_URL).hostname.endsWith('.r2.dev')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['R2_PUBLIC_BASE_URL'],
          message: 'Use um domínio próprio para servir fotografias em produção.',
        })
      }
    }
  })

const result = environmentSchema.safeParse(process.env)

if (!result.success) {
  throw new Error(`Configuração inválida da API: ${z.prettifyError(result.error)}`)
}

export const env = result.data
