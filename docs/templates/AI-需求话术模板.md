# AI Collaboration Prompt Template

Purpose: improve request quality and execution stability when prompting another AI coding assistant.

Use this when handing SchatPhone work to a different AI tool or a fresh session.

## 1. Task Objective

Please implement the following in the existing SchatPhone project:

- [one-sentence objective]

## 2. Must-Do And Must-Not

### Must-Do

1. [must-do 1]
2. [must-do 2]

### Must-Not

1. do not change route structure unless explicitly requested
2. do not remove existing working features
3. do not write AI fetch directly inside components

## 3. Fixed Project Constraints

- stack: Vue 3 + Vite + Vue Router + Pinia + Tailwind v4
- all AI calls go through `src/lib/ai.js`
- avoid duplicate entries between Home and Settings
- Home rule: `app_*` entries cannot be deleted or hidden
- key input pages must keep explicit save action and visible feedback
- Network/Chat changes must include error grading and retry behavior
- prefer CSS variables over hard-coded style values

## 4. Change Scope

Please only modify:

- [file 1]
- [file 2]

Please do not modify:

- [file A]
- [file B]

## 5. Interaction Requirements

- Target pages:
  [`/home`, `/settings`, `/network`, `/appearance`, ...]
- Key interactions:
  click / swipe / long-press / drag / save feedback
- If network calls are involved:
  error classification + retry behavior
- Visual style:
  default system / graphite quiet / iPhone-settings-like / world-specific

## 6. Acceptance Criteria

After implementation, ensure:

1. `npm run lint` passes
2. `npm run build` passes
3. `npm run test` passes when behavior logic changes
4. required page behavior is reproducible

## 7. Delivery Format

Implement code directly and report:

1. modified files
2. what changed in each file
3. remaining risks or next-step suggestions

## 8. Copy-Ready Version

```text
Please complete the following in SchatPhone:

1. Objective: [fill in]
2. Must-Do: [fill in]
3. Must-Not: do not break route structure, Home locked-entry rules, or existing working modules
4. Technical constraints: Vue3 + Vite + Pinia + Tailwind v4, all AI calls via src/lib/ai.js
5. Structural constraints: no duplicate entries between Home and Settings; key input pages must have Save
6. Change scope: [fill in files]
7. Validation: run npm run lint, npm run build, and npm run test when needed
8. Output: modified files, key changes, remaining risks
```
