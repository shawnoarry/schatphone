# Vercel Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- Vercel project `shawn-e-s-projects/schatphone` is connected to GitHub repository `shawnoarry/schatphone`.
- Production is available at [https://schatphone.vercel.app](https://schatphone.vercel.app).
- The initial production deployment `dpl_8YRkMVKopNEFmm4Wsu4aKr1hhdVZ` reached `READY` and served the root app and manifest successfully.
- Vercel detected both OpenAI-compatible Functions. With no production secrets configured, the models endpoint failed closed with `503 PROXY_NOT_CONFIGURED` as designed.
- The fixed-upstream Functions are optional personal deployment helpers. Ordinary user profiles continue to call their configured provider URL directly; SchatPhone does not require every user or provider to share the deployment owner's upstream.
- The initial deployment was uploaded from the local dirty working tree, not built from a Git commit. The `main` commit containing this handoff and the deployment files is the first reproducible repository baseline and becomes the source for automatic later builds.
- The first Git-triggered attempt, `dpl_Beje6c7tihkiGEqsEGsPtdUSMmVK`, proved that Vercel cloned commit `e5b1b91` but failed because `.vercelignore` excluded `docs/` while `src/lib/built-in-book-assets.js` imports one tracked Markdown asset from that directory. The corrective baseline keeps `docs/` in the Vercel build source while continuing to exclude tests, reports, caches, and repository metadata.

## Deployment Contract

- GitHub Pages continues to build with `/schatphone/`.
- Vercel builds with `/` and serves the production domain from the root.
- After the reproducible baseline reaches `main`, later updates follow local validation -> commit -> GitHub push -> automatic Vercel deployment.
- No routine manual Vercel upload is required after the Git integration is active.

## AI Proxy Boundary

- `/api/openai/v1/models` and `/api/openai/v1/chat/completions` forward only to one configured HTTPS upstream.
- The server-side upstream key and browser-facing client token are separate.
- Same-origin or explicitly allowed CORS, request-size limits, timeouts, streamed responses, and redacted transport errors are enforced.
- Missing credentials fail closed. This is a personal deployment proxy baseline, not a multi-tenant public AI gateway; it has no account system, per-user rate limit, billing boundary, or abuse-management layer.

## Validation Evidence

- full unit suite: 209 files / 1479 tests passed, including focused proxy coverage;
- lint and governance checks passed;
- normal build retained `/schatphone/` asset paths;
- simulated Vercel build used root `/` asset paths;
- targeted desktop/mobile persistence and complete-backup E2E: 14/14 passed;
- remote Vercel build completed;
- production root and manifest returned `200`;
- both Functions were detected and the unconfigured endpoint returned the expected redacted `503` response.
- the production root was rechecked at `200` on 2026-08-09 while the optional proxy remained fail-closed at `503`.

## Remaining Release Proof

1. Keep the proxy unconfigured while direct provider access is sufficient. If a personal deployment later needs the relay, enter its fixed upstream values through Vercel's Environment Variables UI and prove that optional route separately.
2. Complete installed-PWA/relaunch, backup round-trip, and named true-device evidence separately. GitHub Pages already has one direct configured-provider model, connection, real Chat, and reload-persistence proof; repeat it on Vercel only for origin-specific CORS or PWA evidence.
