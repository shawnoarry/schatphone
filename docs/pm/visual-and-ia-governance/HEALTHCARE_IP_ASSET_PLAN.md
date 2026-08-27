# Healthcare IP Asset Plan - 温谈健康 / Ondam Care

Status: `CORE_20_ACCEPTED / FIRST_SCENE_SET_INTEGRATED / OPTIONAL_EXPANSION_ON_DEMAND 2026-08-27`

## 1. Purpose

This plan extends the accepted Ondam Care baby-elephant doctor into a coherent product asset family. It is an asset inventory for the existing Healthcare shell, not a new feature roadmap and not permission to add diagnosis, emergency, prescription, payment, or medical-data behavior.

The first production goal is consistency: Home, App Store, the Healthcare header, and any in-app mascot slot must resolve the same elephant identity before additional poses are introduced. The accepted 20-item core and first scene set are sufficient for the current app; the remaining inventory is an optional expansion pool, not a requirement to keep generating assets.

## 2. Frozen Identity

Every future asset must preserve these master traits:

- warm ivory baby elephant with very large rounded ears;
- slate-blue bib with one rounded warm-ivory medical `+`;
- pale powder-blue environment or a true transparent background;
- widely spaced blue-gray bean eyes without highlights, tiny curved mouth, calm and friendly expression;
- short rounded trunk with enough edge separation to remain legible at small sizes;
- soft, low-contrast dimensional rendering without plastic gloss, hard outlines, busy texture, or realistic anatomy;
- compact proportions and the existing lower-corner composition when the asset is used as an icon or corner character.

The accepted app icon is `shared/app-icons/ondam-care-app-icon-v2.png`. The original V1 remains historical source evidence and must not be silently overwritten.

## 3. App Surface Map

| Existing surface | User need | Recommended IP role |
| --- | --- | --- |
| Home and App Store | Recognize and launch Ondam Care | Square app icon V2 |
| Healthcare header | Maintain identity without consuming space | Small square icon or transparent head crop |
| Discovery hero | Make calm care feel welcoming | Half-body greeting portrait with copy-safe space |
| Search no-result | Recover from an empty query | Thinking elephant with magnifier |
| Institution unavailable | Explain a withdrawn source honestly | Apologetic elephant with muted map pin |
| Appointment overview and empty list | Understand what is scheduled | Elephant holding a calendar card |
| Booking sheet | Support a focused selection flow | Attentive half-body elephant with appointment ticket |
| Booking confirmation | Confirm a local success | Small celebratory full-body pose |
| Reschedule and cancellation | Show changed state without false alarm | Calendar-turn and gentle farewell poses |
| Durable-write error | Explain that nothing was saved | Concerned elephant holding an unchanged folio |
| Report inbox and empty list | Distinguish records from appointments | Elephant holding a report folio |
| Corrected report | Draw attention to a revision | Focused elephant with correction tab, not a warning siren |
| Unavailable report | Communicate fail-closed behavior | Apologetic elephant beside a closed folio |
| Privacy sheet | Reinforce the no-real-health-data boundary | Elephant holding a shield-heart |
| Map handoff | Explain that Map is a reference only | Elephant pointing toward a separate map pin |
| Night theme | Preserve identity on dark surfaces | Same art with an environment-light treatment, not a different character palette |

## 4. Complete Asset Inventory

### 4.1 Brand Masters - 8 assets

| ID | Asset | Format / canvas | Priority |
| --- | --- | --- | --- |
| `HC-BRAND-01` | Accepted square app icon V2 | PNG, 1254 x 1254 | Integrated |
| `HC-BRAND-02` | Transparent head master | RGBA PNG, 2048 x 2048 | P0 |
| `HC-BRAND-03` | Transparent half-body neutral master | RGBA PNG, 2048 x 2048 | P0 |
| `HC-BRAND-04` | Transparent full-body front master | RGBA PNG, 2048 x 2048 | P0 |
| `HC-BRAND-05` | Transparent full-body three-quarter master | RGBA PNG, 2048 x 2048 | P1 |
| `HC-BRAND-06` | Side silhouette and trunk profile | RGBA PNG, 1536 x 1536 | P1 |
| `HC-BRAND-07` | One-color folio seal | SVG plus 1024 PNG | P1 |
| `HC-BRAND-08` | Character construction sheet: front, side, back, palette, proportions | PNG, 2048 square or landscape | P0 source |

