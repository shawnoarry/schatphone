import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import { normalizeWorldProfile } from './world-pack-compatibility'

const normalizeText = (value, fallback = '', maxLength = 6000) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const parsePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const choiceText = response?.choices?.[0]?.message?.content
  const parsedChoice = choiceText ? parseAssistantJsonPayload(choiceText) : null
  if (parsedChoice) return parsedChoice

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? null : response
}

export const buildWorldProfileAnalysisPrompt = ({ worldContextText = '' } = {}) =>
  [
    'Analyze the active SchatPhone main worldview so the product can recommend optional compatible World Packs.',
    'Return JSON only with this shape:',
    '{"era":"","settingTraits":[],"realism":"","socialRoles":[],"economyTraits":[],"technologyLevel":"","confidence":"high|medium|low","evidence":[]}',
    'Use concise lowercase English trait ids such as modern, school, entertainment, business_family, urban, supernatural, realistic, resource_scarce, real_world.',
    'Do not enable any pack, create records, create apps, create routes, or make product decisions. This is advisory classification only.',
    'World context:',
    normalizeText(worldContextText, '(empty)', 6000),
  ].join('\n')

export const parseWorldProfileAnalysisResponse = (response) => {
  const payload = parsePayload(response)
  return normalizeWorldProfile(payload || {})
}

export const analyzeWorldProfileWithAI = async ({
  worldContextText = '',
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildWorldProfileAnalysisPrompt({ worldContextText })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You classify SchatPhone world context into advisory compatibility traits. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parsePayload(response)
  return {
    ok: Boolean(payload),
    profile: normalizeWorldProfile(payload || {}),
    rawPayload: payload,
  }
}
