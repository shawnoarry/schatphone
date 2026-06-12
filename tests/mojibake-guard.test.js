import { describe, expect, test } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const ROOT_DIR = process.cwd()
const SRC_DIR = join(ROOT_DIR, 'src')
const DOCS_DIR = join(ROOT_DIR, 'docs')
const SCANNED_EXTENSIONS = new Set(['.vue', '.js', '.mjs', '.md'])
const EXCLUDED_DIR_PARTS = new Set(['archive'])

const isDraftReferenceWorkspaceFile = (filePath) => {
  const relativePath = relative(ROOT_DIR, filePath).replace(/\\/g, '/')
  if (!relativePath.startsWith('docs/superpowers/')) return false
  return !relativePath.endsWith('/README.md')
}

const MOJIBAKE_MARKERS = [
  '锟?',
  '�',
  '銆',
  '搴旂敤',
  '绯荤粺',
  '璁剧疆',
  '涓栫晫',
  '鏂囨湰',
  '鑱婂ぉ',
  '鑱旂郴',
  '鐢佃瘽',
  '鍦板浘',
  '濯掍綋',
  '瑙掕壊',
  '缂栬緫',
  '淇濆瓨',
  '瀵煎叆',
  '鍏ㄥ眬',
  '鍚敤',
  '鎵撳紑',
  '榛樿',
  '鐜颁唬',
  '琛ョ粰',
  '鏁戞彺',
  '棰戦亾',
]

const walkSourceFiles = (dir, output = []) => {
  readdirSync(dir).forEach((name) => {
    const fullPath = join(dir, name)
    if (statSync(fullPath).isDirectory()) {
      if (EXCLUDED_DIR_PARTS.has(name)) return
      walkSourceFiles(fullPath, output)
      return
    }
    if (SCANNED_EXTENSIONS.has(extname(name)) && !isDraftReferenceWorkspaceFile(fullPath)) {
      output.push(fullPath)
    }
  })
  return output
}

describe('mojibake guard', () => {
  test('keeps user-visible source and active docs free of known Chinese mojibake fragments', () => {
    const hits = []

    ;[SRC_DIR, DOCS_DIR].flatMap((dir) => walkSourceFiles(dir)).forEach((filePath) => {
      const relativePath = relative(ROOT_DIR, filePath)
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const marker = MOJIBAKE_MARKERS.find((item) => line.includes(item))
          if (!marker) return
          hits.push(`${relativePath}:${index + 1}: ${marker}`)
        })
    })

    expect(hits).toEqual([])
  })
})
