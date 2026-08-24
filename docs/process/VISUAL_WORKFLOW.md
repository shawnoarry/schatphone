# SchatPhone Visual Workflow

Updated: 2026-08-15

This document defines the `视觉专项` workflow.

Use it when the team is discussing or implementing:

- UI polish;
- visual design;
- interaction feel;
- layout refinement;
- motion;
- typography;
- color;
- product-grade surface quality;
- information architecture cleanup for visible frontend surfaces.

This workflow is separate from the main feature-progress track.

## 1. Entry And User Burden

Any request to create, redesign, polish, or materially change a visible UI belongs to this workflow even when the user does not say `视觉专项`. The phrase is an explicit routing shortcut, not an obligation:

```text
视觉专项
```

Recommended variants:

```text
视觉专项：先审查，不改代码
视觉专项：直接改 Home / Lock / Appearance
视觉专项：只做设计规范，不推进功能
视觉专项：原型检索，只提供参考包和适配建议
视觉专项：参考 awesome-design-md，整理 SchatPhone 自己的 DESIGN.md
```

When this phrase appears, the assistant should treat the task as design-focused workflow work, not as a feature-roadmap task.

The user may provide only a desired feature, an impression, a concern, a reference, or a vague wish for the result to feel surprising and complete. That is valid intake. The assistant owns the work of reading the relevant product evidence, inferring the missing design decisions, and turning the request into a coherent presentation plan.

Do not require the user to complete a design questionnaire, select tools, name a style, or understand Product Design, Figma, Pencil, image generation, motion libraries, or frontend implementation details. Ask only when a missing choice would materially change product meaning, consent, likeness, licensing, destructive behavior, or the accepted scope. A single reference or liked surface is evidence about one or more qualities; it is not automatically the best example, a reusable template, or a new project rule.

## 2. Scope Boundary

`视觉专项` may change files that directly affect visual quality and interaction feel:

- global styles and tokens:
  - `src/style.css`
- shell surfaces:
  - `src/App.vue`
  - `src/views/LockScreen.vue`
  - `src/views/HomeView.vue`
- appearance and customization:
  - `src/views/AppearanceView.vue`
  - `src/views/WidgetsView.vue`
- settings presentation:
  - `src/views/SettingsView.vue`
  - `src/components/settings/*`
- shared visual components:
  - `src/components/*`
- module surfaces only when the requested polish requires it;
- project visual docs such as `docs/design/DESIGN.md` or `docs/design/*`.

`视觉专项` should avoid:

- starting new product feature tracks;
- expanding Chat, Map, Calendar, Push, backup, or storage behavior unless the change is a small design-supporting adjustment;
- large business-logic refactors;
- roadmap status changes for routine cosmetic polish. If the visual work changes IA, ownership, active scope, or priority, sync the visual package handoff and PM/roadmap docs through `docs/process/AI_WORK_MODE.md`.

If a visual change needs functional code, keep the change minimal and explain why it is needed.

## 3. Default Working Rules

