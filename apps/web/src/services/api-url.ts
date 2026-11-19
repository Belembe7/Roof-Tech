const API_BASE_URL = (import.meta.env.VITE_API_URL?.trim() || '/api/v1').replace(/\/+$/, '')

export function apiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export function apiAssetUrl(url: string) {
  const localApiPrefix = '/api/v1/'
  return url.startsWith(localApiPrefix) ? apiUrl(url.slice(localApiPrefix.length)) : url
}
