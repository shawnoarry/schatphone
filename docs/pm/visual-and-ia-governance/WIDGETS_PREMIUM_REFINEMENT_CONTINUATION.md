# Widgets Premium Refinement Continuation

Updated: 2026-08-12

Purpose: preserve the visual decisions and the next production sequence for the next Widgets refinement session. This is a focused continuation note, not a project roadmap, package status document, or claim that the current candidates are release-ready.

## 1. Decision From This Round

The next Widgets round must prioritize completion quality over catalog breadth.

- Work on one primary widget at a time. Keep at most two later widgets queued for comparison, but do not implement them in parallel.
- A refined animated widget may require a small generated asset package: state backgrounds, foreground and background layers, masks, highlights, textures, or a short loop. Do not force every design into one flattened image.
- Generated bitmap assets carry glass, ceramic, paper, metal, landscape, light, and other material detail.
- Vue owns live text, user media, controls, accessibility, and state presentation.
- CSS or GSAP owns restrained transitions and transform-based motion. Motion is not the visual foundation.
- Pinia and Router own real behavior. Visual code must not invent a second interaction model.
- Each widget has one primary purpose. Replaceable photos may be decorative and do not imply that the whole widget opens Gallery.
- Widget Center and Home must use the same renderer and the same registered Home slot size. Concept-sheet proportions are never authoritative.

The current broad built-in set is a functional exploration baseline. It is not the visual acceptance target, and generated candidates must not be integrated merely because they already exist.

## 2. Production Order

### 1. Weather Prism (`2x2`)

Use Weather Prism as the quality benchmark for the entire collection.

Required visual package:

- sunny and rainy state art with consistent framing;
- separable atmosphere or highlight layers where motion benefits from depth;
- a clean live-data area for location, temperature, and weather condition;
- no baked UI text or fake controls.

Required behavior:

- a natural state crossfade rather than an abrupt image swap;
- subtle depth or light movement that remains convincing when paused;
- reduced-motion fallback;
- identical composition in Widget Center preview and Home.

Do not begin the next widget until the `2x2` Home result has passed a real mobile screenshot review.

### 2. Color Diary (`4x2`)

Treat this as a paper-led visual widget with one selected purpose. The current preferred direction is a compact music-memory surface, but the exact purpose should be reconfirmed after Weather Prism is accepted.

Required visual package:

- paper cover and page texture;
- separate album/photo well rather than a baked image;
- small movable paper details only when they improve depth;
- enough quiet space for live title, artist, progress, and controls.

Required behavior:

- real player state when the music purpose is retained;
- one restrained page, tab, or paper response instead of several competing animations;
- replaceable media remains independent from the widget's primary action.

### 3. Aurora Waveform (`4x1`)

Build this only after the first two components establish the material and interaction standard.

Required visual package:

- a wide background created or cropped specifically for the registered `4x1` slot;
- separate spectrum, mineral, or light layers where useful;
- no stretching of the current non-standard candidate.

Required behavior:

- real playback control and progress;
- a lightweight looping waveform or light response;
- stable text and control geometry while animation is active.

## 3. One-Widget Completion Gate

A widget is complete only when all items below pass together:

1. Its primary purpose and primary action are unambiguous.
2. Its generated asset package is designed for the authoritative slot ratio.
3. Widget Center and Home render the same visual hierarchy.
4. Default, active, loading or unavailable, and reduced-motion states are intentional.
5. Live text, controls, and user media remain HTML/Vue layers rather than baked artwork.
6. Motion uses opacity and transforms where possible and does not cause layout movement.
7. Long bilingual text, compact preview, and mobile Home do not clip or overflow.
8. The component is reviewed at a phone viewport with static and active-state screenshots.
9. Focused tests, lint, build, and relevant visual/E2E checks pass.
10. User visual acceptance is recorded before the next primary widget begins.

## 4. Archived Candidate Materials

The following candidates were uploaded on 2026-08-12 so the next session can inspect them without relying on this workstation. They are references and possible material bases, not accepted runtime assets.

Public image-bed prefix:

`https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/images/ui-assets/widgets/candidates/`

| Candidate | Continuation use |
| --- | --- |
| `weather-prism-sun-v2.webp` | Preferred sunny Weather Prism reference |
| `weather-prism-rain.webp` | Rainy Weather Prism reference |
| `color-diary-paper.webp` | Paper material and layout reference |
| `aurora-wave-surface.webp` | Aurora material reference; ratio must be rebuilt or cropped deliberately |
| `mood-window-ceramic.webp` | Ceramic aperture reference |
| `commute-rail-paper.webp` | Paper rail reference; ratio is non-authoritative |
| `enamel-focus-dial.webp` | Enamel control reference |
| `orbit-calendar.webp` | Calendar center and orbit reference |
| `ambient-scene-day.webp` | Day-state landscape reference |
| `ambient-scene-night.webp` | Night-state landscape reference |
| `memory-wall-paper.webp` | Replaceable photo-well composition reference |
| `world-pulse-city.webp` | Portrait city-surface reference |

`weather-prism-sun.webp` was rejected because it reads as an isolated object in a display case. It was not uploaded as part of this accepted continuation batch.

## 5. Resume Checklist

1. Inspect `git status` and the current `BuiltInWidgetVisual.vue` diff before editing; this worktree may still contain unrelated parallel changes.
2. Open the two Weather Prism candidates from the image bed and decide whether they can be separated into production layers or should be regenerated as a coherent asset package.
3. Define the exact `2x2` safe areas for live data and touch behavior before generating more art.
4. Complete Weather Prism through renderer, interaction, reduced motion, mobile screenshots, and user review.
5. Record the result and the next TODO before beginning Color Diary.

## 6. Deferred TODO

- Do not expand the built-in catalog during this refinement sequence.
- Do not integrate all archived candidates in one pass.
- Reassess simple existing widgets only after the three primary components establish a repeatable quality bar.
- Physical-device shell and return-boundary verification remains a prerequisite for release acceptance, but it is separate from producing the first refined component.
