import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, 'data')
const configPath = resolve(dataDir, 'push-config.json')

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const keys = webpush.generateVAPIDKeys()
const payload = {
  publicKey: keys.publicKey,
  privateKey: keys.privateKey,
  subject: 'mailto:schatphone@example.com',
  createdAt: Date.now(),
}

writeFileSync(configPath, JSON.stringify(payload, null, 2), 'utf8')
console.log(JSON.stringify(payload, null, 2))
