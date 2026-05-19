# Product Manager Requirement Template

Purpose: provide a low-friction reusable requirement template for PM-side communication, especially when the requester does not write code.

Who this is for:

- product managers
- non-technical collaborators
- future AI coding assistants

Best practice:

- if you can only provide one thing, provide screenshots first
- if you cannot describe style clearly, use `like / unlike` examples
- if you feel lost in the product, describe the path you clicked

## 1. What You Can Provide

You do not need to provide everything. Any subset is useful.

Supported input types:

1. screenshots
   - current project screenshots
   - reference app screenshots
   - annotated screenshots with circles, arrows, or text
2. direct image upload
3. Figma or design links
4. website or app references
5. screen recording
6. rough text description
7. hand-drawn sketch

If your text is unclear:

- send a screenshot and write "I like this part / I dislike this part"
- send a screenshot and mark "too messy / too plain / unclear button / cannot find entry"
- say things like "like KakaoTalk" or "not like a backend dashboard"

## 2. Quick Version

```md
# Quick PM Requirement
- Module:
  e.g. Chat / Settings / Photos / Home / Map

- What feels wrong now:
  e.g. unclear button hierarchy, cannot find entry, too dashboard-like, too plain

- What result you want:
  e.g. more like a real phone settings page, more like a messaging app, more refined

- References:
  screenshot / Figma / URL / app name / none

- Must keep:
  e.g. one button, one feature location, one interaction

- Must avoid:
  e.g. too white, too form-like, too office-software-like

- Priority:
  High / Medium / Low
```

## 3. Full Version

```md
# Product Requirement Brief

## 1) Basic Info
- Task name:
- Date:
- Priority: P0 / P1 / P2
- Module:
- Expected delivery order:

## 2) Background
- Why this matters:
- Current problem:
- What user pain it solves:

## 3) Current Path
- Where the user enters from:
- What the user clicks next:
- Where the user gets confused:
- If entry is missing or unclear:
  - I expected to find it in:
  - But actually found it in:

## 4) Desired Result
- What should change:
- What should remain:
- What should become easier:
- What emotion or feeling should it give:

## 5) Visual Direction
- Like:
- Unlike:
- Key words:
- Color preference:
- Typography preference:
- Motion preference:

## 6) Materials
- Current project screenshots:
- Reference screenshots:
- Figma:
- Website:
- Recording:
- Notes on each reference:

## 7) Interaction Requirements
- Required interactions:
- Entry and exit behavior:
- Button hierarchy:
- Empty/loading/error states:

## 8) Structure and Navigation
- Is this a top-level page or sub-page?
- Should it be reachable from Settings?
- Should it also exist inside the related module?
- Any duplicated entry to merge?
- Any missing back or home path?

## 9) Must Keep
- Feature logic that cannot change:
- Existing UI positions that must stay:
- Existing copy that must stay:

## 10) Must Avoid
- Visual directions to avoid:
- Interaction patterns to avoid:
- Structural risks to avoid:

## 11) Scope
- In scope:
- Out of scope:
- Can-do-later items:

## 12) Acceptance
- What counts as done:
- What should be easier after change:
- Screenshots or states to verify:

## 13) Extra Notes
- Anything hard to explain in words:
- Any uncertainty:
- Any open questions for the AI engineer:
```

## 4. Visual Add-On

Use this when the request is mostly about polish, atmosphere, or visual quality.

```md
## Visual Add-On
- Most important page to improve first:
- Current page screenshot:
- Reference image:
- What feels ugly or weak now:
- What feeling should it have:
- Must keep functional layout?
- Can structure be adjusted?
```

## 5. Entry-Problem Add-On

Use this when the main issue is "I cannot find the entry" rather than pure visuals.

```md
## Entry Problem Add-On
- I wanted to do:
- I expected the entry in:
- What I actually clicked:
  1.
  2.
  3.
- Where I got confused:
- Which button or label felt unclear:
- What would feel more natural:
```

## 6. Recommended Storage

- keep this file as a reusable base template
- duplicate it into task-specific briefs when needed
- if a request becomes execution-ready, link it from the matching task package or roadmap item
