# Shopping Product Photography Batch 0A

Status: 12 low-quality alternatives recorded in a repository-resident candidate package; no accepted selection; Git handoff is pending.

## Scope

- Storefronts: WORKSOUT / `style_cloud`, IKEA Korea / `nordhus_home`, and OLIVE YOUNG / `mellow_care`.
- Products: two representative existing seed products per storefront.
- Candidates: two variants per product, 12 square images in total.
- Purpose: style calibration only. No candidate is accepted, connected to runtime, or treated as final product photography in this batch.
- Excluded: Coupang, 29CM, Kurly, Hero images, collection banners, runtime WebP exports, code integration, and the remaining catalog expansion.

## Generation Contract

- CLI: bundled `image_gen.py generate-batch`.
- Model: `gpt-image-2`; no model downgrade is authorized.
- Request: `requests.jsonl`.
- Requested output: opaque `1024x1024` PNG. The API returned opaque RGB `1254x1254` PNG candidates; untouched responses are retained and no candidate has been silently resized.
- Quality: `low`, because this batch compares unresolved visual directions. Accepted directions require a separate high-quality request.
- Concurrency: at most `5`.
- Inputs: no official product images or catalog records are used as references.

## Visual Capsules

| Storefront | Products | Calibration direction |
| --- | --- | --- |
| WORKSOUT | Neon Cropped Jacket, Cloudline Shoulder Bag | Dark concrete studio, hard directional light, black/charcoal base, restrained yellow or red accents |
| IKEA Korea | HUG Lounge Chair, Moonphase Bedside Lamp | Bright practical room-planning studio, white/pale birch base, cobalt-blue and yellow accents |
| OLIVE YOUNG | Dew 03 Hydration Serum, Mood Tint Soft-Matte Lip Color | Clean white care-lab studio, diffused light, sage and coral accents, visible material texture |

## Acceptance Gate

- [x] All 12 candidates decode as non-empty square RGB PNGs; all returned at `1254x1254` despite the `1024x1024` request.
- [x] Every product remains recognizable at a 160 px square preview.
- [x] The two products within each storefront share lighting, background material, and color logic.
- [x] The three storefronts remain visually distinct without relying on generated text or logos.
- [ ] Product construction is physically plausible and contains no unintended duplicate object.
- [x] No official product, official packaging, logo, brand mark, readable text, price, watermark, or affiliation claim appears.
- [x] `contact-sheet.png` and `contact-sheet-160px.png` record all candidates at equal size for user review.
- [ ] User selects or rejects a direction before any high-quality regeneration or runtime integration.

## Repository Portability And Handoff

- The request, all 12 original PNG alternatives, manifest, hashes, contact sheets, and review notes live under this repository-relative directory.
- No external local reference library or machine-specific absolute path is required to inspect or continue this batch.
- Current handoff state: `PENDING_GIT_COMMIT`. The files are present in this checkout but are not yet committed or pushed, so another machine cannot obtain them from Git yet.
- Do not claim cross-machine availability until the complete directory is committed and pushed through the project's normal Git workflow.
- Any later accepted master or runtime derivative must also be stored in a repository path; documentation must link the repository-relative path rather than a local-library path.

## Non-Binding Local Observations

| Product | Repository alternatives | Local observation |
| --- | --- | --- |
| Neon Cropped Jacket | `jacket-c01`, `jacket-c02` | C01 is a closer editorial crop; C02 has a more centered retail silhouette. |
| Cloudline Shoulder Bag | `bag-c01`, `bag-c02` | C01 has a double-lobed body that needs plausibility review; C02 reads as a simpler curved shoulder bag. |
| HUG Lounge Chair | `chair-c01`, `chair-c02` | C01 makes the structure, cushion, legs, and blue/yellow planning capsule especially clear; C02 remains an alternate composition. |
| Moonphase Bedside Lamp | `lamp-c01`, `lamp-c02` | C01 reads as an opal diffused lamp; C02 leans toward a literal moon-surface novelty object. |
| Dew 03 Hydration Serum | `serum-c01`, `serum-c02` | C01 is a clear single-SKU composition; C02 is a more texture-led composition. |
| Mood Tint Soft-Matte Lip Color | `lip-c01`, `lip-c02` | C01 is a calmer closed-pack composition; C02 foregrounds the applicator and pigment. |

These observations do not rank, select, reject, or accept a candidate. Do not request high-quality versions, export runtime WebP files, or connect any candidate until the user confirms a direction. Named physical-device acceptance is not part of this exploratory batch.
