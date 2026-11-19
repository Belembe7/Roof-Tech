import { z } from 'zod'

const passwordSchema = z.string().min(12).max(128)
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^[+0-9() -]+$/)
  .refine((value) => value.replace(/\D/g, '').length >= 7)

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z
      .email()
      .trim()
      .max(254)
      .transform((email) => email.toLowerCase()),
    password: passwordSchema,
    phone: phoneSchema.optional(),
    accountType: z.enum(['CLIENT', 'ADVERTISER']).default('CLIENT'),
    advertiserType: z.enum(['OWNER', 'AGENT']).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.accountType === 'ADVERTISER' && !value.advertiserType) {
      context.addIssue({
        code: 'custom',
        path: ['advertiserType'],
        message: 'Seleccione proprietário ou agente imobiliário.',
      })
    }
    if (value.accountType === 'CLIENT' && value.advertiserType) {
      context.addIssue({
        code: 'custom',
        path: ['advertiserType'],
        message: 'Este campo só se aplica a contas de anunciante.',
      })
    }
  })

export const loginSchema = z
  .object({
    email: z
      .email()
      .trim()
      .max(254)
      .transform((email) => email.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict()

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.union([phoneSchema, z.null()]).optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.phone !== undefined, {
    message: 'Indique pelo menos um campo para actualizar.',
  })

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
