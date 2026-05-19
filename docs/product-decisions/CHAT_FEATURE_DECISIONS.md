# Chat Feature Decisions

Updated: 2026-05-19

Purpose: preserve user-confirmed Chat product decisions so future sessions can continue without context loss.

This file is a product-decision history and alignment note, not a live execution board.

## 1. Confirmed Directions

### Delivery / Read / Typing State

Direction:

- show "typing" only while the system is actually waiting for an AI reply
- before manual reply trigger, the user message can remain in a delivered state
- once AI generation starts, that user message may switch to read

Current status:

- baseline behavior is already landed in the thread UI

### Suggested Replies

Direction:

- suggested replies must be optional
- control belongs in layered settings rather than being forced

Reason:

- avoid making AI assistance feel mandatory

Current status:

- baseline toggle landed as a per-thread control

### Quote Reply Logic

Direction:

- quote is a focus anchor, not a standalone context mode
- AI replies must still read persona, world context, and multi-turn history
- reading-window size should remain configurable

Current status:

- context-window turns are configurable per conversation

### One-Click Rewrite

Direction:

- rejected for now

Reason:

- heavy rewrite of user text weakens immersion

### Bilingual Translation

Direction:

- approved
- ideally produced in one call path instead of a second translation pass

Current status:

- baseline structured bilingual output already exists through text blocks

### Voice-Related Direction

Direction:

- keep integration points in global Settings
- allow persona/module or per-thread enable/disable
- preserve virtual-voice presentation rather than forcing literal audio-only treatment

Current status:

- virtual voice block rendering and per-thread enable flags are already landed

### Autonomous Trigger Governance

Direction:

- do not build an in-project quota meter as source of truth
- keep explicit reminders at entry points that trigger AI usage
- use hierarchical switches: global -> module -> thread
- manual trigger should outrank autonomous trigger on timing collision
- keep call/error history in Network/API for diagnostics

Current status:

- baseline governance landed; UX thresholds and policy tuning continue

## 2. Deferred Directions

Still intentionally deferred:

- group chat features
- group unread summary
- semantic search
- several lower-priority proposal items from the earlier Chat expansion discussion

These should not silently re-enter the roadmap without an explicit decision.

## 3. Clarifications Still Worth Asking Later

When Chat returns to deeper product design, the next useful clarifications are:

1. should context window be configured by turns, tokens, or both?
2. should bilingual output be always-on or role-based optional?
3. should virtual voice remain visible even when TTS is disabled?
4. should image-message intelligence stay deferred or move into a later P2 backlog?

## 4. Practical Rule

If a future Chat proposal conflicts with this file, update this file in the same round instead of leaving the accepted decision only in chat history.
