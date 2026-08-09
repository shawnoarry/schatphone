# Cloudflare Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- The repository now contains a Cloudflare Worker entry and Wrangler configuration for a third independent root-path deployment.
- One Worker serves the built Vue SPA through Workers Static Assets and reserves `/api/openai/v1/models` plus `/api/openai/v1/chat/completions` for the AI relay before static fallback.
- The proxy core is shared with Vercel and uses Web Platform request/response streams; the Vercel Node response adapter remains separate.
- Local Cloudflare build, focused Worker/proxy tests, and `wrangler deploy --dry-run` pass.
- The Git-connected production Worker is deployed at `https://schatphone.noarry.workers.dev`; the latest verified `main` baseline is commit `a1418ed`.
- The earlier `ced45db` Worker version `79520fe3-c61b-41b6-9e1c-28691b2d0d46` is superseded by the Git-triggered `a1418ed` build.
- Restricted public dynamic mode is live. Direct remains the application default, and different users may explicitly relay their own supported OpenAI-compatible provider settings without operator-per-provider configuration.

## Git Deployment Contract

- Git source: `shawnoarry/schatphone`.
- Production branch: `main`.
- Build command: `npm run build:cloudflare`.
- Deploy command: `npx wrangler deploy`.
- Later authorized pushes to `main` trigger Cloudflare Workers Builds automatically.
- GitHub Pages continues to build with `/schatphone/`; Vercel and Cloudflare build with `/`.

## AI Proxy Boundary

- The Worker exposes only the two fixed OpenAI-compatible route paths and returns JSON `404 NOT_FOUND` for other `/api/*` paths.
- Static routes use the Workers Assets binding with SPA fallback.
- In deployed public mode, each user retains their own public HTTPS OpenAI-compatible URL, provider Key, and model and must explicitly select Compatibility Proxy. Direct remains the default.
- Private/local IP literals, local/internal domains, URL credentials, non-443 targets, redirects, and upstream loops are blocked. Allowed browser origins, a 2 MiB request limit, bounded timeouts, redacted errors, and a best-effort 60 requests/minute per-runtime limiter are enforced.
- Optional token mode keeps the proxy-access token separate from provider authorization; legacy fixed-upstream mode remains compatible.
- These routes are not arbitrary-path forwarders or abuse-proof multi-tenant infrastructure. Non-browser clients can spoof origin/fetch metadata, rate limiting is not globally durable, and DNS rebinding is not completely eliminated.

## Secure Configuration

The deployed public dynamic mode is declared in `wrangler.jsonc` and needs no shared upstream URL or upstream provider Key. Each user's provider values remain in that user's Network profile.

Only when changing to token mode, add this secret through Cloudflare Workers & Pages -> the SchatPhone Worker -> Settings -> Variables and Secrets:

- secret: `SCHATPHONE_AI_PROXY_CLIENT_TOKEN`.

Legacy fixed-upstream compatibility, when deliberately selected, still uses:

- secret: `SCHATPHONE_AI_PROXY_UPSTREAM_KEY`;
- secret: `SCHATPHONE_AI_PROXY_CLIENT_TOKEN`;
- variable: `SCHATPHONE_AI_PROXY_UPSTREAM_URL`;
- variable: `SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS`;
- optional variable: `SCHATPHONE_AI_PROXY_ALLOW_KEYLESS`;
- optional variable: `SCHATPHONE_AI_PROXY_TIMEOUT_MS`.

Do not use a `VITE_` prefix and do not store production values in repository files, build logs, or task messages.

## Local Validation Evidence

- current local focused proxy/Network/AI suite: 5 files / 54 tests passed;
- current local full unit suite: 210 files / 1497 tests passed;
- lint passed;
- normal `/schatphone/` build passed;
- Cloudflare root-path build passed;
- Wrangler 4.120.0 dry run detected the Worker entry and `ASSETS` binding;
- production audit: 0 vulnerabilities;
- full audit: 0 vulnerabilities.

## Online Deployment Evidence

- `/` returns `200 text/html`;
- `/manifest.webmanifest` returns `200 application/manifest+json`;
- a representative hashed JavaScript asset returns `200 text/javascript`;
- `/#/lock` renders the SchatPhone lock screen in a browser;
- a dynamic-target `/api/openai/v1/models` probe from the allowed GitHub Pages origin reached the intended upstream and returned its redacted `401 invalid_api_key` for a dummy credential;
- an unknown `/api/*` route returns JSON `404 NOT_FOUND`.
- a GitHub Pages browser using an existing user-owned provider configuration fetched 6 models and received Chat smoke reply `OK` through the Worker relay;
- public mode required no shared provider variables or secrets.

These online checks prove the restricted dynamic-relay behavior deployed from commit `a1418ed`.

## Remaining Deployment Proof

1. Complete installed-PWA/relaunch, external-protection, backup round-trip, and named true-device evidence separately.
2. Keep Direct as the default and treat the public relay as a restricted compatibility service, not a general URL proxy or abuse-proof backend.
3. Add durable authentication/rate limiting before materially higher-risk or higher-volume exposure; token mode remains available for a controlled deployment.
