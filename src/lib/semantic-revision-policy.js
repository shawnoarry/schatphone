export const SEMANTIC_REVISION_TRACE_MODES = Object.freeze({
  SILENT: 'silent',
  META_HINT: 'meta_hint',
})

const DEFAULT_TRACE_MODE = SEMANTIC_REVISION_TRACE_MODES.SILENT

export const normalizeSemanticRevisionTraceMode = (value, fallback = DEFAULT_TRACE_MODE) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === SEMANTIC_REVISION_TRACE_MODES.META_HINT) return SEMANTIC_REVISION_TRACE_MODES.META_HINT
  if (raw === SEMANTIC_REVISION_TRACE_MODES.SILENT) return SEMANTIC_REVISION_TRACE_MODES.SILENT
  return fallback
}

export const hasSemanticRevisionTrace = (message) =>
  Boolean(
    message &&
      typeof message?.semanticRevision?.revisedText === 'string' &&
      message.semanticRevision.revisedText.trim(),
  )

export const shouldShowSemanticRevisionHint = ({ mode = DEFAULT_TRACE_MODE, message } = {}) =>
  normalizeSemanticRevisionTraceMode(mode) === SEMANTIC_REVISION_TRACE_MODES.META_HINT &&
  hasSemanticRevisionTrace(message)