1. Preserve current product behavior unless the user explicitly asks for interaction changes.
2. Prefer design-system consistency over one-off styling.
3. Work in the shortest coherent loop: understand the product task, define the target, implement, and verify. Add a separate audit or exploration round only when it resolves material uncertainty.
4. Do not copy another brand directly. Use references to extract principles, then create SchatPhone-specific rules.
5. Keep the virtual-phone identity central: lock screen, Home, notifications, app icons, and Settings should feel like one coherent device.
6. Favor stable, tactile, system-like UI over marketing-page composition.
7. Avoid turning operational screens into decorative landing pages.
8. When adding motion, keep it short, useful, and respectful of reduced-motion preferences.
9. Determine visual ownership from the user's entry path and parent context before looking at code ownership or data ownership.
10. Do not restyle an in-app surface as a system page merely because it reads system/shared data.
11. Audit all visible frontend copy during visual work. Developer comments, implementation notes, TODO text, debug labels, route names, store names, and temporary explanations must not appear in rendered UI.
12. For Home widget customization, prefer the visible Widgets entry over hidden gestures.
13. When working on themes, review `default` and `zen` together as a native-system day/night pair.
14. On native-system surfaces, replace raw utility backgrounds and hardcoded semantic colors with system tokens unless the element is app-owned, media/content preview, or user-authored widget/template content.
15. Dark-theme approval requires checking panels, forms, list rows, dialogs, hover/active states, disabled states, and teleported overlays for contrast and background completeness.
16. Return controls must name their actual target layer (`Home`, `Settings`, `Chat`, `Map`, etc.). Avoid ambiguous `Back` labels when a route can be reached from multiple parents.
17. Widget Center must stay a library/import/create surface. Placement belongs to Home widget edit mode and should use same-size slot replacement, not screen-number selectors.
18. New or changed navigation must preserve Home-page return context. Follow `docs/process/NAVIGATION_RETURN_CONTRACT.md`.
19. Home edit mode should default to visible slots, not persistent picker panels. Template selection and the unplaced-content library should open only on explicit user request so the target slots remain visible.
20. Opening the Home content library is not the same as selecting a content item. Keep the unselected state explicit, and light compatible slots only after the user chooses a specific app, folder, built-in widget, or custom widget.
21. Use product-facing names in both discussion and rendered UI. Do not describe implementation-only layers as user-visible apps. For Home work, use terms such as Home desktop, app entries, entry groups, widgets, and screen slots; reserve "folder" for a real user-editable folder system.
22. Settings-owned WorldBook management should use state-first progressive disclosure: overview first, then focused panels for sources, pack, kernel, templates, and knowledge. Source picking, version review, knowledge creation/editing, import/export confirmation, and other execution steps should use dialogs, sheets, drawers, or dedicated subpages instead of indefinitely extending the same Settings screen.
23. Widget Center should stay scan-first on phone-sized screens. Keep library, starter templates, and saved widgets visible as the main page; open custom code editing and import JSON entry as focused sheets or equivalent execution panels.
24. Appearance-owned controls should keep state and preview visible first. Inputs that feel like execution work, such as wallpaper-source picking, advanced CSS editing, custom font-stack editing, or per-app icon/accent edits, should use sheets/drawers/subpages on phone-sized screens instead of extending the main settings scroll.
25. World Pack activation/review stays in Settings -> WorldBook, but active-pack effects should not remain Settings-only. World app entries can appear in App Store/Home/App Library as launch context. Target apps should only change their own UI/UX when the binding includes an explicit app UI theme package; otherwise the launched app keeps its original interface and defaults.
26. User customization sits above World Pack visual defaults. App/world-app visual scope should use stable shell data attributes such as `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` instead of utility classes, data-testid hooks, or generated DOM structure. Persisted scoped CSS remains runtime-compatible, but the current global Appearance surface does not author or export app-owned layers. Global Appearance packs carry global portable settings only; app icons, app skins, scoped CSS, Home layout/widgets, and Chat appearance remain with their owners.
27. Match expressive complexity to the product role. A supporting utility can be complete through clear depth, real content, appropriate imagery, and restrained feedback; an emotionally central, embodied, narrative, spatial, or exploratory experience may require direct manipulation, scene motion, dynamic media, sound, haptics, or a more deliberate interaction rhythm.
28. Product-grade does not mean uniformly elaborate. Simplicity is valid when it is an intentional response to the task; it is not valid when hierarchy, content, assets, states, or interaction were skipped.
29. Look for one bounded opportunity for delight, character, or tactile clarity when it supports the task. Do not force novelty into high-frequency, high-risk, or operational actions where predictability matters more.
30. Treat user examples as clues about completion, hierarchy, mood, material, content, or interaction. Extract the relevant qualities and re-evaluate them against the current surface instead of cloning the example's composition or complexity.

## 4. Product-Grade UI Gate

The first accepted implementation of a visible surface should already aim at the product target. Do not plan a generic functional page now and defer hierarchy, content presentation, assets, states, and identity to repeated cleanup rounds unless the user explicitly requests a wireframe or temporary scaffold.

### 4.1 Design Intake Gate

Before editing UI code, record or infer the following:

```text
Target surface and user entry:
Primary user task:
Product role and importance in the larger journey:
Experience promise: what the user should understand, feel, or be able to do:
Behavior that must remain unchanged:
Visual owner:
Visual thesis in 2-4 words:
Information-depth map (L0/L1/L2/L3):
Required state matrix:
Control and icon plan:
Content and direct-presentation plan: what should be shown rather than explained:
Palette/material/background/media/motion/sensory plan:
Expressive-complexity decision and product reason:
Mobile and wide-viewport composition:
Reference and asset plan:
Bounded delight opportunity, or an explicit reason to stay strictly utilitarian:
Smallest product-complete slice:
```

This is an assistant-owned reasoning artifact, not a form the user must fill in. For a bounded implementation, keep it internal or summarize it in a few sentences while proceeding. Show a compact direction playback and pause only when a real product fork needs user choice, when the user requested exploration, or when the work would authorize a materially different interaction model or visual identity.

Do not start from a component template and invent the product meaning afterward. A reference or template may support the plan, but the current feature contract decides the hierarchy and content.

### 4.1.1 Product Role And Experience Calibration

Choose presentation effort from the current product task, not from a global preference for either minimalism or spectacle. Consider, without turning this into a numeric score:

- how central the surface is to the promised product experience;
- whether the user is scanning, managing, deciding, executing, exploring, relating, or inhabiting a scene;
- frequency, time pressure, reversibility, and consequence of the action;
- emotional, narrative, spatial, or sensory importance;
- content richness and whether real people, places, products, collections, journeys, or atmosphere should be visible;
- the number of states, gestures, transitions, and cross-module handoffs the user must understand;
- whether direct manipulation or ambient response communicates meaning better than controls and explanation.

Then state the product reason for the chosen treatment:

- restrained surfaces should still have deliberate composition, real content, appropriate assets, complete states, and polished feedback;
- expressive or immersive surfaces may use layered scenes, dynamic backgrounds, touch regions, continuous gestures, character or environment response, sound, haptics, and choreographed motion when those are part of the product value;
- high-risk and high-frequency execution paths should keep controls predictable even when the surrounding experience is expressive;
- visible complexity must earn its place by improving comprehension, agency, identity, emotion, or continuity.

Before implementation, answer three outcome questions: what should be understood in the first viewport, what should be experienced instead of described, and what detail would make this surface feel intentionally made for its product role.

