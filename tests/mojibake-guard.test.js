import { describe, expect, test } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const ROOT_DIR = process.cwd()
const SRC_DIR = join(ROOT_DIR, 'src')
const SCANNED_EXTENSIONS = new Set(['.vue', '.js', '.mjs'])

const MOJIBAKE_MARKERS = [
  '�',
  '棣栭',
  '鏃ュ',
  '妯″潡',
  '鍗犱',
  '鐢佃瘽',
  '鑲＄エ',
  '閽卞寘',
  '鏅鸿兘',
  '闈㈡澘',
  '鑱氬悎',
  '涓撴敞',
  '鍦烘櫙',
  '缃戠粶',
  '澶栬',
  '瀛楃粍',
  '绯荤粺',
  '璁剧疆',
  '渚跨',
  '鏀惰棌',
  '鍒犻櫎',
  '濮撳悕',
  '鎬у埆',
  '鍑虹敓',
  '鑱屼笟',
  '璇︾粏',
  '淇℃伅',
  '浠婂ぉ',
  '鏄ㄥぉ',
  '鍒氬垰',
  '瑙掕壊',
  '涓栫晫',
]

const walkSourceFiles = (dir, output = []) => {
  readdirSync(dir).forEach((name) => {
    const fullPath = join(dir, name)
    if (statSync(fullPath).isDirectory()) {
      walkSourceFiles(fullPath, output)
      return
    }
    if (SCANNED_EXTENSIONS.has(extname(name))) {
      output.push(fullPath)
    }
  })
  return output
}

describe('mojibake guard', () => {
  test('keeps user-visible source text free of known Chinese mojibake fragments', () => {
    const hits = []

    walkSourceFiles(SRC_DIR).forEach((filePath) => {
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
