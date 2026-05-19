# Page Recreation Brief Template

Purpose: provide a reusable brief format for page visual recreation or close visual reproduction tasks.

Best practice:

- provide both screenshots and URL when possible

## A. Required Inputs

| Field | Required | Format | Notes |
| --- | --- | --- | --- |
| reference screenshots | yes | PNG/JPG, multiple states preferred | first screen plus key states |
| target page URL | yes | URL | helps capture flow and motion rhythm |
| device and viewport | yes | e.g. iPhone 15 Pro, 390x844 | defines layout baseline |
| scope | yes | list | include and exclude areas |
| required states | yes | list | default, pressed, loading, empty, error, etc. |
| fidelity level | yes | one choice | pixel-perfect or style-consistent |
| priority | yes | P0/P1/P2 | helps scheduling |

## B. Optional But Recommended

| Field | Format | Notes |
| --- | --- | --- |
| screen recording | MP4/GIF | useful for transitions and timing |
| design source | Figma/Sketch/PDF | improves spacing and typography accuracy |
| font and icon source | link or package | avoids mismatch |
| asset package | ZIP/folder | original images, logos, backgrounds |
| interaction rules | bullet list | click/hover/long-press/swipe behavior |
| constraints | bullet list | copyright, no external CDN, etc. |
| deadline | date and timezone | helps batching |

## C. Reusable Submission Format

```md
# Page Recreation Brief

## 1) Basic Info
- Task name:
- Priority: P0 / P1 / P2
- Due date:
- Owner:

## 2) Target Platform
- Device:
- Viewport:
- Runtime:
- Orientation: Portrait / Landscape

## 3) Source Materials
- Screenshots:
  - [ ] Default state
  - [ ] Active or pressed state
  - [ ] Loading state
  - [ ] Empty state
  - [ ] Error state
- URL:
- Recording:
- Design file:
- Asset package:

## 4) Scope
- In scope:
- Out of scope:

## 5) Fidelity Target
- [ ] Pixel-perfect
- [ ] Style-consistent
- Notes:

## 6) Interaction Requirements
- Must-have interactions:
- Scroll behavior:
- Gesture behavior:
- Animation expectations:

## 7) Visual Tokens (if known)
- Primary color:
- Accent color:
- Font family:
- Radius:
- Shadow:
- Spacing rule:

## 8) Content and Locale
- Keep exact copy?
- Language mode:
- Placeholder policy:

## 9) Constraints
- Dependency limits:
- Asset usage limits:
- Performance limits:

## 10) Acceptance Criteria
- Required routes/pages:
- Required states completed:
- Responsive check:
- Regression check:

## 11) Delivery
- Output path:
- Naming convention:
- Need screenshot comparison?
- Need commit-message format?
```

## D. Quick Start Version

```md
# Quick Brief
- Target page:
- Device + viewport:
- URL:
- Screenshot folder:
- In scope:
- Required states:
- Fidelity level:
```
