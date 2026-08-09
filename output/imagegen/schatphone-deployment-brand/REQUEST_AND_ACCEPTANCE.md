# SchatPhone Deployment Brand Assets

Updated: 2026-08-10

## Scope

Create one recognizable SchatPhone brand family with distinct deployment variants:

- GitHub Pages: light blue/mint phone-and-chat mark with a GitHub corner badge;
- Vercel: pastel mascot phone mark with a Vercel corner badge;
- Cloudflare: high-impact black/pink phone-and-chat mark with a Cloudflare corner badge.

The deployment badge is intentionally subordinate to the SchatPhone mark. Runtime
icons contain no wordmark or slogan so they remain legible at small sizes. Full
lockups retain the exact `Schat` wordmark; the Vercel lockup removes the Chinese
tagline from the supplied reference.

## Generation

- Mode: local `codex-image` CLI because built-in image generation was unavailable.
- Service/model: configured OpenAI-compatible Images API with `gpt-image-2`.
- Inputs: selected references from `H:/SchatPhone/美化包/logo/`.
- Standard masters: `github-master.png`, `vercel-master.png`, and
  `cloudflare-master.png`.
- Accepted maskable masters: `github-maskable-master.png`,
  `vercel-maskable-master-final.png`, and `cloudflare-maskable-master.png`.
- Full lockups: `github-lockup.png`, `vercel-lockup.png`, and
  `cloudflare-lockup.png`.
- Runtime exports: `public/icons/brands/<brand>/`.

Prompt direction for each standard icon was: preserve the selected reference's
phone/chat identity and 3D material; remove all text and nonessential decoration;
use a full-bleed square composition; add one small bottom-right platform badge;
keep the SchatPhone symbol dominant and readable at 32 px.

Prompt direction for each maskable icon was: preserve the accepted standard
artwork; keep the background full bleed; move all meaningful content, including
the platform badge, into the central mask-safe circle; add no inset frame or text.

Prompt direction for each lockup was: preserve the supplied composition and exact
`Schat` wordmark; replace one corner decoration with the deployment badge; add no
new copy. The Vercel request additionally removed all Chinese tagline text and
reconstructed the white background.

## Acceptance

- All accepted masters are square `1024x1024` PNG files.
- GitHub, Vercel, and Cloudflare are distinguishable by both palette and corner badge.
- Standard runtime exports exist at `32`, `180`, `192`, and `512` px.
- Dedicated `512x512` maskable exports retain the full SchatPhone mark and badge
  inside the central safe area without an inset-card artifact.
- The full lockups contain the correct `Schat` spelling and no Chinese tagline.
- GitHub is the local/default fallback; platform builds replace canonical PWA files
  from their matching brand directory.
