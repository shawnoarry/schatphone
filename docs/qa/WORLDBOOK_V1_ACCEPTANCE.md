# WorldBook V1 Acceptance

Updated: 2026-05-30

This is the short acceptance checklist for the current WorldBook baseline. It is meant for user testing, not engineering planning.

## What To Try

1. Open `Settings -> World Book`.
2. Confirm the top of the page first shows:
   - current active world;
   - worldview character count;
   - enabled knowledge count;
   - current-world role template count;
   - modules that consume the world context.
3. Confirm `Current World Pack / 当前设定包` appears before editing controls.
4. Edit the global worldview and save.
5. Open `Book`, create or import a worldbook text source, then return to `Settings -> WorldBook`.
6. Link the Book source as a whole document or selected section, then confirm it appears in the active-world summary.
7. Add, disable, edit, and delete a knowledge point.
8. Open a Chat thread with role-bound knowledge and check the thread WorldBook summary.
9. Trigger a Chat reply and confirm enabled Book source text plus enabled bound knowledge can enter the AI prompt chain.

## Pass Criteria

- The page can be understood without reading developer docs.
- The first screen answers: what world is active, what defines it, and where it takes effect.
- WorldBook remains under Settings and contextual links.
- Chat visible WorldBook state matches what is sent into the AI prompt.
- Active Book source text is included in Chat prompt context and runtime world-context resolution.
- Disabled or missing knowledge does not enter prompt text.
- No visible mojibake, developer notes, or route/query labels appear in touched WorldBook surfaces. Check source files with UTF-8 readers; legacy PowerShell `Get-Content` can create false mojibake in terminal output.
- Mobile layout has no horizontal overflow.

## Automated Checks

Run focused unit tests:

```powershell
npm.cmd test -- tests/world-interface.test.js tests/worldbook-functional-ia.test.js tests/worldbook-view-filters.test.js tests/worldbook-profile-template-view.test.js tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js tests/simulation-world-context.test.js tests/mojibake-guard.test.js
```

Run browser acceptance:

```powershell
npm.cmd run test:e2e -- e2e/worldbook-acceptance.spec.js
```

Run release checks:

```powershell
npm.cmd run lint
npm.cmd run build
```

## Skills Used For Acceptance

- `frontend-logic-design`: checks the information path from overview to management.
- `playwright-testing`: checks the real browser path and mobile viewport.
- `unit-test-vue-pinia`: checks store, component, and Chat prompt behavior.

## Cross-PC Setup

On another PC, first confirm the SchatPhone project root. Do not assume the path is `D:\github\schatphone`.

From the confirmed project root:

```powershell
npm.cmd install
npm.cmd exec -- playwright install chromium
```

Why these are needed:

- `npm.cmd install` installs project dependencies, including `@playwright/test`, `vitest`, Vue, Pinia, and Vite from `package.json` / `package-lock.json`.
- `npm.cmd exec -- playwright install chromium` installs the browser binary Playwright needs for browser acceptance tests. This browser is machine-local and is not committed to the repo.

The acceptance skills are repo-local and should already travel with the project:

- `.agents/skills/frontend-logic-design`
- `.agents/skills/playwright-testing`
- `.agents/skills/unit-test-vue-pinia`
- `skills-lock.json`

If an agent session on the new PC does not list these skills, restart the agent host from the confirmed SchatPhone project root and check:

```powershell
Get-ChildItem .\.agents\skills
Test-Path .\skills-lock.json
```

Then run:

```powershell
npm.cmd test -- tests/world-interface.test.js tests/worldbook-functional-ia.test.js tests/worldbook-view-filters.test.js tests/worldbook-profile-template-view.test.js tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js tests/simulation-world-context.test.js
npm.cmd run test:e2e -- e2e/worldbook-acceptance.spec.js
npm.cmd run lint
npm.cmd run build
```

## Still Future Work

- Phone-device testing for Book import/export -> WorldBook activation -> changed-source review -> Chat/runtime context.
- Broaden World Pack app archetypes and service-account templates after the V1 path is easy to understand.
- Optional standalone shortcut after usage frequency is proven.
