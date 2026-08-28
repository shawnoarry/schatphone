import { MAX_PERSONA_SOURCE_TEXT } from './persona-profile-classifier'

export const PERSONA_SOURCE_FILE_ACCEPT =
  '.txt,.md,.markdown,.json,text/plain,text/markdown,application/json'

const SUPPORTED_PERSONA_SOURCE_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json'])

const fileExtension = (name = '') => {
  const match = String(name).trim().toLowerCase().match(/\.([^.]+)$/)
  return match?.[1] || ''
}

const readFileAsText = (file) => {
  if (typeof file?.text === 'function') return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result || '')))
    reader.addEventListener('error', () => reject(reader.error || new Error('file_read_failed')))
    reader.readAsText(file)
  })
}

export const importPersonaSourceFile = async (
  file,
  { maxLength = MAX_PERSONA_SOURCE_TEXT, readText = readFileAsText } = {},
) => {
  const name = String(file?.name || '').trim()
  const extension = fileExtension(name)

  if (!SUPPORTED_PERSONA_SOURCE_EXTENSIONS.has(extension)) {
    return { ok: false, reason: 'unsupported_format' }
  }

  let rawText = ''
  try {
    rawText = String(await readText(file))
  } catch {
    return { ok: false, reason: 'read_failed' }
  }

  if (!rawText.trim()) {
    return { ok: false, reason: 'empty_file' }
  }

  let text = rawText
  if (extension === 'json') {
    try {
      const parsed = JSON.parse(rawText.replace(/^\uFEFF/, ''))
      text = JSON.stringify(parsed, null, 2)
    } catch {
      return { ok: false, reason: 'invalid_json' }
    }
  }

  if (text.length > maxLength) {
    return { ok: false, reason: 'too_large' }
  }

  return {
    ok: true,
    source: {
      name,
      extension,
      text,
    },
  }
}
