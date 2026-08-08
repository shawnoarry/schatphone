import {
  handleVercelAiProxyRequest,
  sendVercelNodeResponse,
} from '../../../server/vercel-ai-proxy.mjs'

export const config = { maxDuration: 30 }

export default async function handler(request, response) {
  const result = await handleVercelAiProxyRequest(request, { route: 'models' })
  await sendVercelNodeResponse(response, result)
}
