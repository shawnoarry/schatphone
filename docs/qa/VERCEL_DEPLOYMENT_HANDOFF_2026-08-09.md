# Vercel Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- Vercel project `shawn-e-s-projects/schatphone` is connected to GitHub repository `shawnoarry/schatphone`.
- Production is available at [https://schatphone.vercel.app](https://schatphone.vercel.app).
- The initial production deployment `dpl_8YRkMVKopNEFmm4Wsu4aKr1hhdVZ` reached `READY` and served the root app and manifest successfully.
- Vercel detected both OpenAI-compatible Functions. With no production secrets configured, the models endpoint failed closed with `503 PROXY_NOT_CONFIGURED` as designed.
- The initial deployment was uploaded from the local dirty working tree, not built from a Git commit. The `main` commit containing this handoff and the deployment files is the first reproducible repository baseline and becomes the source for automatic later builds.

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

## Remaining Release Proof

1. Enter the proxy environment values through Vercel's Environment Variables UI and redeploy without exposing either secret in repository files or logs.
2. Configure SchatPhone Network/API with `https://schatphone.vercel.app/api/openai/v1` and the client token, then prove one model/connection test and one real Chat reply.
3. Complete installed-PWA/relaunch, backup round-trip, and named true-device evidence separately.