### 4.2 Headshots And Expressions - 6 assets

All expression assets use the same head angle, ear proportions, eye spacing, trunk length, and bib edge so they can switch without layout movement.

| ID | Expression | Primary use |
| --- | --- | --- |
| `HC-FACE-01` | Base calm smile | Header, profile, neutral states |
| `HC-FACE-02` | Quiet happiness with squint eyes | Booking success and acknowledged report |
| `HC-FACE-03` | Sleepy-eye soothing smile | Privacy, comfort, and gentle guidance |
| `HC-FACE-04` | Open-mouth joy with one wink | Celebration and strong positive feedback |
| `HC-FACE-05` | Gentle apology with subtle temporary brows | Cancelled, unavailable, or negative state |
| `HC-FACE-06` | Listening or surprise with one enlarged ear | Attention and new-information state |

Expression rules:

- quiet-happiness squint eyes curve as `∩`, while sleepy soothing eyes curve as `∪`;
- eye highlights, pupil direction, and gaze acting are excluded;
- eyebrows are not a permanent character feature and appear only as short, low-contrast face-shadow marks when a negative emotion needs them;
- greeting is an action pose, not a separate headshot expression.

### 4.3 Half-Body And Full-Body Actions - 10 assets

| ID | Action | Primary use |
| --- | --- | --- |
| `HC-ACTION-01` | Small wave | Welcome and first entry |
| `HC-ACTION-02` | Pointing to the side | Hero copy or next-step guidance |
| `HC-ACTION-03` | Holding a folio clipboard with a neck stethoscope | General Healthcare records |
| `HC-ACTION-04` | Holding a calendar card with the day number `12` | Appointments |
| `HC-ACTION-05` | Reading a report sheet with small round glasses | Report inbox and detail |
| `HC-ACTION-06` | Looking through a magnifier | Discovery search |
| `HC-ACTION-07` | Holding a privacy shield | Privacy sheet |
| `HC-ACTION-08` | Pointing toward a map pin | Map reference handoff |
| `HC-ACTION-09` | Two-feet celebration | Successful local booking |
| `HC-ACTION-10` | Seated comforting pose | Counseling and gentle guidance |

### 4.4 Prop Library - 10 assets

Props must remain secondary and use the Healthcare palette. Prose is excluded; the approved calendar card may use the day number `12` so it reads immediately as a calendar.

| ID | Prop | Notes |
| --- | --- | --- |
| `HC-PROP-01` | Slate bib with rounded `+` | Frozen master garment |
| `HC-PROP-02` | Soft stethoscope | Optional, never required for every portrait |
| `HC-PROP-03` | Clipped folio board | Matches the shell's folio-corner language |
| `HC-PROP-04` | Appointment ticket | No date, number, or fake confirmation text |
| `HC-PROP-05` | Calendar card | Two binding tabs and the approved day number `12` |
| `HC-PROP-06` | Report sheet | Abstract rows and correction tab only |
| `HC-PROP-07` | Rounded magnifier | Discovery and no-result recovery |
| `HC-PROP-08` | Shield-heart | Privacy boundary |
| `HC-PROP-09` | Muted map pin | Read-only Map reference |
| `HC-PROP-10` | Small care bag | General care only; no pills, syringe, blood, or prescription label |

### 4.5 Product-State Illustrations - 12 assets

| ID | Illustration | Target slot |
| --- | --- | --- |
| `HC-STATE-01` | Welcome half-body hero | Discovery hero |
| `HC-STATE-02` | Thinking with magnifier | Search no-result |
| `HC-STATE-03` | Apology with withdrawn pin | Institution unavailable |
| `HC-STATE-04` | Waiting with calendar | Appointment empty state |
| `HC-STATE-05` | Attentive with ticket | Booking sheet intro |
| `HC-STATE-06` | Celebrating with calendar check | Booking confirmed |
| `HC-STATE-07` | Turning a calendar page | Rescheduled appointment |
| `HC-STATE-08` | Gentle farewell with closed ticket | Cancelled appointment |
| `HC-STATE-09` | Concerned with unchanged folio | Durable-write error |
| `HC-STATE-10` | Reading an empty folio | Report inbox empty state |
| `HC-STATE-11` | Focused with correction tab | Corrected report |
| `HC-STATE-12` | Closed folio and apology | Unavailable report |

