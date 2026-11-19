import type {
  ApiAuthResponse,
  ApiAuthSessionResponse,
  ApiAuthUser,
  ApiCurrentUserResponse,
} from '@roof-tech/shared'
import { apiUrl } from './api-url'

type ApiErrorBody = {
  error?: { code?: string; message?: string }
}

export class AuthApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(`/auth${path}`), {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new AuthApiError('Não foi possível ligar ao serviço. Tente novamente.', 0)
  }

  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // A mensagem genérica abaixo também cobre respostas sem JSON.
    }
    throw new AuthApiError(
      body.error?.message ?? 'O pedido não foi concluído. Tente novamente.',
      response.status,
      body.error?.code,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const authApi = {
  getSession: () => request<ApiAuthSessionResponse>('/session'),
  login: (email: string, password: string) =>
    request<ApiAuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (input: {
    name: string
    email: string
    password: string
    phone?: string
    accountType: 'CLIENT' | 'ADVERTISER'
    advertiserType?: 'OWNER' | 'AGENT'
  }) =>
    request<ApiAuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: (csrfToken: string) =>
    request<void>('/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    }),
  updateProfile: (csrfToken: string, input: { name?: string; phone?: string | null }) =>
    request<ApiCurrentUserResponse>('/me', {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(input),
    }),
}

export type { ApiAuthUser }
