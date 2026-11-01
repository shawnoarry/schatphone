# Dependency Maintenance And Stack Review — 2026-11-01

Status: `LOCAL_DONE / VALIDATED / NOT_DEPLOYED`.

Baseline: integrated `6a7ded40433acdbac5287e0604f3a24774446cc8`; changes are local and are not deployed. The earlier project review is a dated pre-maintenance snapshot and remains unchanged.

Owner: Module Architecture Governance, roadmap 4.5 security/toolchain maintenance. User scope: remediate dependency issues, verify existing behavior, and assess whether the technical stack needs updating. No business feature, storage schema, provider credential, or three.js integration is part of this slice.

## Dependency changes

| Dependency | Before | Selected version | Reason |
| --- | --- | --- | --- |
| Vue | 3.5.27 | 3.5.44 | Patched Vue/server-renderer family and compatible source-map closure |
| MapLibre GL JS | 6.0.0 | 6.4.1 | First patched release for attribution sanitizer advisory; avoid unrelated later minor features |
| Vite | 7.3.6 | 7.3.7 | Security patch within the supported 7.3 line |
| Vitest | 4.1.10 | 4.1.12 | Patched mocker dependencies within the same major |
| ESLint | 9.39.2 | 10.14.0 | Remove the old minimatch 3 / legacy eslintrc dependency path |
| eslint-plugin-vue | 9.33.0 | 10.12.0 | Supported ESLint 10 integration |
| vue-eslint-parser | 9.4.3, transitive | 10.4.1, explicit dev dependency | Satisfy the plugin's current parser peer contract |
| @eslint/js | 9.39.2 | 9.39.5 | Preserve the existing core recommended-rule generation during the engine migration |
| Wrangler | 4.120.0 | 4.156.0 | Updated Miniflare, Undici and Sharp closure; remain on Wrangler 4 |

Vue and MapLibre use exact selected runtime versions. The lockfile records the complete resolved dependency tree. No `--force`, `--legacy-peer-deps`, advisory suppression, or lowered audit severity threshold is used.

The first in-place npm resolution hit stale ESLint peer metadata. An isolated resolver under I: regenerated only the affected lint metadata through normal npm resolution while retaining the existing lock for other packages; the resolved lock was then installed normally. A clean `npm ci` verifies that the result does not depend on the old installation.

### Bounded development-only overrides

- `minimatch -> ^11.0.3`: all resolved consumers are development-only named-export consumers (ESLint, its config-array, EditorConfig and glob). Upgrading ESLint first removes the old callable minimatch 3 branch. A common root override avoids npm 11's invalid-deduplication reporting for equivalent nested/range overrides; the final `npm ls` graph is valid. Any future consumer addition must be checked before retaining this override.
- `js-beautify -> glob ^14.0.3`: resolve the vulnerable glob branch used by the Vue Test Utils HTML formatting tool. The consumer uses the exported `globSync` API.

These overrides require lint file/rule comparison, real consumer smoke checks and the component-test suite. Remove them when upstream package ranges resolve patched versions naturally. They are not blanket permission to override future dependency majors.

The minimatch advisory is new (published 2026-10-27) and lists versions below 11.0.1. npm's suggested downgrade of ESLint to 4 is unsuitable for this project. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Validation

