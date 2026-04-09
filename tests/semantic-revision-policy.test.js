import { describe, expect, test } from 'vitest'
import {
  SEMANTIC_REVISION_TRACE_MODES,
  hasSemanticRevisionTrace,
  normalizeSemanticRevisionTraceMode,
  shouldShowSemanticRevisionHint,
} from '../src/lib/semantic-revision-policy'

describe('semantic revision policy', () => {
  test('normalizes trace modes with safe fallback', () => {
    expect(normalizeSemanticRevisionTraceMode('meta_hint')).toBe(SEMANTIC_REVISION_TRACE_MODES.META_HINT)
    expect(normalizeSemanticRevisionTraceMode('silent')).toBe(SEMANTIC_REVISION_TRACE_MODES.SILENT)
    expect(normalizeSemanticRevisionTraceMode('unknown')).toBe(SEMANTIC_REVISION_TRACE_MODES.SILENT)
    expect(normalizeSemanticRevisionTraceMode('META_HINT')).toBe(SEMANTIC_REVISION_TRACE_MODES.META_HINT)
  })

  test('detects whether message carries semantic revision trace', () => {
    expect(hasSemanticRevisionTrace(null)).toBe(false)
    expect(
      hasSemanticRevisionTrace({
        semanticRevision: {
          revisedText: ' ',
        },
      }),
    ).toBe(false)
    expect(
      hasSemanticRevisionTrace({
        semanticRevision: {
          revisedText: 'revised text',
        },
      }),
    ).toBe(true)
  })

  test('shows hint only when mode is meta_hint and trace exists', () => {
    const messageWithTrace = {
      semanticRevision: {
        revisedText: 'revised text',
      },
    }

    expect(
      shouldShowSemanticRevisionHint({
        mode: SEMANTIC_REVISION_TRACE_MODES.META_HINT,
        message: messageWithTrace,
      }),
    ).toBe(true)
    expect(
      shouldShowSemanticRevisionHint({
        mode: SEMANTIC_REVISION_TRACE_MODES.SILENT,
        message: messageWithTrace,
      }),
    ).toBe(false)
    expect(
      shouldShowSemanticRevisionHint({
        mode: SEMANTIC_REVISION_TRACE_MODES.META_HINT,
        message: null,
      }),
    ).toBe(false)
  })
})

