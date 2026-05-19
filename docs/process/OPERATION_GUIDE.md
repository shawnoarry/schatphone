# SchatPhone Operation Guide

Updated: 2026-05-19

This is the practical guide for daily development, validation, and release flow.

For workflow governance and documentation sync rules, read:

- `docs/process/AI_WORK_MODE.md`
- `docs/process/DEVELOPMENT_TOOLING.md`

## 1. Local Setup

```bash
cd D:\github\schatphone
npm install
npm run dev
```

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

```bash
npm run lint
npm run build
```

Recommended when behavior changed:

```bash
npm run test
```

Useful doc-only check:

```bash
git diff --check
```

## 13. Release / Deployment Flow

```bash
git add .
git commit -m "feat: your message"
git push origin main
```

Deployment is handled by the existing GitHub Actions pipeline.

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
