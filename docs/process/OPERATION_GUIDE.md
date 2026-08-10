# SchatPhone Operation Guide

Updated: 2026-08-09

This is the practical guide for daily development, validation, and release flow.

For workflow governance and documentation sync rules, read:

- `docs/process/AI_WORK_MODE.md`
- `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md`
- `docs/process/DEVELOPMENT_TOOLING.md`

## 1. Local Setup

```powershell
cd H:\SchatPhone\schatphone
npm.cmd install
npm.cmd run dev
```

On another PC, replace the path with the confirmed SchatPhone project root from `docs/process/DEVELOPMENT_TOOLING.md`. Cross-platform docs may use plain `npm`, but this Windows PowerShell setup should prefer `npm.cmd`.

Local preview note:

- Do not reuse stale local preview ports as default review links. Old preview sessions must not be treated as the product baseline.
- When a local preview is needed, start one deliberate dev server, record its exact URL in the handoff, and confirm with the user before using it as an acceptance reference.
- The authoritative product review link is the user-confirmed deployment URL, not an automatically reused local port.

## 2. Stack Overview

- Vue 3 + Composition API
- Vite 7 + `@vitejs/plugin-vue`
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Pinia
- Vue Router (hash mode)
- Vitest + jsdom
- ESLint + Prettier

## 3. Core Routes

Main user-facing routes:

- `/lock`
- `/home`
- `/settings`
- `/appearance`
- `/widgets`
- `/network`
- `/chat`
- `/chat-contacts`
- `/contacts`
- `/gallery`
- `/phone`
- `/map`
- `/calendar`
- `/reminders`
- `/wallet`
- `/worldbook`
- `/profile`
- `/stock`
- `/shopping`
- `/food-delivery`
- `/assets`
- `/more`

Controlled or hidden routes:

- `/control-center`
- `/files`

## 4. Lock And Home Rules

- The app default entry is `/lock`; `/` redirects to `/lock`.
- Non-lock routes are blocked while `isLocked` is true.
- Lock-screen notifications can unlock the phone and route to the target page.
- Home is the main shell for app tiles, widgets, and future folders.
- Widget editing is the default Home customization path.
- Long-press layout experiments may still exist behind feature flags, but they are not the default UX model.

### Return Navigation Rule

- Full installed apps return to Home by default.
- Appearance and similar system-customization pages may preserve source context with query parameters such as `from=home` or `from=settings`.
- In-app child pages should return to their parent app, not to a vague system layer.
- Cross-module deep links may use source markers such as `source=chat|map|calendar` so the back button can name the source context clearly.
- Do not label a button only as `Back` when the target layer would be ambiguous.

## 5. Home, Widgets, And Folder Rules

- Fixed page skeleton remains the default Home model.
- Widget slots should use stable sizes such as `1x1`, `2x1`, `2x2`, `4x2`, and `4x3`.
- In widget edit mode, replacing a placed widget should prefer same-size replacements.
- Free drag and cross-page drag remain experimental, not the main user path.
- App entries and Dock items stay in system-owned zones.
- `app_*` entries are not user-deletable; visibility and overflow should be governed by system-owned Home rules.
- Widget Center is a library/import/create surface, not a screen-placement control panel.
- Folder capability belongs to Home as a general desktop capability. Business modules supply child-entry metadata; they do not each build their own folder UI.

## 6. Settings Structure

Settings home includes:

- user card -> `/profile`
- WorldBook, General, and Notifications sections
- backup/export and diagnostics/about sections

Independent entries:

- `/network`
- `/appearance`
- `/widgets`

Appearance sections currently cover:

- theme and wallpaper
- lock clock style
- icon presentation and visual presets
- Widget Center shortcut

## 7. System Language Rule

Source of truth:

- `settings.system.language`

Supported values:

- `zh-CN`
- `en-US`
- `ko-KR`

Scope:

- system UI labels
- settings text
- navigation labels

Out of scope:

- AI-generated chat content

Visible copy rule:

- UI text must be user-facing product copy.
- Do not expose raw developer comments, TODOs, debug labels, route names, store names, CSS token names, or implementation notes to users.
- Empty, loading, and unavailable states must use proper product copy instead of placeholder engineering text.

## 8. Chat And Contact Rules

### Chat (`/chat`, `/chat/:id`)

- Chat owns message history and thread interaction.
- Sending a user message does not automatically call the AI unless that specific surface is designed to do so.
- `Trigger Reply` remains the explicit AI invocation lane where that pattern is used.
- Rich message creation belongs to the chat input and its action panel.
- Installed-PWA external link sharing resumes through the lock screen, asks for a Chat recipient, and opens the existing link-card form; it never sends without an explicit user action.