### 4.6 Small Elements And Alternate Treatments - 10 assets

These are supporting marks, not alternate mascot identities.

| ID | Treatment | Use |
| --- | --- | --- |
| `HC-MICRO-01` | Soft-3D head crop | 64-128 px account/service avatar |
| `HC-MICRO-02` | Flat sticker head | Compact chips, tips, or optional notification art |
| `HC-MICRO-03` | One-color folio stamp | Report seal and authored-record motif |
| `HC-MICRO-04` | Rounded medical `+` | Brand punctuation and status decoration |
| `HC-MICRO-05` | Trunk-heart curve | Dividers or subtle loading ornament |
| `HC-MICRO-06` | Elephant-ear page corner | Folio corner decoration |
| `HC-MICRO-07` | Two rounded footprints | Progress or empty-state trail |
| `HC-MICRO-08` | Pulse ribbon | Appointment/report separator |
| `HC-MICRO-09` | Success, note, unavailable mini badges | Three semantic state marks |
| `HC-MICRO-10` | Night environment-light preview | Review aid for dark surfaces |

The maximal optional family is 56 deliverables: 8 brand masters, 6 expressions, 10 actions, 10 props, 12 product-state illustrations, and 10 supporting treatments. Only assets tied to a real screen need to be produced.

Accepted production assets as of 2026-08-27:

- the neutral head, neutral half-body, and front full-body masters are accepted under `output/imagegen/healthcare-ip/p0/`;
- the five approved expression variants are accepted under `output/imagegen/healthcare-ip/p0/expressions/`, alongside the neutral head master;
- all ten action assets, `HC-ACTION-01` through `HC-ACTION-10`, are accepted under `output/imagegen/healthcare-ip/p0/actions/`; generated sources remain archived under `actions/drafts/`;
- the five runtime UI images for the welcome hero, appointment page, report page, privacy sheet, and search no-result state are published under `healthcare/ip/` and integrated into the existing Healthcare shell;
- generated sources and rejected versions remain historical evidence under each asset family's `drafts/` directory.

## 5. Production Order

### P0 - First usable in-app set

1. `HC-BRAND-02`, `HC-BRAND-03`, `HC-BRAND-04`, and `HC-BRAND-08`.
2. `HC-STATE-01`, `HC-STATE-02`, `HC-STATE-04`, `HC-STATE-05`, `HC-STATE-06`, `HC-STATE-10`, `HC-STATE-11`, and `HC-STATE-12`.
3. Transparent and pale-blue-background exports for every P0 character asset.

### Optional P1 - Workflow coverage on demand

Produce only the unavailable/error state, prop, seal, or handoff art required by an approved screen change.

### Optional P2 - Brand depth

Sticker heads, folio stamps, micro ornaments, optional merchandising previews, and presentation sheets remain shelved until a real surface needs them. P2 does not authorize new product surfaces.

## 6. Export And Naming Rules

- Runtime names use `ondam-care-elephant-<role>-v<version>.png` or `.webp`.
- Source masters remain lossless RGBA PNG; runtime WebP is allowed only after visual comparison.
- Character cutouts must have genuine transparency, not a checkerboard or painted background.
- Square icons must be reviewed at 32, 48, 64, 128, and 512 px.
- Hero/state art must reserve copy-safe space according to the actual desktop and simulated Pixel 5 composition.
- Do not bake Chinese or English UI copy into the artwork.
- Day/night should reuse the same character master whenever possible; use CSS/environment treatment before duplicating raster art.

## 7. Safety And Product Boundaries

Do not depict diagnosis, medicine recommendations, prescriptions, injections, blood, surgery, emergency response, insurance approval, payment success, or real medical records. A character illustration may explain a local preview state, but it must never imply that Healthcare produced a real clinical fact or completed another owner's action.

## 8. Acceptance Gate

Each production batch must prove:

- recognizable continuity with the accepted V2 icon;
- stable face, trunk, ears, bib, `+`, and palette across assets;
- legibility at the target slot size;
- no prose, watermark, accidental extra symbols, or medical overclaim; the approved calendar day number `12` is allowed;
- correct day/night contrast and no overlap with copy or controls;
- desktop and simulated Pixel 5 screenshots for every integrated state;
- original source, runtime export, prompt/edit record, dimensions, and hash are retained through the project asset pipeline.
