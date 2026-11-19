import type {
  ApiAdvertiserDashboardResponse,
  ApiAdvertiserPropertiesResponse,
  ApiAdvertiserProperty,
  ApiAdvertiserVerificationResponse,
  ApiNeighborhood,
  ApiPropertyFeature,
  ApiAdvertiserVerificationRequest,
} from '@roof-tech/shared'
import { apiUrl } from './api-url'

type ErrorBody = { error?: { code?: string; message?: string } }

export class AdvertiserApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'AdvertiserApiError'
    this.status = status
    this.code = code
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { csrfToken?: string } = {},
): Promise<T> {
  const { csrfToken, ...requestOptions } = options
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...requestOptions,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new AdvertiserApiError('Não foi possível ligar ao serviço. Tente novamente.', 0)
  }
  if (!response.ok) {
    let body: ErrorBody = {}
    try {
      body = (await response.json()) as ErrorBody
    } catch {
      // Keep a generic message for responses without a JSON body.
    }
    throw new AdvertiserApiError(
      body.error?.message ?? 'O pedido não foi concluído. Tente novamente.',
      response.status,
      body.error?.code,
    )
  }
  return (await response.json()) as T
}

export type PropertyDraftPayload = {
  title: string
  description: string
  propertyType: 'HOUSE' | 'APARTMENT' | 'ROOM' | 'ANNEX'
  neighborhoodId: string
  monthlyRent: string
  depositAmount: string
  visitFee: string
  otherInitialCost: string
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: string
  featureSlugs: string[]
}

export const advertiserApi = {
  getDashboard: () => apiRequest<ApiAdvertiserDashboardResponse>('/advertiser/dashboard'),
  getProperties: () => apiRequest<ApiAdvertiserPropertiesResponse>('/advertiser/properties'),
  getProperty: async (id: string) =>
    (await apiRequest<{ property: ApiAdvertiserProperty }>(`/advertiser/properties/${id}`))
      .property,
  getFeatures: async () =>
    (await apiRequest<{ items: ApiPropertyFeature[] }>('/advertiser/features')).items,
  getNeighborhoods: async () =>
    (await apiRequest<{ items: ApiNeighborhood[] }>('/neighborhoods?city=maputo')).items,
  createDraft: async (csrfToken: string, input: PropertyDraftPayload) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>('/advertiser/properties', {
        method: 'POST',
        csrfToken,
        body: JSON.stringify(input),
      })
    ).property,
  updateProperty: async (csrfToken: string, id: string, input: PropertyDraftPayload) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(`/advertiser/properties/${id}`, {
        method: 'PATCH',
        csrfToken,
        body: JSON.stringify(input),
      })
    ).property,
  submitProperty: async (csrfToken: string, id: string) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(`/advertiser/properties/${id}/submit`, {
        method: 'POST',
        csrfToken,
      })
    ).property,
  setAvailability: async (
    csrfToken: string,
    id: string,
    availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE',
  ) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(
        `/advertiser/properties/${id}/availability`,
        { method: 'PATCH', csrfToken, body: JSON.stringify({ availabilityStatus }) },
      )
    ).property,
  archiveProperty: async (csrfToken: string, id: string) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(
        `/advertiser/properties/${id}/archive`,
        {
          method: 'POST',
          csrfToken,
        },
      )
    ).property,
  uploadImage: async (csrfToken: string, id: string, file: File, altText?: string) => {
    const body = new FormData()
    body.append('file', file)
    if (altText) body.append('altText', altText)
    return (
      await apiRequest<{ property: ApiAdvertiserProperty }>(`/advertiser/properties/${id}/images`, {
        method: 'POST',
        csrfToken,
        body,
      })
    ).property
  },
  deleteImage: async (csrfToken: string, propertyId: string, imageId: string) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(
        `/advertiser/properties/${propertyId}/images/${imageId}`,
        { method: 'DELETE', csrfToken },
      )
    ).property,
  reorderImages: async (csrfToken: string, propertyId: string, imageIds: string[]) =>
    (
      await apiRequest<{ property: ApiAdvertiserProperty }>(
        `/advertiser/properties/${propertyId}/images/order`,
        { method: 'PATCH', csrfToken, body: JSON.stringify({ imageIds }) },
      )
    ).property,
  getVerificationRequests: async () =>
    (await apiRequest<ApiAdvertiserVerificationResponse>('/advertiser/verification-requests'))
      .items,
  createVerificationRequest: async (
    csrfToken: string,
    verificationType: 'IDENTITY' | 'LISTING_AUTHORIZATION',
    files: File[],
  ) => {
    const body = new FormData()
    body.append('verificationType', verificationType)
    files.forEach((file) => body.append('files', file))
    return (
      await apiRequest<{ request: ApiAdvertiserVerificationRequest }>(
        '/advertiser/verification-requests',
        { method: 'POST', csrfToken, body },
      )
    ).request
  },
  async getVerificationDocument(requestId: string, documentId: string) {
    const response = await fetch(
      apiUrl(`/advertiser/verification-requests/${requestId}/documents/${documentId}`),
      { credentials: 'include' },
    )
    if (!response.ok) {
      let body: ErrorBody = {}
      try {
        body = (await response.json()) as ErrorBody
      } catch {
        // Use a generic message if the private file endpoint fails without JSON.
      }
      throw new AdvertiserApiError(
        body.error?.message ?? 'Não foi possível descarregar o documento.',
        response.status,
        body.error?.code,
      )
    }
    return response.blob()
  },
}