### 4.2 User-Facing Information Gate

For every visible sentence, ask which user need it serves:

- identify the current state;
- explain a meaningful consequence or boundary;
- help the user choose or act;
- explain an error and recovery;
- provide content the user came to consume.

Remove or move out of the user surface any copy whose main purpose is to narrate construction, implementation ownership, architecture, storage, data flow, development status, future work, or internal limitations. Replace explanations with actual state presentation, controls, progressive disclosure, or visual media where possible.

Short helper text is appropriate when it prevents a real mistake. It must not compensate for weak hierarchy, missing feedback, an absent visual, or an unclear control.

### 4.3 Hierarchy And Container Gate

Map the visible feature to information depth before choosing containers:

- `L0 Overview`: immediate state, summary, and at most one-step deterministic actions;
- `L1 Focus`: selected-item detail that preserves the current context, usually a sheet, drawer, or expansion;
- `L2 Manage`: searching, filtering, full history, CRUD, configuration, or batch work in a focused subpage/full page;
- `L3 Execute`: multi-step creation, AI-assisted work, checkout, transfer, or another dedicated execution flow.

Container rules:

- use inline controls for small, local, reversible changes;
- use a sheet/drawer when the user must retain or compare the parent context;
- use a modal only for a short blocking decision or confirmation;
- use a subpage or route for complex management, authoring, or multi-step execution;
- keep destructive actions out of the primary scan path unless danger management is the page's explicit purpose.

A single long page containing overview, editing, diagnostics, history, destructive actions, and advanced configuration fails this gate even when every feature is technically reachable.

### 4.4 Control And Icon Gate

Run a control audit before acceptance:

- familiar navigation and tool actions should use familiar icons when one exists;
- compact toolbars should not become rows of text buttons;
- primary or unfamiliar commands may use icon-plus-text;
- text-only buttons are appropriate when the command is abstract, legally consequential, destructive, or not represented by a broadly understood symbol;
- icon-only controls require accessible names, stable hit areas, focus states, and tooltips for unfamiliar symbols;
- color alone must not communicate selection, status, or destructive meaning.

Do not replace understandable product language with cryptic icons merely to reduce text. The target is semantic control design, not icon count.

### 4.5 Visual Richness Gate

Every visual plan must explicitly decide:

1. palette and semantic accent use;
2. surface material and edge treatment;
3. background, wallpaper, illustration, photography, map, artwork, texture, or an intentional no-image treatment;
4. depth hierarchy through spacing, contrast, border, shadow, blur, or highlight;
5. interaction states and motion for navigation, selection, loading, success, failure, reveal, and dismissal.

`None` is a valid decision only when the module role supports a restrained treatment. It must not be the automatic result of missing design effort. The static composition must remain legible without effects, while material and motion should make state and ownership clearer.

For a content-rich or identity-bearing installed-app surface, simultaneously omitting a visual anchor/background or media treatment, meaningful material differentiation, and useful interaction motion fails this gate unless the user explicitly requests a utilitarian treatment.

### 4.6 Distinctness And Template Gate

Shared components should standardize behavior, accessibility, metrics, and system mechanics. They must not force every installed app into the same page composition.

Before reusing a page template, state:

- which mechanics should remain shared;
- which content hierarchy is unique;
- which visual anchor identifies this module;
- how the interaction rhythm differs from sibling modules;
- why reuse serves the product rather than implementation convenience.

Changing only labels, accent color, and icon does not create a distinct installed-app identity. At least the content emphasis, spatial composition, media treatment, or key interaction pattern must respond to the module's function when a bespoke identity is warranted.

### 4.7 Visual Asset And Image-Generation Gate

Before replacing a visual subject with explanatory copy, decide whether the interface should show it directly. This applies especially to people, places, products, food, album art, journeys, collections, campaigns, atmospheres, and illustrated states.

Use this source order:

1. reviewed project assets;
2. the confirmed local reference/asset library;
3. user-selected or user-provided material;
4. license-compatible external sources;
5. generated candidate imagery.

When suitable assets are missing and the design depends on them, proactively tell the user what visual slots are missing and propose concrete selection or generation options. Do not silently finalize a text-heavy substitute.

When the user has already authorized visual implementation and the missing candidate can be generated safely within the accepted art direction, proceed with a focused generation round after stating that decision. Ask for a choice first only when subject matter, likeness, brand direction, licensing, or style would materially change the product result.

When image generation is selected:

- define subject, composition, aspect ratio, crop-safe region, palette, lighting/material, locale, and intended UI placement before generation;
- generate candidates before wiring them into production;
- review semantic match, legibility at rendered size, crop behavior, artifacts, embedded text, and style consistency;
- keep rejected candidates out of runtime assets;
- treat generated imagery as a visual candidate, not automatic product approval.

If asset generation requires non-trivial visual judgment, run it as a focused asset round so the UI implementation round can use an approved asset contract without chaining multiple visual specialists.

### 4.8 Acceptance Gate

Unless the user explicitly requested a rough prototype, do not describe a surface as visually complete while any of these remain unresolved:

