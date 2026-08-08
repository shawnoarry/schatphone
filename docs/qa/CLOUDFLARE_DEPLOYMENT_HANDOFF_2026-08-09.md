# Cloudflare Deployment Handoff

Updated: 2026-08-09

## Current Conclusion

- The repository now contains a Cloudflare Worker entry and Wrangler configuration for a third independent root-path deployment.
- One Worker serves the built Vue SPA through Workers Static Assets and handles the fixed `/api/openai/v1/models` and `/api/openai/v1/chat/completions` proxy routes before static fallback.
- The proxy core is shared with Vercel and uses Web Platform request/response streams; the Vercel Node response adapter remains separate.
- Local Cloudflare build, focused Worker/proxy tests, and `wrangler deploy --dry-run` pass.
- The first Git-connected Cloudflare deployment is pending the protected `main` push and Cloudflare dashboard setup. No online Cloudflare URL is claimed yet.

## Git Deployment Contract

- Git source: `shawnoarry/schatphone`.
- Production branch: `main`.
- Build command: `npm run build:cloudflare`.
- Deploy command: `npx wrangler deploy`.
- Later pushes to `main` should trigger Cloudflare Workers Builds after the Git integration is connected.
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

## Remaining Deployment Proof

1. Push the exact reviewed local commits to `origin/main` after explicit authorization.
2. Connect the GitHub repository in Cloudflare Workers Builds and complete the first deployment.
3. Record the resulting `workers.dev` URL and verify root, manifest, route refresh, static assets, and fail-closed API behavior.
4. Configure secrets through the Cloudflare UI, then prove model discovery and one real Chat reply without exposing credentials.
