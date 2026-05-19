# Deferred Visual Rebuild TODO

Updated: 2026-05-19

> **Frozen reference / 冻结参考**
>
> This file is parked scope only, not an active TODO, roadmap, or implementation source. Do not start work from this file directly. If visual rebuild work becomes active, first promote a narrow slice into `docs/roadmap/TODO_ROADMAP.md` and the matching visual/IA package handoff.

Purpose: park recommended visual-rebuild work while the project focus stays on functional and architectural progress.

This is a memory aid for future contributors, not an active execution board.

Rule:

- do not treat anything here as active unless it is promoted into `docs/roadmap/TODO_ROADMAP.md`

Related references:

- `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
- `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
- `docs/templates/VISUAL_REDESIGN_BRIEF_TEMPLATE.md`

## 1. Current Decision

Visual work is intentionally parked for now.

Why:

1. visual rebuild scope is already documented
2. initial visual direction is already documented
3. there is still functional and engineering work worth advancing before a broad redesign pass

## 2. Parked Visual TODO List

### Fill Remaining Style Directions

Later work:

1. add lightweight direction notes for Settings
2. add lightweight direction notes for Appearance
3. add lightweight direction notes for Contacts
4. add lightweight direction notes for WorldBook

Minimum input needed later:

- like what
- unlike what
- key words

### Create A Global Visual System Brief

Suggested later artifact:

- `docs/overview/GLOBAL_VISUAL_SYSTEM_BRIEF.md`

Suggested contents:

1. color system and semantic usage
2. typography direction and scale
3. radius, shadow, blur, and translucency rules
4. status bar, Dock, notification, and wallpaper readability rules
5. page transition and micro-motion language
6. icon style and app identity rules

### Promote Shell Visual Rebuild Phase 1

Suggested later promotion target:

- `docs/roadmap/TODO_ROADMAP.md`

Suggested scope:

1. Lock Screen rebuild
2. Home rebuild
3. Dock rebuild
4. in-shell notification rebuild

Why first:

- these surfaces determine whether the product feels like one believable phone

### Chat Visual Rebuild

Reference direction:

- primary: KakaoTalk
- secondary: WhatsApp and iMessage

Suggested later scope:

1. chat list and thread-entry state
2. message bubbles and attachments
3. rich-send panel
4. thread settings and AI controls
5. notification feedback and lock-screen return path

Must preserve:

- manual `Trigger Reply`
- rich message blocks
- message actions
- thread preferences
- structured assistant block rendering

### Gallery Or Map As The First Module Benchmark

Candidate A: Photos

- reference: iPhone Photos
- focus: album-first identity, collections, memories, wallpaper/person/journey organization
- preserve: import, category behavior, usage badges, cross-module bindings

Candidate B: Map

- reference: Google Maps plus ride-hailing flow
- focus: current location, destination, route status, trip lifecycle, arrival feedback
- preserve: simulation-first behavior, optional AI visual enhancement, Calendar/Reminders split

Suggested choice rule:

- choose Photos first if the goal is emotional album immersion
- choose Map first if the goal is functional app realism and trip-system depth

## 3. Resume Order For Future Visual Work

When visual work resumes, the safest order is:

1. fill remaining style directions
2. create `GLOBAL_VISUAL_SYSTEM_BRIEF.md`
3. promote shell visual rebuild phase 1 into `TODO_ROADMAP.md`
4. rebuild Lock Screen, Home, Dock, and notifications
5. rebuild Chat
6. choose Photos or Map as the first module-level benchmark

## 4. Functional Work Reminder

Because visual work is currently parked, contributors should return to these docs before coding:

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md`
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`

Use those files to choose the next functional slice instead of pulling deferred visual work back into the active queue by accident.