- the product role, experience promise, or reason for the chosen expressive complexity is unclear;
- the first read and primary action are unclear;
- construction or diagnostic narration dominates user content;
- information depth is flattened into one page;
- conventional tools are rendered as excessive text buttons;
- palette, material, background/media, depth, or motion were never considered;
- sibling modules reuse the same composition without a product reason;
- a visually dependent surface lacks an asset plan;
- only the happy/default state has been designed;
- a scene, object, person, place, collection, status, or interaction central to the experience is explained rather than presented, or decorative complexity interferes with a frequent or consequential task;
- mobile is a squeezed desktop or wide desktop is a stretched phone page;
- visible copy, accessibility, overflow, or theme evidence is missing.

## 5. Work Path And Reference Discovery

Choose the shortest path that can still produce a confident product result. Lack of a prototype, Figma file, or detailed visual brief is not by itself a reason to stop or start a long discovery process.

### 5.1 Direct Product Path

This is the default for a bounded UI task. Infer the design intake from repository evidence and the user's request, inspect only the relevant existing implementation, make a focused reference or local-skill lookup only when it resolves a real decision, source or generate clearly needed assets, implement the product-complete slice, and inspect it in the browser. Do not pause for ceremonial approval of low-risk design choices.

### 5.2 Direction Exploration Path

Use this path when the surface has no credible visual target and multiple directions would materially change identity, hierarchy, or interaction. Use at most three meaningfully different candidates. Product Design and CLI image generation may coordinate this exploration without requiring Figma or Pencil. Pause for selection only at the consequential fork; after selection, return to implementation rather than repeating the entire intake.

### 5.3 Experience Prototype Path

Use this path when the core product value depends on a novel gesture, direct manipulation, spatial scene, dynamic background, character/environment response, continuous motion, sound, haptics, or another interaction whose feel cannot be judged from static screens. Build the smallest disposable prototype that proves the uncertain experience, then promote only the accepted behavior and visual contract into production work.

### 5.4 Explicit Reference Discovery

Use this stage when the user asks for references, when adaptation of an external example is central to the request, or when missing evidence creates a material product/design ambiguity.

Trigger phrase:

```text
视觉专项：原型检索
```

The request may include:

```text
Target module or surface:
Primary user task:
Entry path:
Behavior and ownership that must remain:
Preferred or excluded styles:
Reference-only or implementation-authorized:
```

Missing fields should first be inferred from repository evidence. Ask the user only when a missing choice would materially change the product direction.

### 5.5 Search Order

Prefer sources in this order:

1. real shipped flows and public product evidence: App Store, Google Play, product sites, public walkthroughs, and free real-screen libraries;
2. editable community prototypes and UI kits: Figma Community, Pixso, MasterGo, and Jishi Design;
3. limited professional reference libraries such as Mobbin and Refero when their accessible results materially improve the search;
4. official system guidance such as Apple Human Interface Guidelines and Material Design;
5. optional machine-local `awesome-design-md` and external visual reference libraries, when available; these must never be cross-machine handoff dependencies;
6. generated visual candidates when no suitable visual asset exists or the surface needs SchatPhone-owned imagery.

Do not bypass login requirements, paywalls, CAPTCHAs, license restrictions, or download controls. Free viewing does not imply permission to ship the source asset.

### 5.6 Candidate Selection

Keep at most three serious candidates. Score them by:

| Criterion | Weight |
| --- | ---: |
| Primary-task fit | 30% |
| Information architecture and depth | 25% |
| State and interaction completeness | 20% |
| Compatibility with SchatPhone visual ownership | 15% |
| Implementation and asset cost | 10% |

A single beautiful first screen without a usable flow or state evidence may be kept as mood reference, but it cannot win the functional recommendation by itself.

### 5.7 Reference Pack

Before implementation, return a compact reference pack containing:

- source links and current access/free boundary;
- the relevant screen or flow nodes;
- what each candidate solves;
- principles and patterns worth borrowing;
- brand-specific elements or business assumptions that must not be copied;
- mapping to the current SchatPhone surface and its L0-L3 path;
- missing states that still require original design;
- one recommended direction or a clearly defined hybrid;
- an asset/background/image-generation recommendation.

User approval of a reference direction authorizes adaptation of the selected principles, not wholesale copying of the source product or copyrighted assets.

## 6. Entry-Context Audit

Before changing visual design, run this audit mentally or write it in task notes.

Reference:

```text
docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md
```

Audit shape:

```text
Target surface:
Actual user path:
Parent context at the moment the user sees it:
Is the parent context Native System or Installed App?
Data sources used by this surface:
Visual owner:
Allowed borrowed accents:
Must not visually jump to:
```

Decision rules:

1. System entry wins system style.
2. App entry wins app style.
3. Data source does not own the outer look.
4. Shell renders shell.
5. Full route is not always full ownership.
6. System-controlled folders keep system material until the child route opens.

Examples:

- Chat thread WorldBook summary: Chat visual owner, WorldBook data source.
- Chat attachment gallery picker: Chat visual owner, Gallery data source.
- Map area card with knowledge points: Map visual owner, WorldBook data source.
- Calendar event created from Map: Calendar visual owner after opening Calendar; Map visual owner while still inside Map.
- Contacts role-profile asset binding: Contacts visual owner, Gallery/WorldBook data sources.
- Lock-screen Chat notification: Native System container, Chat accent/icon.
- Shopping Home-folder overlay: Native System container, Shopping child entries.
- Shopping child route: Installed App identity for the selected Shopping platform.
- World Pack app binding in App Store: Native System/App Store container, with world-pack origin and target-app identity visible. Opening the entry moves into the target installed app's visual owner with world context applied.

