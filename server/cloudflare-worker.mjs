import { handleAiProxyRequest } from './ai-proxy-core.mjs'
import { handleCloudflareTtsRequest } from './cloudflare-tts-handler.mjs'

const API_ROUTES = new Map([
  ['/api/openai/v1/models', 'models'],
  ['/api/openai/v1/chat/completions', 'chat'],
])

const apiNotFound = () =>
  new Response(JSON.stringify({ ok: false, code: 'NOT_FOUND' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname
    if (pathname === '/api/tts/v1/speech') {
      return handleCloudflareTtsRequest(request, { env })
    }
    const route = API_ROUTES.get(pathname)
    if (route) return handleAiProxyRequest(request, { route, env })
    if (pathname.startsWith('/api/')) return apiNotFound()
    return env.ASSETS.fetch(request)
  },
}
