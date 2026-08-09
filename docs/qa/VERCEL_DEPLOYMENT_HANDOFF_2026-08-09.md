# Vercel Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- Vercel project `shawn-e-s-projects/schatphone` is connected to GitHub repository `shawnoarry/schatphone`.
- Production is available at [https://schatphone.vercel.app](https://schatphone.vercel.app).
- The initial production deployment `dpl_8YRkMVKopNEFmm4Wsu4aKr1hhdVZ` reached `READY` and served the root app and manifest successfully.
- Vercel detected both OpenAI-compatible Functions. The deployed `ced45db` baseline still has no production secrets, so the models endpoint fails closed with `503 PROXY_NOT_CONFIGURED` as designed.
- The current local repository prepares a restricted dynamic relay on those same routes. It is not deployed yet: a fresh authorized push is required before Vercel accepts explicit per-user upstream targets.
- Direct remains the default. After that deployment, each user may explicitly choose Compatibility Proxy while keeping their own public HTTPS OpenAI-compatible URL, provider Key, and model; the owner does not configure one upstream for every user.
- The initial deployment was uploaded from the local dirty working tree, not built from a Git commit. The `main` commit containing this handoff and the deployment files is the first reproducible repository baseline and becomes the source for automatic later builds.
- The first Git-triggered attempt, `dpl_Beje6c7tihkiGEqsEGsPtdUSMmVK`, proved that Vercel cloned commit `e5b1b91` but failed because `.vercelignore` excluded `docs/` while `src/lib/built-in-book-assets.js` imports one tracked Markdown asset from that directory. The corrective baseline keeps `docs/` in the Vercel build source while continuing to exclude tests, reports, caches, and repository metadata.

## Deployment Contract

- GitHub Pages continues to build with `/schatphone/`.
- Vercel builds with `/` and serves the production domain from the root.
- After the reproducible baseline reaches `main`, later updates follow local validation -> commit -> GitHub push -> automatic Vercel deployment.
- No routine manual Vercel upload is required after the Git integration is active.

## AI Proxy Boundary

- `/api/openai/v1/models` and `/api/openai/v1/chat/completions` are the only relay routes; arbitrary paths are not forwarded.
- Dynamic targets must be public HTTPS on port 443. Private/local IP literals, local/internal domains, URL credentials, redirects, and upstream loops are blocked.
- Public mode requires an allowed browser origin or same-origin Fetch Metadata, limits requests to 2 MiB, applies bounded timeouts, redacts transport errors, and uses a best-effort 60 requests/minute per-runtime limiter.
- Optional token mode keeps `X-SchatPhone-Proxy-Token` separate from the user's provider `Authorization`. Network & API exposes that optional proxy token only inside advanced proxy settings.
- Legacy fixed-upstream behavior remains compatible for deployments that deliberately omit the per-request target header.
- This is not abuse-proof multi-tenant infrastructure: origin/fetch metadata can be spoofed outside browsers, the limiter is not globally durable, and DNS rebinding is not completely eliminated.

## Validation Evidence

- current local full unit suite: 210 files / 1497 tests passed, including 54 focused proxy/Network/AI tests;
- lint and governance checks passed;
- normal build retained `/schatphone/` asset paths;
- simulated Vercel build used root `/` asset paths;
- targeted desktop/mobile persistence and complete-backup E2E: 14/14 passed;
- remote Vercel build completed;
- production root and manifest returned `200`;
- both Functions were detected and the unconfigured endpoint returned the expected redacted `503` response.
- the production root was rechecked at `200` on 2026-08-09 while the deployed optional proxy remained fail-closed at `503`;
- the prepared Network proxy journey passes desktop and Pixel 5 Chromium, including direct-default state, explicit disclosure, relay URL/target-header routing, hidden fake credentials, zero horizontal overflow, and zero critical axe violations.

## Remaining Release Proof

1. Obtain fresh push authorization, push the prepared repository commit, and verify that Vercel built that exact commit before claiming the restricted dynamic relay is live.
2. Prove one explicit Compatibility Proxy model-list plus Chat reply on Vercel. Public mode requires no shared upstream URL/key; token mode requires only the separate `SCHATPHONE_AI_PROXY_CLIENT_TOKEN` secret and the matching per-profile Proxy access token.
3. Complete installed-PWA/relaunch, backup round-trip, and named true-device evidence separately. GitHub Pages already has one direct configured-provider model, connection, real Chat, and reload-persistence proof.