### Chat Directory (`/chat-contacts`)

- Chat Directory is the Chat-side contact and service-account manager.
- It supports create, edit, delete, and open-conversation actions for Chat-side entries.
- It is not the global role archive.
- Unbinding a role from Chat Directory must not destroy the global role profile in `通讯录 / Contacts`.

### Contacts (`/contacts`)

- Contacts is the global role archive and future role hub.
- Destructive role management belongs here, not in Chat Directory.

## 9. Calendar And Reminders Rule

- `日历 / Calendar` owns confirmed schedules, dates, and calendar-shaped review surfaces.
- `提醒事项 / Reminders` owns raw cues, callbacks, and cross-module follow-up intake.
- Do not collapse every reminder-like queue back into Calendar.

## 10. Commerce, Assets, And Files Rule

- Shopping owns store, product, and order behavior.
- Food Delivery owns restaurant, menu, cart, and delivery-order behavior.
- Wallet owns ledger outcomes, not upstream order truth.
- Assets owns long-term owned things and property-like records.
- Files is hidden/internal and should not be treated as a normal user-facing file manager.

## 11. Common Task Flows

### Widget Flow

1. Open `/widgets` from Home or Appearance.
2. Choose library, custom, or import.
3. Create or import the widget into the library.
4. Enter Home widget edit mode.
5. Assign or replace using a compatible slot.

### Network / Model Setup Flow

1. Open `/network`.
2. Fill provider URL and API key.
3. Refresh models or wait for auto-pull.
4. Choose model and save.
5. Save preset if needed.

### New Feature Flow

1. Create or update the needed view/store/component files.
2. Register route changes in `src/router/index.js` if routing changes are needed.
3. Decide whether a Home app entry is required.
4. Put state in the proper store instead of ad hoc component state when it becomes shared behavior.
5. Route AI requests through the project AI integration layer.
6. Keep explicit save/confirm actions on important editing surfaces.
7. Sync docs:
   - `docs/overview/PROJECT_MASTER_GUIDE.md`
   - `docs/roadmap/TODO_ROADMAP.md`
   - `docs/pm/TODO_PM_STATUS_REPORT.md`
   - `docs/architecture/ARCHITECTURE.md`

## 12. Validation And Pre-Commit Checks

Required for code changes:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Required when a user-facing route flow changed:

```powershell
npm.cmd run test:e2e
```

Dependency changes also require:

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
```

The production-only and full audit results must be reported separately.

Useful for doc-only work:

```powershell
git diff --check
npm.cmd run governance:check
```

## 13. Integration, Push, And Deployment Flow

Separate worktrees follow `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md`. Workgroups return a structured handoff and must not merge, rebase, push, delete worktrees, or synchronize other branches themselves.

The integration controller protects dirty work, audits scope and product meaning, coordinates an exact local commit, runs independent validation, integrates into local `main`, performs omission review, and synchronizes safe clean worktrees. The user is not expected to operate Git.

Remote push is separate from local integration. Only the integration controller may run the intended push after the user explicitly authorizes that specific push:

```powershell
git push origin main
```

Previous push approval does not cover future commits. Always report whether local `main` is ahead of `origin/main`.

GitHub Pages remains the static `/schatphone/` release path. The PR/manual CI workflow and main/manual-main Pages build define the same fail-closed production/full audits, lint, unit, build, Chromium, and full-E2E gate. Each path runs the full Playwright collection once, so the included focused visual-quality cases are not repeated through a second `test:visual` step. Pages configure/upload/deploy follows the verified build job. The optional push relay is not deployed by the Pages workflow.

Vercel is the root-path hosted release and serverless AI-proxy path:

- project: `shawn-e-s-projects/schatphone`;
- production URL: `https://schatphone.vercel.app`;
- Git source: `shawnoarry/schatphone`;
- pushes to the connected production branch trigger a Vercel build automatically; there is no separate routine Vercel push;
- Vercel builds with `/`, while GitHub Pages and ordinary local builds keep `/schatphone/`; `SCHATPHONE_BASE_PATH` may explicitly override either path;
- `/api/openai/v1/models` and `/api/openai/v1/chat/completions` are the only AI relay routes. They accept an explicit per-request upstream only for OpenAI-compatible model-list and Chat Completions traffic; they are not arbitrary-path forwarders or a general backend.

