import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const BRAND_ROOT = resolve('public/icons/brands')
const CANONICAL_ROOT = resolve('public/icons')
const BRANDS = ['github', 'vercel', 'cloudflare']
const EXPECTED_SIZES = {
  'favicon-32.png': [32, 32],
  'apple-touch-icon.png': [180, 180],
  'pwa-icon-192.png': [192, 192],
  'pwa-icon-512.png': [512, 512],
  'pwa-maskable-512.png': [512, 512],
}

const readPngSize = (path) => {
  const bytes = readFileSync(path)
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}

describe('deployment brand assets', () => {
  test.each(BRANDS)('%s exports every required PWA size', (brand) => {
    for (const [filename, expectedSize] of Object.entries(EXPECTED_SIZES)) {
      expect(readPngSize(resolve(BRAND_ROOT, brand, filename))).toEqual(expectedSize)
    }
  })

  test('uses the GitHub artwork as the local and default-build fallback', () => {
    for (const filename of Object.keys(EXPECTED_SIZES)) {
      expect(readFileSync(resolve(CANONICAL_ROOT, filename))).toEqual(
        readFileSync(resolve(BRAND_ROOT, 'github', filename)),
      )
    }
  })

  test('keeps platform-specific build commands explicit', () => {
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
    expect(packageJson.scripts['build:github']).toContain('--mode github')
    expect(packageJson.scripts['build:vercel']).toContain('--mode vercel')
    expect(packageJson.scripts['build:cloudflare']).toContain('--mode cloudflare')
  })

  test('ships only raster production icons in the web manifest', () => {
    const manifest = JSON.parse(
      readFileSync(resolve('public/manifest.webmanifest'), 'utf8'),
    )
    expect(manifest.icons).toHaveLength(3)
    expect(manifest.icons.every((icon) => icon.type === 'image/png')).toBe(true)
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })
})
