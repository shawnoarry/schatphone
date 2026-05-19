# Requirement Self-Check Template

Purpose: clarify requirements before coding so rework stays low.

Use this when you want to sanity-check your own task before implementation.

## A. Goal And Scope

- One-sentence goal:
- Must-have items:
- Non-goals:
- Target devices/browsers:

## B. Impact Scope

- Files to modify:
- Files explicitly not touched:
- New dependency required? Yes / No
- New route required? Yes / No

## C. Interaction And Visual

- Core interactions:
  click / swipe / long-press / drag / page-swipe
- Visual direction:
  default system / graphite quiet / world-specific / other
- Custom CSS capability involved? Yes / No

## D. Data And API

- AI call involved? Yes / No
- If yes, use `src/lib/ai.js` only
- Persistence schema change? Yes / No
- Legacy migration needed? Yes / No

## E. Home / Settings Rule Check

- Duplicate entry between Home and Settings? Yes / No
- Touching the locked Home rule (`app_*` not hideable)? Yes / No
- New widget involved? Yes / No
- Explicit save action on all key input pages? Yes / No
- Visible feedback after save? Yes / No

## F. Acceptance Criteria

- Functional definition of done:
- Minimum regression routes to verify:
  `/home`, `/settings`, `/network`, `/appearance`, `/chat`, `/files`, `/more`
- Mobile gesture validation required? Yes / No
- Error and retry validation required? Yes / No

## G. Pre-Commit Checks

- `npm run lint`
- `npm run build`
- run `npm run test` for behavior-logic changes

## H. Result Notes

Fill after implementation:

- Actual changes:
- Remaining TODO:
- Risks and cautions:
