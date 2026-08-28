import { describe, expect, test } from 'vitest'
import { importPersonaSourceFile } from '../src/lib/persona-profile-source-import'

const importText = (name, text, options = {}) =>
  importPersonaSourceFile(
    { name },
    {
      readText: async () => text,
      ...options,
    },
  )

describe('persona profile source import', () => {
  test.each([
    ['persona.txt', 'Line one\nLine two', 'txt'],
    ['persona.md', '# Persona\n\n- Calm', 'md'],
    ['persona.markdown', '# Persona\n\nKeeps the original spacing.\n', 'markdown'],
  ])('preserves text from %s exactly', async (name, source, extension) => {
    const result = await importText(name, source)

    expect(result).toEqual({
      ok: true,
      source: { name, extension, text: source },
    })
  })

  test('parses and formats JSON without dropping nested values', async () => {
    const result = await importText(
      'persona.JSON',
      '{"identity":{"occupation":"Producer"},"habits":["tea","walking"]}',
    )

    expect(result.ok).toBe(true)
    expect(result.source.extension).toBe('json')
    expect(JSON.parse(result.source.text)).toEqual({
      identity: { occupation: 'Producer' },
      habits: ['tea', 'walking'],
    })
    expect(result.source.text).toContain('\n  "identity"')
  })

  test.each([
    ['persona.pdf', 'text', 'unsupported_format'],
    ['persona.txt', '   \n', 'empty_file'],
    ['persona.json', '{invalid', 'invalid_json'],
  ])('rejects %s with %s', async (name, source, reason) => {
    await expect(importText(name, source)).resolves.toEqual({ ok: false, reason })
  })

  test('rejects imported content over the configured limit', async () => {
    await expect(importText('persona.md', '123456', { maxLength: 5 })).resolves.toEqual({
      ok: false,
      reason: 'too_large',
    })
  })

  test('fails closed when the browser cannot read the file', async () => {
    const result = await importPersonaSourceFile(
      { name: 'persona.txt' },
      { readText: async () => Promise.reject(new Error('read failed')) },
    )

    expect(result).toEqual({ ok: false, reason: 'read_failed' })
  })
})