`SCHATPHONE_AI_PROXY_DYNAMIC_MODE=public` lets each browser profile keep its own provider URL, provider key, and model. Network & API remains direct by default; the user must explicitly choose Compatibility Proxy, and native Gemini, Anthropic, Azure, or Responses transports stay direct. Public mode accepts only an allowed browser origin (or same-origin Fetch Metadata), public HTTPS port 443 targets, bounded JSON requests, and no redirects. It blocks private/local IP literals, local/internal domain suffixes, URL credentials, and same-origin loops, with a best-effort per-runtime rate limit.

`SCHATPHONE_AI_PROXY_DYNAMIC_MODE=token` adds a separate `SCHATPHONE_AI_PROXY_CLIENT_TOKEN`; users enter that value only in the advanced Proxy access token field, while their provider key stays in `Authorization`. Legacy fixed-upstream mode remains available when no per-request target header is present and still uses `SCHATPHONE_AI_PROXY_UPSTREAM_URL`, `SCHATPHONE_AI_PROXY_UPSTREAM_KEY`, and the separate client token. Configure secrets only through Vercel Environment Variables, never with a `VITE_` prefix.

Public mode is a restricted compatibility baseline, not abuse-proof infrastructure: non-browser clients can spoof origin/fetch metadata, the rate limiter is process-instance local, and hostname validation cannot fully eliminate DNS rebinding. Use token mode or a durable edge rate-limit/auth layer before exposing a higher-risk or higher-volume deployment.

The first 2026-08-09 Vercel deployment came from a local working-tree upload. Commit `a1418ed` is the verified Git-built restricted-relay baseline. The normal update flow is local validation -> commit -> GitHub push -> automatic Vercel deployment. Public mode needs no shared provider Environment Variables; a GitHub Pages browser has completed one real-provider model-list and Chat-`OK` smoke through the production Vercel route. Configure Vercel secrets only when deliberately enabling token or legacy fixed-upstream mode.

Cloudflare is the third independent root-path release and uses one Worker for static assets, the restricted AI relay routes, and the bounded runtime TTS route:

- configuration: `wrangler.jsonc`;
- Worker entry: `server/cloudflare-worker.mjs`;
- build command: `npm run build:cloudflare`;
- deploy command for Workers Builds: `npx wrangler deploy`;
- Git source: `shawnoarry/schatphone`, production branch `main`;
- pushes to the connected production branch trigger a Cloudflare Workers Build automatically; the first Git-triggered deployment completed on 2026-08-09.

`wrangler.jsonc` enables the restricted public dynamic mode deployed from `a1418ed`. It needs no shared upstream URL or upstream key: each user keeps those values in their own Network profile. The Worker uses its same-origin `/api/openai/v1` route; GitHub Pages defaults to the same Worker cross-origin after explicit proxy selection. The production GitHub Pages -> Worker path has returned 6 real provider models and Chat smoke reply `OK`. If an operator changes to token mode, store only `SCHATPHONE_AI_PROXY_CLIENT_TOKEN` as a Worker secret and distribute it as a revocable proxy-access credential. Legacy fixed-upstream values, when deliberately used, still belong only in Variables and Secrets.

Before a Cloudflare release, run `npm.cmd run build:cloudflare` and `npm.cmd exec wrangler -- deploy --dry-run`. The Git-connected production Worker is live at `https://schatphone.noarry.workers.dev`; later authorized pushes to `main` automatically rebuild it. Detailed deployment and smoke evidence is in `docs/qa/CLOUDFLARE_DEPLOYMENT_HANDOFF_2026-08-09.md`.

The pre-integration 2026-08-10 TTS deployment used manual current-working-tree Worker version `d9e15cf0-f81f-46dc-bc04-22752547a994`. It added `POST /api/tts/v1/speech`, the Workers AI binding, verified `zh`/`en` input, WAV/MP3 byte-signature output typing, one browser-side temporary-failure retry, and explicit outage copy beyond the reproducible `a1418ed` relay baseline. Two bounded Chinese requests immediately after deployment reached the route but returned `502 TTS_PROVIDER_UNAVAILABLE`, so provider quality/playback proof remains open. Once the TTS slice is committed and pushed, the normal Git-connected `main` build is authoritative; use `npm.cmd exec wrangler -- deployments list` to read its active version.

## 14. Quick Troubleshooting

### Changes seem not applied

- Check whether the flow requires an explicit save/confirm action.
- Refresh and verify persisted state.

### Home layout looks old

- Check whether local layout state is cached.
- Use the Home reset path if the feature provides one.

### Model pull failed

- Check provider URL and API key first.
- Then check CORS, gateway, or rate-limit issues.
- Fall back to manual model input only when the UX already supports it.

### Mixed-language UI still appears

- Treat it as a regression.
- Align that surface with the project i18n pattern instead of leaving temporary mixed copy in place.
