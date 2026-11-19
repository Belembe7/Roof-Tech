import type {
  ApiAdminAuditEntry,
  ApiAdminOverviewResponse,
  ApiAdminProperty,
  ApiAdminReport,
  ApiAdminUser,
  ApiAdminVerificationRequest,
  ApiUserStatus,
} from '@roof-tech/shared'
import { apiUrl } from './api-url'

type ErrorBody = { error?: { code?: string; message?: string } }

export class AdminApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit & { csrfToken?: string } = {}) {
  const { csrfToken, ...requestOptions } = options
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
  let response: Response
  try {
    response = await fetch(apiUrl(`/admin${path}`), {
      ...requestOptions,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new AdminApiError('Não foi possível ligar ao serviço. Tente novamente.', 0)
  }
  if (!response.ok) {
    let body: ErrorBody = {}
    try {
      body = (await response.json()) as ErrorBody
    } catch {
      // Use the generic message for responses without a JSON body.
    }
    throw new AdminApiError(
      body.error?.message ?? 'O pedido não foi concluído. Tente novamente.',
      response.status,
    )
  }
  return (await response.json()) as T
}

async function download(path: string) {
  let response: Response
  try {
    response = await fetch(apiUrl(`/admin${path}`), { credentials: 'include' })
  } catch {
    throw new AdminApiError('Não foi possível ligar ao serviço. Tente novamente.', 0)
  }
  if (!response.ok) {
    throw new AdminApiError('Não foi possível descarregar o documento.', response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const fileName = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]
  anchor.download = fileName ?? 'roof-tech-documento'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const adminApi = {
  getOverview: () => request<ApiAdminOverviewResponse>('/overview'),
  getProperties: async () => (await request<{ items: ApiAdminProperty[] }>('/properties')).items,
  reviewProperty: (
    csrfToken: string,
    propertyId: string,
    input: { decision: 'APPROVE' | 'REJECT'; reason?: string },
  ) =>
    request<{ property: { id: string; moderationStatus: string } }>(
      `/properties/${propertyId}/review`,
      {
        method: 'POST',
        csrfToken,
        body: JSON.stringify(input),
      },
    ),
  getVerificationRequests: async () =>
    (await request<{ items: ApiAdminVerificationRequest[] }>('/verification-requests')).items,
  reviewVerification: (
    csrfToken: string,
    requestId: string,
    input: { decision: 'APPROVE' | 'REJECT'; reason?: string },
  ) =>
    request<{ request: { id: string; status: string } }>(
      `/verification-requests/${requestId}/review`,
      { method: 'POST', csrfToken, body: JSON.stringify(input) },
    ),
  downloadVerificationDocument: (requestId: string, documentId: string) =>
    download(`/verification-requests/${requestId}/documents/${documentId}`),
  getReports: async () => (await request<{ items: ApiAdminReport[] }>('/reports')).items,
  updateReport: (csrfToken: string, reportId: string, status: ApiAdminReport['status']) =>
    request<{ report: { id: string; status: string } }>(`/reports/${reportId}`, {
      method: 'PATCH',
      csrfToken,
      body: JSON.stringify({ status }),
    }),
  getUsers: async (search: string) => {
    const query = new URLSearchParams()
    if (search.trim()) query.set('search', search.trim())
    return (await request<{ items: ApiAdminUser[] }>(`/users?${query}`)).items
  },
  setUserStatus: (
    csrfToken: string,
    userId: string,
    status: Extract<ApiUserStatus, 'ACTIVE' | 'SUSPENDED'>,
  ) =>
    request<{ user: { id: string; status: ApiUserStatus } }>(`/users/${userId}/status`, {
      method: 'PATCH',
      csrfToken,
      body: JSON.stringify({ status }),
    }),
  getAuditLogs: async () => (await request<{ items: ApiAdminAuditEntry[] }>('/audit-logs')).items,
}
