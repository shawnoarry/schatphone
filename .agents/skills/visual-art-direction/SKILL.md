---
name: visual-art-direction
description: Start SchatPhone UI beautification, redesign, brand, motion, 3D/spatial, or immersive visual work with current product references and a product-specific art direction. Use when a user-facing surface should become more distinctive, polished, branded, animated, spatial, or emotionally expressive; skip pure IA diagnosis and pixel-faithful screenshot reproduction.
---

# Visual Art Direction

Turn a visual request into a compact reference-backed direction before implementation. This skill supports the project visual workflow; it does not replace product, package, roadmap, or design-contract authority.

## Read First

Follow `docs/process/VISUAL_WORKFLOW.md`, then read only the owning visual/product contracts needed for the surface. Determine visual ownership from the user entry path and parent context before selecting a style.

## Reference Kickoff

For every beautification, redesign, visual-identity, motion, spatial, or 3D task:

1. Identify the surface, user entry, primary task, product role, visual owner, and behavior that must remain unchanged.
2. Gather three to five current references before implementation:
   - at least two direct same-category products when credible examples exist;
   - one adjacent product with a useful interaction, material, motion, spatial, or brand idea;
   - project-owned accepted work when it is more relevant than a public example.
3. Return a compact reference pack containing the source, relevant surface/state, one or two principles worth adapting, what must not be copied, and why it fits SchatPhone.
4. Treat user-provided examples as evidence about desired qualities, not as a template or automatic winner.

Prefer current official product pages, accessible live products, reviewed screenshots, and the project's existing reference/design documents. Use public references to extract principles; never copy brand assets, trade dress, proprietary media, or business claims.

If the user authorized direct implementation, show the compact reference kickoff and continue unless the references reveal a material product fork. Do not create a ceremonial approval pause for low-risk choices.

## UI/UX Evidence Baseline

Run one bounded project-local `ui-ux-pro-max` query near the start of the task. From the repository root:

```powershell
python .agents/skills/ui-ux-pro-max/scripts/search.py "<product type> <audience> <visual thesis>" --design-system -p "SchatPhone"
```

Use targeted `--domain` or `--stack vue|threejs` queries only when they resolve a real decision. Do not use `--persist`; existing `docs/design/*` files remain the design authority. Treat the result as evidence to critique, not a style prescription.

## Direction Contract

Before implementation, define:

- a two-to-four-word visual thesis;
- the first-viewport content anchor and primary action;
- brand grammar: palette proportions, typography roles, geometry, material/depth, imagery, icon, and recurring motif;
- motion language: purpose, transition families, timing scale, easing character, stagger rhythm, interaction feedback, and reduced-motion behavior;
- spatial/3D plan when relevant: product reason, depth layers, camera, lighting, materials, interaction model, performance budget, static fallback, and device boundary;
- the required asset plan and which assets need a separate candidate-review round;
- one bounded delight opportunity, or an explicit reason to remain restrained.

Motion, 3D, and branding must express product meaning rather than decorate an otherwise generic layout. High-frequency or consequential actions keep predictable controls even when the surrounding experience is expressive.

## Specialist Routing

After the baseline reference and `ui-ux-pro-max` lookup, load only the smallest specialist set required:

- existing-surface audit and focused improvement: `redesign-existing-projects`;
- broad new visual composition or major rebuild: `frontend-design`;
- motion implementation: the relevant GSAP topic plus `gsap-frameworks`, adding timeline, plugins, or performance guidance only when needed;
- spatial/3D uncertainty: prove the scene or interaction with the smallest disposable prototype before production; prefer CSS depth for simple layers and Three.js only for a real scene/camera/material need;
- brand or art assets: use the approved image/logo workflow in a separate focused candidate round when visual judgment is material.

The baseline pair is `visual-art-direction` plus `ui-ux-pro-max`; add at most one implementation-specialist family unless the user explicitly authorizes a broader exploration round.

## Quality Boundaries

- Preserve product behavior, visual ownership, and existing accepted brand contracts.
- Do not turn every surface into an Awwwards landing page, glass scene, 3D toy, or continuous scroll performance.
- Do not add a runtime dependency merely because a skill recommends a technique.
- Keep static hierarchy complete without animation or 3D.
- Respect keyboard, touch, contrast, reduced-motion, loading, failure, and low-performance fallbacks.
- Keep rejected references and generated candidates out of runtime assets.
