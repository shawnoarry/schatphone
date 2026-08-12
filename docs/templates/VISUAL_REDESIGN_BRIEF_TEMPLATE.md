# Visual Redesign Brief Template

Purpose: provide a reusable brief for page beautification, style unification, immersive visual upgrades, and polished UI rebuild work.

This template is an optional communication aid, not required user homework. A user may give only a feature idea, a feeling, a problem, or one reference. The assistant should infer the rest from the current product, owning package, implementation, and design evidence, and should ask only about a choice that would materially change product meaning or direction.

Use this when the main question is:

- beauty
- style
- immersion
- atmosphere
- page polish
- visual identity

Best practice:

- provide at least one current screenshot and one reference screenshot
- if you cannot describe style clearly, write `like / unlike / key words`
- if layout may change, say so explicitly
- for SchatPhone, describe the user entry path before deciding the visual style
- treat examples as clues, not templates or automatic best practices
- let the product role determine whether the result should be restrained, expressive, immersive, tactile, or highly interactive

## 1. Minimal User Request

Any one of these is enough to begin:

```md
- I need this feature, but I do not know what the UI should be.
- This page feels plain, dense, generic, or unfinished.
- I like this example for a particular quality, but do not copy it.
- I want this experience to feel more intimate, tactile, alive, calm, efficient, or surprising.
```

The assistant then owns discovery of:

- the surface's role in the larger product journey;
- what the user should understand, do, and feel;
- what belongs on the overview versus a detail, management, or execution layer;
- what should be shown directly through content, imagery, scene, or interaction;
- which states, controls, assets, motion, sound, haptics, or other sensory treatment are justified;
- whether the shortest direct implementation path is sufficient or a consequential direction/prototype decision needs user input.

## 2. What You Can Provide

Any subset is useful:

1. current page screenshots
2. reference screenshots
3. Figma or design links
4. app or website references
5. screen recordings
6. text keywords
7. "like / unlike" statements

## 3. Quick Version

```md
# Quick Visual Brief
- Page:
  e.g. Home / Chat / Settings / Photos

- User entry path:
  e.g. Home tile -> Chat -> thread settings -> WorldBook summary

- Parent context:
  system shell / installed app / app-internal panel

- Current problem:
  e.g. too plain, too messy, too much like a dashboard, hierarchy unclear

- Product role:
  e.g. supporting utility / frequent tool / core workflow / immersive moment / experience climax

- Desired feeling:
  e.g. more like a real phone, more delicate, more immersive, more like a social app

- References:
  screenshots / Figma / URL / app name

- Must keep:
  e.g. core logic, one key button, one key entry path

- Must avoid:
  e.g. too white, too form-like, too office-software-like

- AI should decide:
  e.g. layout, page depth, visual direction, asset plan, and appropriate interaction complexity
```

## 4. Full Version

```md
# Visual Redesign Brief

## 1) Basic Info
- Task name:
- Page or module:
- Priority: P0 / P1 / P2
- Is this a global style change?

## 2) Entry Context
- Actual user path:
  1.
  2.
  3.
- Parent context when seen:
  system shell / installed app / app-internal panel
- Visual owner you expect:
  e.g. Chat / Map / Photos / Contacts / native system
- Shared data involved:
  e.g. WorldBook / Photos assets / Contacts / Calendar / Map
- Must not visually jump to:
  e.g. should not suddenly look like Settings when still inside Chat

## 3) Current Situation
- What looks bad now:
- What feels confusing:
- What feels too weak:

## 4) Desired Direction
- Like:
- Unlike:
- Key words:
- Emotion:
  e.g. believable, delicate, restrained, warm, immersive, native
- Experience promise:
  e.g. what the user should understand, accomplish, or feel
- Product importance and interaction intensity:
  supporting / frequent / core / immersive / high-consequence

## 5) Visual Details
- Background style:
- Card style:
- Button style:
- Typography:
- Icon style:
- Motion style:
- Density:
- Direct presentation:
  e.g. people, products, place, scene, collection, status, journey, or atmosphere that should be shown instead of explained
- Sensory interaction, only when justified:
  e.g. direct touch, drag, ambient response, sound, haptics, dynamic background

## 6) Structure Flexibility
- Can layout change?
- Can button positions change?
- Can entry hierarchy change?
- What must stay fixed?

## 7) References
- Current screenshots:
- Reference screenshots:
- Figma:
- Website:
- Recording:
- Notes:

## 8) Acceptance
- What should feel improved first:
- What should become clearer:
- What should feel more immersive:
- What should remain familiar:
- Does it preserve parent-context immersion?

## 9) Notes
- Open questions:
- Areas where AI should decide:
```

## 5. Good Prompt Examples

Example 1:

- "The Chat page feels like a webpage, not a messaging app. I want it to feel more like KakaoTalk, but more delicate and more romance-product oriented."

Example 2:

- "The Settings structure is acceptable, but the visuals are too plain. I want it to be as clear as iPhone Settings, but less plain."

Example 3:

- "The WorldBook summary inside Chat should not become a system-settings surface. The user is still in Chat, so it should feel like a thread info panel."

## 6. Recommended Use

- use this when the main issue is visual quality or immersion
- if the main issue is entry confusion, combine it with `ENTRY_NAVIGATION_AUDIT_TEMPLATE.md`
- do not ask the user to complete the full version when repository evidence and a short request are enough
