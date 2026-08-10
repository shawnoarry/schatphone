# TTS Provider Setup And Cross-PC Handoff

Updated: 2026-08-10

This guide lets another development machine install, configure, verify, and continue the runtime TTS slice without relying on Codex Skill state.

## 1. What Is In The Project

- shared contract: `src/lib/tts-contract.js`
- browser adapters: `src/lib/tts-api.js`
- device-local Store: `src/stores/tts.js`
- settings and preview UI: `src/views/TtsSettingsView.vue`
- Cloudflare Worker handler: `server/cloudflare-tts-handler.mjs`
- Worker entry: `server/cloudflare-worker.mjs`
- Cloudflare binding: `wrangler.jsonc`
- architecture authority: `docs/architecture/TTS_MODULE_CONTRACT.md`

No ElevenLabs Skill is required to run this feature. Skills are development-time agent workflows; this TTS Module is shipped application code.

## 2. Install On Another PC

Prerequisites:

- current repository checkout;
- supported Node.js and npm;
- a Cloudflare account for Worker deployment;
- a MiniMax account only when testing MiniMax.

From the repository root:

```powershell
npm.cmd install
npx.cmd wrangler login
```

No extra audio package is required.

## 3. Cloudflare MeloTTS

`wrangler.jsonc` already declares:

```json
"ai": {
  "binding": "AI"
}
```

Review `SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS`. The TTS handler uses `SCHATPHONE_TTS_ALLOWED_ORIGINS` when present and otherwise reuses that allowlist. Optional TTS-specific variables are:

```json
"SCHATPHONE_TTS_ALLOWED_ORIGINS": "https://your-app.example,http://localhost:5173",
"SCHATPHONE_TTS_RATE_LIMIT_PER_MINUTE": "20"
```

Build and verify without deployment:

```powershell
npm.cmd run build:cloudflare
npx.cmd wrangler deploy --dry-run
```

Deploy only from the intended Cloudflare account and environment:

```powershell
npx.cmd wrangler whoami
npx.cmd wrangler deploy
```

The current development Worker is `https://schatphone.noarry.workers.dev` under Cloudflare account ID `0de8b7a0ecea09c02667775b8c467ffd`. Verify both values before replacing the deployment from another PC.

Pre-integration manual deployment: version `d9e15cf0-f81f-46dc-bc04-22752547a994` from the 2026-08-10 working tree. This version introduced the verified-language, audio-signature, bounded-retry, and outage-message hardening. After the TTS slice is integrated and pushed, the Git-connected `main` build is authoritative; run `npm.cmd exec wrangler -- deployments list` on another PC to identify the active version instead of assuming this historical ID is still live.

The first runtime slice exposes only `zh` and `en`, the two languages verified against the current Cloudflare model. The SchatPhone API and settings UI use `zh` as the stable Chinese language code. The Worker maps it to MeloTTS's provider-native `ZH`; callers should not send `ZH` directly.

When the app and Worker share an origin, keep the default endpoint `/api/tts/v1/speech`. When the frontend is hosted elsewhere, enter the full deployed Worker HTTPS endpoint in Chat Settings -> Voice & Read Aloud -> MeloTTS.

## 4. MiniMax Chinese Validation

1. Create or obtain an API Key from [MiniMax Platform](https://platform.minimax.io/).
2. Open Chat Settings -> Voice & Read Aloud.
3. Select MiniMax.
4. Enter the Key, model, voice ID, emotion, and speed.
5. Generate one short Chinese preview and confirm playback.

The default endpoint is `https://api.minimax.io/v1/t2a_v2`. The default model is `speech-2.8-turbo`. Suggested Mandarin voice IDs are:

- `Chinese (Mandarin)_Lyrical_Voice`
- `Chinese (Mandarin)_HK_Flight_Attendant`

The Key is stored only in `schatphone:tts:credentials` in the current browser storage container. It is not committed, placed in an environment file, or included in ordinary backup. Each PC/browser profile must configure its own Key.

## 5. Local Development

The Vite development server does not emulate a Workers AI binding. Use one of these paths:

- run the frontend through a deployed Cloudflare Worker and keep the relative endpoint;
- enter the full HTTPS endpoint of an authorized development Worker;
- test MiniMax directly with a user-owned Key.

Do not add a shared MiniMax secret to the repository or route it through the public development Worker.

## 6. Verification

```powershell
npx.cmd vitest run tests/tts-api.test.js tests/tts-store.test.js tests/tts-settings-view.test.js tests/cloudflare-worker.test.js
npx.cmd playwright test e2e/tts-settings.spec.js
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run governance:check
git diff --check
```

Automated tests mock provider responses and consume no provider quota. A real MiniMax or Cloudflare smoke is a separate manual action.

After an authorized Cloudflare deployment, verify one short Chinese request:

```powershell
$ttsJson = @{ text = '你好，这是 SchatPhone 中文语音测试。'; language = 'zh' } |
  ConvertTo-Json -Compress
$ttsBytes = [Text.Encoding]::UTF8.GetBytes($ttsJson)
$ttsFile = Join-Path $env:TEMP 'schatphone-melotts-smoke.wav'

Invoke-WebRequest `
  -Uri 'https://schatphone.noarry.workers.dev/api/tts/v1/speech' `
  -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body $ttsBytes `
  -OutFile $ttsFile

Get-Item $ttsFile | Select-Object FullName, Length
Format-Hex -Path $ttsFile | Select-Object -First 1
```

The request must return HTTP 200, `Content-Type: audio/wav` for the currently observed MeloTTS output, non-empty audio, and first bytes beginning with `52 49 46 46` (`RIFF`) followed by `57 41 56 45` (`WAVE`) at byte offset 8. The Worker also accepts a valid MP3 signature and reports `audio/mpeg`; it rejects bytes that match neither container.

The browser adapter retries one temporary Cloudflare provider failure after 350 ms. If `TTS_PROVIDER_UNAVAILABLE` remains after that retry, the route and AI binding were reached but Workers AI rejected or could not complete inference. Cloudflare error `3043 Internal server error` has been observed while neuron usage remained below the daily free allocation, so it should be treated as an upstream availability incident rather than proof of quota exhaustion or a Worker routing problem. Retry later, check Cloudflare status and usage, or switch the preview explicitly to MiniMax; do not loop requests or widen the public language contract in response.

## 7. Continuing The Module

Before adding Chat read-aloud, durable voice messages, caching, or another provider:

1. read `docs/architecture/TTS_MODULE_CONTRACT.md`;
2. keep the Provider Adapter result normalized as an in-memory Blob;
3. define user action, cancellation, retention, backup, and schema behavior explicitly;
4. keep credentials device-local unless a separately approved encrypted secret design replaces that rule;
5. update the owning governance and Chat package handoffs when their meaning changes.
