// 扫描 src 下所有 t(zh, en) 调用：找出 zh 槽位没有中文（疑似中英混用）的位置
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['src/views', 'src/components', 'src/composables']
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(vue|js)$/.test(name)) files.push(p)
  }
}
roots.forEach(walk)

const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s)
const decodeEscapes = (s) =>
  s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
// 匹配 t('...', '...') 与 t(`...`, `...`)，简单引号场景
const callRe = /\bt\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g

const hits = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(callRe)) {
      const zh = decodeEscapes(m[1])
      if (!hasCJK(zh) && zh.trim().length > 1) {
        hits.push({ file, line: idx + 1, zh, en: m[2] })
      }
    }
  })
}

// 产品名/专有词白名单（允许英文）
const allow = /^(Chat|Book|WorldBook|Worldbook|NPC|AI|ID|URL|API|Markdown|JSON|OpenAI|GPT|IndexedDB|Repository|Coupang|App Store|K-pop|Self Profile|CNY|AMEX|UnionPay|Dock|iOS|Android|WebP|GIF|TXT|MD|TTS|FAQ|OK)[\s\w-]*$/i
const filtered = hits.filter((h) => !allow.test(h.zh.trim()))

const byFile = new Map()
filtered.forEach((h) => {
  if (!byFile.has(h.file)) byFile.set(h.file, [])
  byFile.get(h.file).push(h)
})
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${file} (${list.length})`)
  list.slice(0, 12).forEach((h) => console.log(`  L${h.line}: ${h.zh}`))
}
console.log(`\nTOTAL files=${byFile.size} hits=${filtered.length}`)
