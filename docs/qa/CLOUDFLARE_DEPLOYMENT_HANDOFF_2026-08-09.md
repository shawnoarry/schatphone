# Cloudflare Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- The repository now contains a Cloudflare Worker entry and Wrangler configuration for a third independent root-path deployment.
- One Worker serves the built Vue SPA through Workers Static Assets and handles the fixed `/api/openai/v1/models` and `/api/openai/v1/chat/completions` proxy routes before static fallback.
- The proxy core is shared with Vercel and uses Web Platform request/response streams; the Vercel Node response adapter remains separate.
- Local Cloudflare build, focused Worker/proxy tests, and `wrangler deploy --dry-run` pass.
- The Git-connected production Worker is deployed at `https://schatphone.noarry.workers.dev` from `main` commit `25b5329`.
- Cloudflare Workers Build `00ebb7df` completed successfully with Worker version `4f524e75-aed3-498a-bdf1-f9d07ce4954d`.

## Git Deployment Contract

- Git source: `shawnoarry/schatphone`.
- Production branch: `main`.
- Build command: `npm run build:cloudflare`.
- Deploy command: `npx wrangler deploy`.
- Later authorized pushes to `main` trigger Cloudflare Workers Builds automatically.
- GitHub Pages continues to build with `/schatphone/`; Vercel and Cloudflare build with `/`.

## AI Proxy Boundary

- The Worker exposes only the two fixed OpenAI-compatible routes and returns JSON `404 NOT_FOUND` for other `/api/*` paths.
- Static routes use the Workers Assets binding with SPA fallback.
- Missing client-token configuration fails closed with `503 PROXY_NOT_CONFIGURED`.
- Same-origin or explicitly allowed CORS, a 2 MiB request limit, bounded timeouts, streamed responses, upstream-loop rejection, and redacted transport errors remain enforced.
- The browser-facing client token is separate from the server-only upstream provider key.

## Secure Configuration

Enter production values only through Cloudflare Workers & Pages -> the SchatPhone Worker -> Settings -> Variables and Secrets:

- secret: `SCHATPHONE_AI_PROXY_UPSTREAM_KEY`;
- secret: `SCHATPHONE_AI_PROXY_CLIENT_TOKEN`;
- variable: `SCHATPHONE_AI_PROXY_UPSTREAM_URL`;
- variable: `SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS`;
- optional variable: `SCHATPHONE_AI_PROXY_ALLOW_KEYLESS`;
- optional variable: `SCHATPHONE_AI_PROXY_TIMEOUT_MS`.

Do not use a `VITE_` prefix and do not store production values in repository files, build logs, or task messages.

## Local Validation Evidence

- focused proxy/Worker suite: 2 files / 11 tests passed;
- full unit suite: 210 files / 1483 tests passed;
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
- `/api/openai/v1/models` returns `503 PROXY_NOT_CONFIGURED` while production credentials are absent;
- an unknown `/api/*` route returns JSON `404 NOT_FOUND`.

## Remaining Deployment Proof

1. Configure production variables and secrets through the Cloudflare UI without exposing credentials.
2. Prove model discovery and one real Chat reply through the Cloudflare same-origin proxy.
