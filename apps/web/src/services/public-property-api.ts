import type { ApiPublicProperty, ApiPropertySearchResponse } from '@roof-tech/shared'
import { apiUrl } from './api-url'

type ErrorBody = { error?: { code?: string; message?: string } }

export class PublicPropertyApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'PublicPropertyApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new PublicPropertyApiError('Não foi possível ligar ao serviço. Tente novamente.', 0)
  }
  if (!response.ok) {
    let body: ErrorBody = {}
    try {
      body = (await response.json()) as ErrorBody
    } catch {
      // Keep the fallback for responses without a JSON body.
    }
    throw new PublicPropertyApiError(
      body.error?.message ?? 'Não foi possível carregar os anúncios.',
      response.status,
      body.error?.code,
    )
  }
  return (await response.json()) as T
}

export const publicPropertyApi = {
  search(query: URLSearchParams) {
    return request<ApiPropertySearchResponse>(`/properties?${query.toString()}`)
  },

  getBySlug(slug: string) {
    return request<ApiPublicProperty>(`/properties/${encodeURIComponent(slug)}`)
  },

  submitReport(
    slug: string,
    input: {
      reason:
        | 'INCORRECT_INFORMATION'
        | 'POSSIBLE_FRAUD'
        | 'UNAVAILABLE_PROPERTY'
        | 'UNAUTHORIZED_LISTING'
        | 'OTHER'
      description?: string
    },
  ) {
    return request<{ report: { id: string; status: string; createdAt: string } }>(
      `/properties/${encodeURIComponent(slug)}/reports`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  },
}
