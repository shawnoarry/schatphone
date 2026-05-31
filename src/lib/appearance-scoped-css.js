import { normalizeScopeToken } from './app-shell-scope'

export const SCOPED_CUSTOM_CSS_KEYS = {
  APP: 'app',
  WORLD_APP: 'worldApp',
}

export const APP_SCOPED_CSS_TARGETS = [
  { id: 'home', labelZh: '主页', labelEn: 'Home' },
  { id: 'chat', labelZh: '聊天', labelEn: 'Chat' },
  { id: 'chat_contacts', labelZh: '聊天目录', labelEn: 'Chat Directory' },
  { id: 'contacts', labelZh: '联系人', labelEn: 'Contacts' },
  { id: 'app_store', labelZh: '应用商城', labelEn: 'App Store' },
  { id: 'shopping', labelZh: '购物', labelEn: 'Shopping' },
  { id: 'food_delivery', labelZh: '外卖', labelEn: 'Food Delivery' },
  { id: 'worldbook', labelZh: '世界书', labelEn: 'WorldBook' },
  { id: 'appearance', labelZh: '外观', labelEn: 'Appearance' },
]

const DEFAULT_APP_TARGET = 'food_delivery'
const DEFAULT_WORLD_PACK_TARGET = 'survival_city'
const DEFAULT_WORLD_APP_TARGET = 'survival_dispatch'

const normalizeCssText = (value) => (typeof value === 'string' ? value : '')

const normalizeEnabled = (value) => value === true

export const normalizeScopedCustomCss = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {}
  const appSource = source[SCOPED_CUSTOM_CSS_KEYS.APP] || {}
  const worldAppSource = source[SCOPED_CUSTOM_CSS_KEYS.WORLD_APP] || {}

  return {
    [SCOPED_CUSTOM_CSS_KEYS.APP]: {
      enabled: normalizeEnabled(appSource.enabled),
      target: normalizeScopeToken(appSource.target, DEFAULT_APP_TARGET),
      css: normalizeCssText(appSource.css),
    },
    [SCOPED_CUSTOM_CSS_KEYS.WORLD_APP]: {
      enabled: normalizeEnabled(worldAppSource.enabled),
      worldPack: normalizeScopeToken(worldAppSource.worldPack, DEFAULT_WORLD_PACK_TARGET),
      worldApp: normalizeScopeToken(worldAppSource.worldApp, DEFAULT_WORLD_APP_TARGET),
      css: normalizeCssText(worldAppSource.css),
    },
  }
}

const splitSelectorList = (selectorText) => {
  const selectors = []
  let current = ''
  let depth = 0
  let quote = ''

  for (const char of selectorText) {
    if (quote) {
      current += char
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === '(' || char === '[') depth += 1
    if ((char === ')' || char === ']') && depth > 0) depth -= 1
    if (char === ',' && depth === 0) {
      selectors.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) selectors.push(current.trim())
  return selectors
}

const findMatchingBrace = (cssText, openIndex) => {
  let depth = 0
  let quote = ''
  for (let index = openIndex; index < cssText.length; index += 1) {
    const char = cssText[index]
    if (quote) {
      if (char === quote && cssText[index - 1] !== '\\') quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const shouldScopeAtRule = (header) => {
  const normalized = header.trim().toLowerCase()
  return (
    normalized.startsWith('@media') ||
    normalized.startsWith('@supports') ||
    normalized.startsWith('@container') ||
    normalized.startsWith('@layer')
  )
}

const prefixSelectors = (selectorText, scopeSelector) =>
  splitSelectorList(selectorText)
    .map((selector) => {
      if (!selector || selector.startsWith(scopeSelector)) return selector
      if (selector === ':scope' || selector === '&') return scopeSelector
      return `${scopeSelector} ${selector}`
    })
    .filter(Boolean)
    .join(', ')

export const scopeCssToSelector = (cssText, scopeSelector) => {
  const source = normalizeCssText(cssText)
  if (!source.trim() || !scopeSelector) return ''
  if (!source.includes('{')) return `${scopeSelector} {\n${source.trim()}\n}`

  let output = ''
  let index = 0

  while (index < source.length) {
    const openIndex = source.indexOf('{', index)
    if (openIndex === -1) {
      output += source.slice(index)
      break
    }

    const header = source.slice(index, openIndex).trim()
    const closeIndex = findMatchingBrace(source, openIndex)
    if (closeIndex === -1) {
      output += source.slice(index)
      break
    }

    const body = source.slice(openIndex + 1, closeIndex)
    if (header.startsWith('@')) {
      output += shouldScopeAtRule(header)
        ? `${header} {\n${scopeCssToSelector(body, scopeSelector)}\n}\n`
        : `${header} {${body}}\n`
    } else {
      output += `${prefixSelectors(header, scopeSelector)} {${body}}\n`
    }
    index = closeIndex + 1
  }

  return output.trim()
}

export const buildScopedCustomCss = (value = {}) => {
  const scopedCss = normalizeScopedCustomCss(value)
  const chunks = []
  const appLayer = scopedCss[SCOPED_CUSTOM_CSS_KEYS.APP]
  const worldAppLayer = scopedCss[SCOPED_CUSTOM_CSS_KEYS.WORLD_APP]

  if (appLayer.enabled && appLayer.css.trim()) {
    chunks.push(scopeCssToSelector(appLayer.css, `[data-app="${appLayer.target}"]`))
  }

  if (worldAppLayer.enabled && worldAppLayer.css.trim()) {
    chunks.push(
      scopeCssToSelector(
        worldAppLayer.css,
        `[data-world-pack="${worldAppLayer.worldPack}"][data-world-app="${worldAppLayer.worldApp}"]`,
      ),
    )
  }

  return chunks.filter(Boolean).join('\n\n')
}
