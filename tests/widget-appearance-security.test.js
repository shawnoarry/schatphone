import { describe, expect, test } from 'vitest'
import { buildCustomWidgetSrcDoc } from '../src/lib/custom-widget-preview'
import {
  sanitizeWidgetAppearanceCode,
  validateWidgetAppearanceCode,
} from '../src/lib/widget-schema'

describe('custom widget appearance security', () => {
  test('accepts visual markup while rejecting active content and navigation', () => {
    expect(
      validateWidgetAppearanceCode(
        '<style>.card{height:100%;background:#fff}</style><div class="card">Safe</div>',
      ).ok,
    ).toBe(true)

    const unsafeSamples = [
      '<script>window.parent.postMessage("run", "*")</script>',
      '<div onclick="alert(1)">Tap</div>',
      '<a href="https://example.com">Leave</a>',
      '<iframe srcdoc="<p>Nested</p>"></iframe>',
      '<style>@import url(https://example.com/tracker.css);</style>',
      '<img src="javascript:alert(1)">',
    ]

    unsafeSamples.forEach((code) => {
      const result = validateWidgetAppearanceCode(code)
      expect(result.ok).toBe(false)
      expect(result.errors[0]?.code).toBe('DANGEROUS_CODE')
    })
  })

  test('sanitizes historical unsafe markup without discarding the widget appearance', () => {
    const result = sanitizeWidgetAppearanceCode(
      '<div class="card" onclick="alert(1)">Saved look</div><script>alert(2)</script>',
    )

    expect(result.changed).toBe(true)
    expect(result.code).toContain('Saved look')
    expect(result.code).not.toMatch(/onclick|<script/i)
  })

  test('builds a scriptless preview document with a restrictive CSP', () => {
    const srcdoc = buildCustomWidgetSrcDoc({
      code: '<div onpointerdown="window.parent.hacked=true">Preview</div><script>window.parent.hacked=true</script>',
    })

    expect(srcdoc).toContain("default-src 'none'")
    expect(srcdoc).toContain("script-src 'none'")
    expect(srcdoc).toContain("connect-src 'none'")
    expect(srcdoc).toContain('Preview')
    expect(srcdoc).not.toMatch(/onpointerdown|<script/i)
  })
})
