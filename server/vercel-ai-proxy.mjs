import { Readable } from 'node:stream'
import { handleAiProxyRequest } from './ai-proxy-core.mjs'

export { resolveProxyUpstreamUrl } from './ai-proxy-core.mjs'

export const handleVercelAiProxyRequest = (request, options = {}) =>
  handleAiProxyRequest(request, { env: process.env, ...options })

export const sendVercelNodeResponse = async (response, webResponse) => {
  response.statusCode = webResponse.status
  webResponse.headers.forEach((value, key) => response.setHeader(key, value))
  if (!webResponse.body) {
    response.end()
    return
  }

  await new Promise((resolve, reject) => {
    const readable = Readable.fromWeb(webResponse.body)
    readable.on('error', reject)
    response.on('finish', resolve)
    response.on('error', reject)
    readable.pipe(response)
  })
}
