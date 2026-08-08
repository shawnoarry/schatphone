import {
  handleVercelAiProxyRequest,
  sendVercelNodeResponse,
} from '../../../../server/vercel-ai-proxy.mjs'

export const config = { maxDuration: 60 }

export default async function handler(request, response) {
  const result = await handleVercelAiProxyRequest(request, { route: 'chat' })
  await sendVercelNodeResponse(response, result)
}