Evidence directory: `I:\ProjectArtifacts\schatphone\dependency-maintenance\2026-11-01\`.

| Check | Result |
| --- | --- |
| Production audit, official registry | 0 vulnerabilities; previous snapshot: 4 |
| Full audit, official registry | 0 vulnerabilities; previous snapshot: 26, including the production entries |
| Final upgraded ESLint | Passed, including the four E2E test repairs |
| Clean install | Two clean `npm ci` runs passed, including the final override declaration |
| Lint scope and existing rules | Same 1,005 files, 0 errors, 0 warnings; documented rule replacement verified by an actual out-of-order SFC probe |
| Override consumer compatibility | globSync, EditorConfig parsing and Vue Test Utils HTML formatting passed |
| Unit/component tests | 361 files / 2,771 tests passed |
| Production build | Passed; existing large-chunk warning remains |
| Worker deployment bundle, dry run only | Passed; 24.88 KiB upload / 6.01 KiB gzip; no deployment |
| Focused repaired browser flows, desktop and simulated Pixel 5 | 20 passed / 0 failed / 0 flaky, with zero retries |
| Full desktop Chromium / simulated Pixel 5 E2E | 424 passed / 4 existing skips / 0 failed / 0 flaky; two workers, zero retries, 14.5 minutes |
| Asset publication, governance and diff checks | Assets: 1,220 tracked / 0 violations; governance: 2 files / 19 tests; diff check passed |

The full browser suite includes the visual-quality specs; a duplicate visual suite is unnecessary. Screenshots produced by this run are copied into the I: evidence directory before restoring pre-existing tracked evidence files. No real user storage or provider credentials are used by these isolated tests.

The Vue plugin replaces `vue/component-tags-order` with `vue/block-order`; warning severity remains enabled and an invalid block order still emits the warning. No lint config, ignored-file range or business source was changed to achieve a pass. The final override declaration changes no lockfile bytes or installed package versions compared with the passing unit/build run. [Official rule replacement](https://eslint.vuejs.org/rules/component-tags-order.html)

Audit success describes the package dependency graph at the scan time. It is not a penetration test or an assertion about every host runtime, provider, or deployed environment.

The final `npm ls --all` exits successfully with no invalid/missing dependency or peer. npm reports three optional Sharp WASM descendants (`@img/sharp-wasm32`, `@emnapi/runtime`, `tslib`) as extraneous on Windows after both clean installs. All three exist in the lockfile as optional dependencies of Sharp's skipped FreeBSD/WebContainers wrappers; the native Windows Sharp 0.35.5 loads successfully. These are platform installation leftovers, not unrecorded application dependencies; no manual node_modules pruning is used to conceal them.

### Browser-test findings

The initial full run reported 418 passed / 4 existing skips / 6 failed. It exposed test synchronization and calendar assumptions that the earlier focused smoke did not cover. Keep the initial failure traces as evidence alongside the final results.

- Peach Cloud's hero-image assertion reads `complete` immediately, while its PNG is still decoding. The trace contains the successful 2,020,453-byte PNG with the required 1536 x 1024 dimensions. The assertion must wait for the same exact completion/dimension condition, without accepting missing or substituted artwork.
- Tickets and Travel run Axe while their 220 ms detail-entry opacity animation is still active. A separate live diagnostic observed opacity 0 immediately after opening, then zero WCAG A/AA violations after opacity reaches 1. Their existing CSS colors and the Axe/Tailwind versions are unchanged. Wait for the settled panel before evaluating contrast; do not alter colors or disable the contrast rule.
- The semantic-access fixture issues identity evidence on 2026-08-31 that expires one day later, while the browser uses the actual current date. The production check correctly rejects this expired evidence. Align this test's browser Date with its authored fixture time; retain the production expiry check and the full reload/replay assertions.
- One mobile Travel reopen test never reached the application: Chromium reported `net::ERR_NO_BUFFER_SPACE` while loading `src/main.js`. No business assertion failed in that case. Use two workers for the final local run to reduce host concurrency, retain zero retries, and recheck the same full suite rather than skipping the test or increasing its timeout.

The four changed E2E files preserve image dimensions, accessibility rules, identity expiry checks and replay assertions. No application source or CSS is changed by these test repairs. Initial generated screenshots were archived with SHA-256 verification: 116 files / 32,011,434 bytes under `e2e-evidence/initial`; pre-existing tracked evidence was restored.

The four existing skipped cases are simulated-mobile duplicates of desktop Book hard-rollback and Repository schema/Web Locks/IndexedDB-lease checks. No new skip or exclusion was introduced. Physical-device, real-provider and deployed-origin acceptance remain outside this local maintenance run.

Final acceptance is recorded in `full-e2e-final.json` and `full-e2e-final.log`; there are no suite-level errors. Final generated screenshots are archived and hash-verified under `e2e-evidence/final`: 117 files / 32,317,981 bytes. The archive manifests record exact source paths and hashes, and `output/e2e` is restored to its pre-run state. The earlier project review retains its original SHA-256. No C: source or preview file was removed.

## 技术栈评估

结论：保留 Vue 3 + Pinia + Vue Router + Vite + Tailwind 的架构。当前要更新安全补丁和受影响工具，不需要通过更换框架解决产品收尾问题。

| 层次 | 本次结论 | 后续是否更新 |
| --- | --- | --- |
| Node.js | 本机为 24.13.0；CI 使用 Node 24 系列 | **建议下一步补到 24.22.1 或更新的 24 系列安全版**。本轮不替换共享的 `H:\Nodejs`，避免影响其他项目和正在运行的工具 |
| Vue 3 | 本轮更新到 3.5.44 | 继续采用，按补丁维护 |
| Pinia 3 / Vue Router 5 | 当前分别为 3.0.4 / 5.0.2；此次审计无阻断项 | Pinia 4 属单独状态管理升级；Router 5 后续小版本可在有具体收益时更新，无需与本轮绑在一起 |
| Vite 7.3 | 更新到 7.3.7；官方仍提供重要修复及安全补丁 | **保留本轮版本**。Vite 8 改用 Rolldown，单独评估构建时间、chunk 输出、MapLibre worker 和三个部署 base 路径后再迁移 |
| Vitest 4 | 更新到 4.1.12，保持既有测试语义 | Vitest 5 的 mock 清理等默认行为有变化；现有测试没有因此必须迁移的理由 |
| ESLint / Vue lint 插件 | 本轮完成必要主版本迁移 | 已承担相关兼容验证，不再额外加入新规则风格整顿 |
| Tailwind 4 | 当前 4.1.18，安全扫描通过 | 后续 4.x 更新与视觉验收一起做，避免让依赖维护混入全应用样式变化 |
| Playwright | 当前 1.60.0，安全扫描通过 | 与浏览器版本更新一起独立验证；当前回归继续使用原有浏览器基线 |
| JavaScript / TypeScript | 产品源代码为 JS/Vue，TypeScript 6 目前不是全项目类型化方案 | 不做一次性 TS 7/全仓迁移。未来按已选中的接口逐步补类型更合适 |
| MapLibre / Leaflet | 保留现有地图架构，修补 MapLibre | three.js 作为后续可选渲染层；不替换地图引擎 |
| Wrangler / Cloudflare | Wrangler 4 安全更新 | 不修改 Worker 业务行为、compatibility date、账号或部署 |

Node 24.22.1 是 2026-10-21 的安全发布，包含 TLS、DNS、Brotli 等修复；npm 包审计不检查 Node 可执行文件本身。因此“npm audit 0”不能替代这项本机维护。[Node 官方发布说明](https://nodejs.org/en/blog/release/v24.22.1)

Vite 7.3 仍在重要修复/安全支持范围内。项目自己的 `vite.config.js` 使用函数形式 `manualChunks` 和 MapLibre worker/shared module 处理；Vite 8 将前者列为弃用项，并改变打包引擎，应有独立迁移验收，而不是直接升级后只检查页面能否启动。[Vite 支持范围](https://vite.dev/releases)、[Vite 8 迁移说明](https://vite.dev/guide/migration)

Vitest 5 默认启用 `clearMocks`，并修改部分项目配置继承行为。当前有大量既有测试，先完成安全补丁比同时迁移测试语义更可控。[Vitest 5 迁移说明](https://vitest.dev/guide/migration/)

该评估不会自动启动以上后续升级，也不会把主线产品建设替换成长期工具升级队列。