## 7. Visible Copy Audit

Visual work reviews the words users can actually see, not only layout, color, and motion.

Before finishing a visual change, check:

- buttons, tabs, menus, settings rows, empty states, toasts, banners, dialogs, tooltips, and form helper text;
- `aria-label`, `title`, and icon-only control labels when they affect exposed UI text;
- new placeholder copy and temporary labels introduced while building a visual state;
- i18n keys and translated strings when the touched surface supports multiple languages.

Do not render:

- code comments or implementation explanations;
- `TODO`, `FIXME`, `debug`, `mock`, `placeholder`, `dev`, or similar development markers;
- internal route names, component names, store names, token names, file names, or class names unless the page is explicitly a developer tool;
- text that explains the design implementation itself, such as "glass effect" or "new visual style", unless the user-facing feature genuinely needs that term.

If temporary copy is needed, write product copy, not developer copy.

System-language rules for visible UX:

1. User-facing navigation, labels, product details, cart/checkout copy, order details, empty states, and accessibility names follow the system language setting. The product default is Simplified Chinese (`zh-CN`).
2. Keep an accurate English (`en-US`) version for every touched built-in UX surface. A language switch changes presentation; it must not overwrite user-authored records or delete another locale's source copy.
3. Fixed words embedded in approved brand artwork or an explicitly brand-owned campaign can remain in their approved language. Dynamic product and workflow copy around that artwork still follows the system language.
4. Review text and media as one semantic unit in every supported language. Category names, product names, descriptions, ingredients, icons, and photography must describe the same subject; do not place coffee under a fruit-only label or pair unrelated food copy with an asset.
5. When a locale has no authored translation yet, use the product's documented fallback instead of exposing translation keys, empty copy, or implementation labels.

## 8. Installed Skills

The current visual workflow expects these skills.

### Project-local skills

These are expected in `.agents/skills` for repo-local visual work:

- `frontend-design`
  - stronger creative direction for pages, components, and app surfaces.
- `frontend-logic-design`
  - information architecture, navigation depth, MECE grouping, and interaction consistency.
- `image-to-code`
  - pixel-level restoration from a provided UI image, screenshot, Figma export, or long design image into code and high-resolution PNG slices.
- `gpt-image`
  - scenario-specific prompt-pattern and edit-invariant lookup across the vendored GPT Image reference atlas; use it to shape SchatPhone-owned generation requests, not as a production runtime dependency.
- `redesign-existing-projects`
  - audit-first refinement when an existing screen or group of screens reads as generic, inconsistent, or visually under-resolved but its current framework and behavior should remain intact.
- `ui-ux-pro-max`
  - local searchable reference data for product-type patterns, palettes, typography, accessibility, responsive layout, Vue guidance, charts, icons, and motion; use it to inform a decision, not to create a second design authority.
