# Text To Speech Module Contract

Status: `FIRST_RUNTIME_SLICE_IMPLEMENTED`

Updated: 2026-08-10

## 1. Purpose

SchatPhone has one shared Text To Speech Module for runtime speech synthesis. It is separate from:

- `src/lib/ai.js`, which owns text and conversation provider transport;
- the Image Generation Module;
- the Music Module;
- agent Skills that generate development assets outside the running product;
- Chat's current `voice_virtual` rich-message shape.

The first runtime slice supports provider configuration and temporary Chinese speech preview. It does not create or persist a Chat message.

## 2. Ownership

The shared TTS Module owns:

- provider profile normalization and capabilities;
- provider request normalization;
- Cloudflare MeloTTS and MiniMax protocol adapters;
- device-local provider configuration and credentials;
- temporary preview state and object-URL cleanup;
- normalized, redacted runtime errors.

Chat Settings owns only the entry and configuration/preview surface at `/chat-settings/voice`. Chat does not own provider protocol, credentials, raw response data, or preview audio.

Cloudflare Worker owns the restricted MeloTTS server adapter at `POST /api/tts/v1/speech`. MiniMax remains a direct browser adapter in this slice.

## 3. Provider Matrix

| Provider | Adapter | Authentication | Runtime route | First-slice purpose |
| --- | --- | --- | --- | --- |
| Cloudflare Workers AI | `cloudflare_melotts` | Worker AI binding | `/api/tts/v1/speech` | Development default and low-cost preview |
| MiniMax | `minimax_t2a` | User-owned API Key on the device | `https://api.minimax.io/v1/t2a_v2` | Chinese voice, emotion, and prosody validation |

The default Cloudflare model is fixed to `@cf/myshell-ai/melotts`. The default MiniMax model is `speech-2.8-turbo`; `speech-2.8-hd` is an explicit user selection.

Adding another provider requires a new adapter kind and a normalized result. Callers and Chat surfaces must not branch on a provider-specific response.

## 4. Shared Request And Result

The normalized request contains:

- `text`, bounded to 600 characters in the first slice;
- `language`;
- optional `voiceId`;
- normalized `speed`, `volume`, `pitch`, and `emotion`.

The normalized result contains:

- one in-memory audio `Blob`;
- MIME type;
- provider, adapter, and model identifiers.

Raw provider JSON, Base64/Hex payloads, request authorization, and upstream error bodies do not cross this boundary.

## 5. Cloudflare MeloTTS Boundary

`server/cloudflare-worker.mjs` reserves `/api/tts/v1/speech` before static SPA fallback. The handler:

- accepts only `POST` and `OPTIONS`;
- enforces an origin allowlist, a 16 KiB request bound, a 600-character text bound, and a first-slice `zh`/`en` language allowlist;
- applies a best-effort per-minute process-local rate limit;
- requires the `AI` binding, keeps `zh` as the public contract value, maps it to MeloTTS's provider-native `ZH`, and calls `env.AI.run('@cf/myshell-ai/melotts', { prompt, lang })`;
- accepts Workers AI Base64 JSON, binary typed-array, ArrayBuffer, or direct `Response` audio forms;
- recognizes WAV from `RIFF`/`WAVE` bytes and MP3 from ID3 or MPEG frame bytes, returns the matching `audio/wav` or `audio/mpeg` type with `no-store`, and rejects unrecognized bytes as `INVALID_AUDIO_RESPONSE`.

The browser adapter retries one `TTS_PROVIDER_UNAVAILABLE` or `PROVIDER_UNAVAILABLE` result after a 350 ms delay. The retry shares the original cancellation signal and 45-second request timeout; other failures are not retried. This is a bounded transient-failure aid, not provider failover or a guarantee that an upstream outage will recover.

The shared Worker is development compatibility infrastructure. It is not an unlimited production multi-tenant speech gateway. Production promotion requires durable abuse controls, quota policy, cost ownership, monitoring, and an explicit user-key or personal-gateway decision.

## 6. MiniMax Boundary

MiniMax uses the official HTTPS endpoint directly from the browser because its current API CORS policy permits browser POST requests. The adapter:

- sends `Authorization: Bearer <user key>`;
- requests non-streaming `output_format: hex` MP3;
- sets `language_boost: Chinese`;
- normalizes voice, speed, volume, pitch, and emotion;
- validates and decodes Hex audio into an in-memory Blob;
- rejects missing keys and malformed provider data before playback.

The allowed endpoint hosts are restricted to `api.minimax.io` and `api.minimaxi.com` so a configured MiniMax Key is not sent to an arbitrary host.

## 7. Persistence And Backup

The first slice has two independently inventoried local carriers:

- `schatphone:tts:config`: device-local provider configuration;
- `schatphone:tts:credentials`: device-local API keys.

Both are excluded from ordinary backup in this slice. They are not `store:*` owners and are not mirrored into the complete backup package. Credentials must be re-entered on another device.

Preview audio is runtime-only. It is represented by a revocable `blob:` URL, never written to local storage, never entered into ordinary backup, and released when replaced, when providers change, or when the settings surface unmounts.

## 8. Chat Boundary

The first slice does not change Chat schema or behavior:

- it does not attach audio to `voice_virtual`;
- it does not persist transcript, duration, Blob, Base64, Hex, or provider metadata in Chat;
- it does not speak assistant replies automatically;
- it does not add background generation, caching, or a durable audio library.

A later Chat read-aloud or voice-message slice must define explicit user action, cancellation, media retention, message schema, backup behavior, accessibility, and playback ownership before using this Module.

## 9. Error And Security Rules

- Provider keys never enter repository files, static Worker variables, ordinary backups, Chat messages, logs, or UI error copy.
- Provider errors are mapped to stable codes such as `API_KEY_REQUIRED`, `AUTHENTICATION_FAILED`, `RATE_LIMITED`, `TIMEOUT`, and `INVALID_AUDIO_RESPONSE`.
- Request cancellation and timeout are distinct outcomes.
- The settings surface identifies `TTS_PROVIDER_UNAVAILABLE` as a temporary Cloudflare outage and offers later retry or an explicit switch to MiniMax.
- Cloudflare origin and rate checks are best effort, not a complete authentication system.
- No real paid MiniMax request is part of automated validation.

## 10. Validation

Every TTS behavior change requires:

- contract/adapter/Store unit tests;
- Worker routing, binding, CORS, limits, and output tests;
- settings-surface tests;
- desktop and simulated-mobile route-flow coverage;
- lint, full Vitest, production build, governance, diff check, and Wrangler dry-run.

Real-provider smoke is a separate opt-in action using an authorized account and acknowledged quota/cost.
