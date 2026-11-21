import { app } from '../apps/api/dist/app.js'

export default function handler(request, response) {
  const host = request.headers.host ?? 'localhost'
  const rewrittenUrl = new URL(request.url ?? '/api/index', `http://${host}`)
  const apiPaths = rewrittenUrl.searchParams.getAll('__api_path')

  if (apiPaths.length !== 1 || !apiPaths[0]) {
    response.statusCode = 400
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify({ error: { code: 'INVALID_API_PATH', message: 'Rota inválida.' } }))
    return
  }

  const apiPath = apiPaths[0].replace(/^\/+|\/+$/g, '')
  if (!/^[a-zA-Z0-9/_-]+$/.test(apiPath)) {
    response.statusCode = 400
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify({ error: { code: 'INVALID_API_PATH', message: 'Rota inválida.' } }))
    return
  }

  rewrittenUrl.searchParams.delete('__api_path')
  const remainingQuery = rewrittenUrl.searchParams.toString()
  request.url = `/api/v1/${apiPath}${remainingQuery ? `?${remainingQuery}` : ''}`

  app(request, response)
}