- `gsap-core`, `gsap-frameworks`, `gsap-performance`, `gsap-plugins`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils`
  - official GSAP guidance for a focused motion implementation round, including Vue lifecycle cleanup, reduced-motion handling, timelines, ScrollTrigger, Flip, SplitText, SVG animation, utilities, and performance.

### Machine-provided capabilities

- `browser`
  - read-only discovery and inspection of public product screens, flows, design systems, and editable-template communities. It gathers evidence; it does not decide product ownership or authorize copying.
- `imagegen`
  - production of candidate bitmap backgrounds, illustrations, product imagery, textures, and other visual assets when the surface needs SchatPhone-owned media rather than more explanatory text.
- `Product Design`, when installed
  - optional coordination for confirming an uncertain brief, exploring image-based directions, auditing a flow, proving an interaction in a disposable prototype, or comparing a selected visual target with an implementation. It does not require Figma or Pencil and is not a prerequisite for ordinary UI implementation.

### Skill routing guidance

- choose at most one specialist skill for a visual work round;
- use `frontend-logic-design` when the problem is page structure, grouping, entry placement, or inconsistent interaction logic;
- use `frontend-design` when a surface needs visual rebuilding or a deliberate polish pass;
- use `redesign-existing-projects` when the primary task is auditing and improving an existing surface without replacing its product structure or framework;
- use `ui-ux-pro-max` when a design choice needs a bounded local evidence lookup across product patterns, typography, color, accessibility, Vue, charts, icons, or motion;
- use `chinese-font-selector` when Chinese font licensing, CJK/Latin pairing, or Chinese typography hierarchy is the material design decision;
- use `ip-as-logo` when the accepted slice needs a compact product-owned IP/mascot logo direction or candidate brief;
- use `image-to-code` when the source image itself is the contract and the task needs 750px 1:1 restoration, transparent PNG slices, or strict screenshot/design-export matching;
- use `gpt-image` when a dedicated asset-production round needs a close prompt pattern for product/food imagery, brand systems, posters, UI mockups, information graphics, illustration, character work, or reference-image editing; load only the nearest atlas category and rewrite the result for the accepted SchatPhone art direction;
- treat `gpt-image` as a reference and prompt-craft specialist. Project-native `imagegen` or `codex-image` remains the default execution path; do not run the bundled CLI, read a local `.env`, use its moving-`main` `uvx` fallback, or make a billable API call unless the user explicitly approves that local-key execution and cost boundary;
- treat gallery author/source links as provenance for reference discovery, not as permission to ship copied prompts, brands, characters, likenesses, or source images;
- treat the installed GSAP skills as one motion-specialist family and load only the members required by the accepted motion slice; do not add the `gsap` runtime dependency merely because the skills are installed;
- for actual Vue GSAP work, pair the smallest relevant API topic with `gsap-frameworks`, preserve component cleanup, and keep reduced-motion behavior functional;
- do not use `ui-ux-pro-max --persist` in the normal visual workflow. Its generated `design-system/` tree would duplicate project design authority; persistent decisions belong in the existing `docs/design/*` contracts through normal review;
- upstream skill rules are advisory where they conflict with SchatPhone's existing stack, icon family, visual ownership, product boundaries, or this workflow;
- use Product Design only for the Direction Exploration or Experience Prototype path, or when the user explicitly invokes it; do not route every visual task through its full brief/prototype/QA sequence;
- keep Product Design audit, prototype, sharing, and deployment outputs subordinate to the current task package and project validation; never deploy or promote a prototype without explicit approval;
- use Browser during a reference-only discovery round when current public evidence is needed;
- use `imagegen` during a focused asset-production round when imagery is required and no approved asset exists;
- separate reference discovery, non-trivial asset generation, and UI implementation when combining them would hide a user decision or chain multiple visual specialists;
- skip specialist skills for routine CSS, copy, spacing, or accessibility fixes with clear acceptance;
- do not chain visual specialist skills by default.

### Adding or discovering visual skills

Do not add a new visual skill only because one screen needs more polish. First use the current project-local visual stack:

- `frontend-logic-design` for information structure;
- `frontend-design` for stronger screen composition;
- `redesign-existing-projects` for audit-first improvement of existing product surfaces;
- `ui-ux-pro-max` for local searchable UI/UX evidence when the decision space is broader than the current docs;
- `image-to-code` for source-image-to-code restoration and high-resolution slicing;
- `gpt-image` for a bounded scene-specific prompt/reference lookup before a separately governed generation call;
- the official GSAP skill family for a separately scoped motion implementation or performance problem;
- `imagegen` for candidate raster assets when missing imagery is the actual gap;
- Browser for public reference discovery when the user asks for current examples;
- `playwright-testing` when browser screenshots or journeys are needed.

Add a new project-local skill only when there is a repeated workflow gap that the current stack does not cover. Use `find-skills` and the Skills CLI from the confirmed SchatPhone project root:

```powershell
npx.cmd skills find "<query>"
npx.cmd skills add <owner/repo@skill>
```

Before recommending or installing a skill, verify source reputation and install count. After installing, confirm `.agents\skills` and `skills-lock.json`, then document the new dependency in this file and in `docs/process/DEVELOPMENT_TOOLING.md`.

## 9. Reference Library

The current machine keeps the `awesome-design-md` reference library here:

```text
D:\github\_references\awesome-design-md
```

Usage:

- treat it as a design reference library, not a package dependency;
- do not copy another brand directly into SchatPhone;
- extract principles and convert them into SchatPhone-specific rules.

The current machine also keeps an external visual asset reference library here:

```text
D:\github\美化包
```

Reference:

```text
docs/references/VISUAL_ASSET_LIBRARY.md
```

Usage:

- treat it as an external, read-only reference library by default;
- do not bulk-import it into the repo;
- before copying any image or code reference into SchatPhone, confirm the concrete product use, rename/compress it, and place it under a purpose-specific project asset folder;
- on another PC, start from project docs and repository assets; do not require this path or treat its absence as missing project evidence.

Cross-machine handoff rule:

- repository-owned generated media starts under `output/imagegen/<feature>/<batch>/` and enters a confirmed **asset upload list** (`素材上传清单`); public runtime artwork publishes to `schatphone-assets/`, while masters, generation sources, and visual candidates publish to protected `schatphone-source/`; uploading a candidate does not make it final and a later revision is registered as new SHA-256 content;
- audit screenshots, Playwright reports, contact sheets, prompts, JSON/JSONL request records, and acceptance notes are not uploaded as image-bed assets;
- `git commit` automatically publishes confirmed upload lists, re-downloads and verifies every object, stages `config/project-assets.json`, and removes the verified local generated files; the committed registry and canonical image-bed URL are the normal cross-machine handoff rather than a local absolute path;
- when publication is temporarily unavailable, the hook force-stages only the credential-free confirmed upload list and its exact generated files as a Git fallback; a later commit on either PC retries publication and removes the fallback after success;
- prompts, requests, source/license records, acceptance notes, and other text evidence required by a later machine remain Git-eligible repository documents; handoff docs must never use a machine-local absolute path as their only evidence;
- a generated file that is neither registered remotely nor present in a tracked fallback plan is local-only and cannot be treated as cross-machine evidence.

## 10. Recommended Project Artifacts

Visual work should eventually create or maintain:

```text
docs/design/DESIGN.md
```

Suggested content:

- visual positioning for SchatPhone;
- entry-context ownership rules for system, installed app, and hybrid surfaces;
- color tokens and theme rules;
- appearance-axis rules: day/night mode, system-theme tokens/materials, curated native-system App icon packs, and non-locking style-kit composition;
- typography scale;
- spacing, radius, border, blur, and shadow system;
- Home icon and fixed widget-slot rules;
- lock-screen visual rules;
- settings and utility-screen density rules;
- Chat, Map, Calendar, Gallery visual surface rules;
- motion and interaction-state rules;
- accessibility and responsive constraints;
- visible UI copy rules.

## 11. Reuse On Another PC

To reuse this workflow on another machine:

1. clone the SchatPhone repo;
2. ask the machine owner to confirm local installation paths before installing anything;
3. confirm the vendored visual skills from `.agents/skills` and `skills-lock.json`; ordinary setup receives them through Git and does not reinstall them from upstream;
4. optionally clone or locate an external design reference library when it would materially help; do not require it for project handoff;
5. restart Codex;
6. optionally use the routing shortcut `视觉专项`; ordinary UI requests enter this workflow without it.

Confirm local paths first:

```text
1. SchatPhone project root:
2. Global Codex skills directory:
3. Project-local skills directory:
4. Optional design reference library parent directory, if used:
5. Optional external visual asset library path, if used:
6. Whether PowerShell should use npx or npx.cmd:
```

Rules:

- project-local visual skills belong under `<repo>\.agents\skills`;
- after a reviewed skill update is committed and pushed, another PC receives the exact vendored contents and provenance lock through `git pull`;
- run `npx.cmd skills add ...` from the confirmed SchatPhone project root only when deliberately reviewing or updating the repository-owned copy;
- do not assume every PC has a `D:` drive or the same global Codex skill location.
- do not treat an absent external library as a handoff failure; import any later-machine dependency into a Git-eligible repository path and record `PENDING_GIT_COMMIT` until synchronized.

## 12. Standard Work Sequence

Use this sequence for visual work unless the user asks for a narrower path:

1. Read `docs/process/VISUAL_WORKFLOW.md` and the relevant design docs.
2. Decide the target surface and scope: system shell, installed app, hybrid surface, or project documentation only.
3. Run the entry-context audit.
4. Infer the Product-Grade Design Intake Gate, including the product role, experience promise, chosen expressive complexity, hierarchy, states, controls, content/media, responsive behavior, and smallest product-complete slice. Do not turn this into user homework.
5. Choose the Direct Product, Direction Exploration, or Experience Prototype path. Default to Direct Product for bounded work; pause only at a consequential product fork.
6. Map the surface to L0/L1/L2/L3 and choose inline, sheet/drawer, modal, subpage, or dedicated route containers by task depth.
7. Define the key state matrix before styling: normal, loading, empty, error, selected/edit, success, destructive, and any feature-specific intermediate states.
8. Decide what the interface should show directly through content, imagery, scene, status, or interaction instead of explaining it with helper copy.
9. Translate implementation terms into product-facing terms before discussing the work with the user or writing UI copy. For Home desktop work, avoid exposing route names, component names, tile kinds, or fake folder categories.
10. Use external references, Product Design, or candidate generation only when they resolve a material uncertainty. Do not make reference packs or multiple concepts a routine prerequisite.
11. Use a local visual asset library only when it is available and relevant, and make an explicit background/media/image-generation decision. If a required visual is missing, propose or generate it instead of silently substituting explanatory text; queue every accepted repository-owned generated asset for automatic image-bed publication so another machine receives either its registered remote object or the exact tracked fallback.
12. If the issue is confusing navigation or page structure, apply `frontend-logic-design` before visual styling.
13. Choose zero or one design/implementation specialist: `frontend-logic-design` for IA, `frontend-design` for a broad visual rebuild, `redesign-existing-projects` for audit-first improvement of an existing surface, `ui-ux-pro-max` for bounded local design evidence, `image-to-code` when a source image is the contract, or the GSAP family for a focused motion slice. Use a separate focused round for non-trivial image generation only when a hidden user decision would otherwise be buried.
14. Define the smallest product-complete change slice before editing. A slice may be narrow, but its primary journey and required visible states cannot remain generic scaffolding.
15. Implement only visual, layout, motion, copy, asset, or light interaction-support changes needed for that slice.
16. Audit controls for excessive text buttons, missing conventional icons, accessible names, hit areas, and clear selected/pressed/destructive states.
17. Audit palette, material, background/media, depth, motion, and any sensory interaction against the product role and visual thesis; remove effects that do not clarify hierarchy, agency, identity, emotion, or feedback.
18. Audit visible copy so developer notes, TODOs, debug text, route/store/component names, construction narration, and implementation explanations are not rendered to users.
19. If themes are touched, verify both `default` and `zen`.
20. If navigation or return controls are touched, check `docs/process/NAVIGATION_RETURN_CONTRACT.md`.
21. Verify with `git diff --check`, then lint/build/test when code changed.
22. Sync visual package/PM/roadmap docs only when the work changes IA, ownership, active scope, or priority; routine visual-only polish can skip roadmap sync.
23. Summarize:
   - changed surfaces;
   - visual-owner decisions;
   - reference and asset decisions;
   - product-grade gate evidence;
   - remaining risks;
   - next visual slice.

## 13. First Prompt Templates

Audit-first visual session:

```text
视觉专项：先读取 docs/process/VISUAL_WORKFLOW.md，然后只围绕视觉设计工作。默认从仓库内项目文档和素材开始；本机外部参考库仅在可用且确有帮助时使用，不得作为跨机器交接依赖。本轮不推进功能路线。先审查 [页面/模块] 的上级入口属于【本机系统】还是【装载 App】，再输出问题清单、设计方向和最小改造切片。同时审查前端显示文案，禁止把开发注释、TODO、调试提示、实现说明显示给用户。
```

Prototype discovery and adaptation:

```text
视觉专项：原型检索。目标是 [页面/模块/用户任务]。先检查当前实现、入口归属、L0-L3 信息深度和必须保留的功能边界，再从免费真实产品流程、可编辑原型社区、官方设计系统和可用的本机参考库中筛选最多三个候选。输出链接、免费边界、关键流程、可借鉴与不可复制内容、SchatPhone 适配映射、缺失状态、素材/底图/生图建议和一个推荐方向。后续机器必须看到的证据要进入 Git 可提交的仓库路径。本轮不改代码。
```

Direct implementation:

```text
视觉专项：参考 docs/process/VISUAL_WORKFLOW.md，直接改 [页面/模块]。请先从当前产品角色、用户任务和上下游语境判断它应该呈现什么、如何分级、需要何种内容/素材/互动，以及应当克制还是更具表现力；这些判断由你从项目证据中补全，不要让我填写设计问卷。默认走最短的产品级实现路径，只有真正影响产品方向时才暂停让我选择。不要用简单框、说明文案或通用模板代替内容、状态、素材和交互。实现后在真实页面检查布局、图标、文案、必要状态、动效/反馈和移动/宽屏表现。
```

Vague product request with room for initiative:

```text
我想做 [功能/体验]，目前只有大概诉求：[愿望、感觉或问题]。请从 SchatPhone 的产品语境中主动判断它应该让用户看到什么、完成什么、感受到什么，并选择合适的页面深度、素材和交互复杂度。不要套用某个现有页面，也不要为了走流程反复询问；在低风险决策上给出有观点的产品级实现，只在方向会实质改变体验时让我选择。
```

Hybrid or cross-module surface:

```text
视觉专项：先做入口归属排查。目标：[页面/弹层/卡片]。我希望你不要只看代码或数据来源，而是判断用户看到它时仍然处于哪个上级入口。如果它在装载 App 内，就保持该 App 的沉浸式视觉逻辑。同时检查该表面的可见文字是否是用户文案，而不是开发说明。
```

## 14. Verification

For documentation-only visual planning:

```text
git diff --check
```

For code changes:

```text
npm run lint
npm test
npm run build
npm run test:visual
```

`test:visual` is the single default visual-quality check. It currently covers Home, Settings, and Appearance across `default` and `zen` in desktop and mobile Chromium. It blocks page errors, horizontal overflow, and critical axe violations, and attaches screenshots plus the full axe report to Playwright results.

For visual-heavy changes, also run the app and inspect the changed screens in desktop and mobile-sized viewports. Do not add another visual tool unless a repeated gap cannot be covered by Playwright.

Product-grade verification must include evidence for the decisions made in the intake gate:

- the chosen presentation and interaction complexity matches the surface's product role, frequency, consequence, and experience promise;
- the primary task and first read are clear in the initial viewport;
- the L0-L3 path uses the intended inline/sheet/drawer/modal/subpage/route containers;
- content, imagery, scene, status, or interaction directly presents the experience where explanation alone would be an inadequate substitute;
- required loading, empty, error, selected/edit, success, and destructive states are intentionally presented;
- conventional tool actions use appropriate icons, with accessible names and stable hit areas;
- user-facing copy contains no construction narration or text standing in for missing interaction/visuals;
- palette, material, background/media, depth, and motion match the visual thesis in both static and interactive states;
- required images load, crop safely, remain legible at rendered size, and match the surrounding copy;
- reused components do not make unrelated installed apps look like label-swapped copies;
- mobile and wide layouts are both composed intentionally rather than mechanically stretched or collapsed;
- reduced-motion behavior preserves state clarity when motion is disabled.

For Home desktop and template-edit work, inspect at least these states:

- normal Home screen with Dock visible;
- edit mode with template slots visible;
- content library open with no selected item;
- content selected with compatible and incompatible slots distinguishable;
- slot picker or replace state;
- normal Home screen after placement.

Confirm empty template slots are invisible in normal mode, the Dock remains outside the template grid, and system-controlled entry groups are not presented as user-editable folders.

For theme changes, inspect both built-in themes and ensure there are no leftover raw-light panels in dark mode except where app-owned or content-owned surfaces intentionally differ.

For visible-copy checks, inspect rendered pages and changed templates for development markers such as:

- `TODO`
- `FIXME`
- `debug`
- `mock`
- `placeholder`
- `dev`

The goal is not to remove legitimate code comments. The goal is to ensure those markers are not shown to users.
