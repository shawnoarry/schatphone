# Runtime Memory Count Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep relationship runtime memory counts canonical even when a caller requests a small or zero memory-summary display limit.

**Architecture:** `summarizeEntityForTarget()` should compute all memory-group totals before applying the display cap. The returned `memorySummaries` remains capped, while `totalMemoryCount`, `visibleMemoryCount`, `archivedMemoryCount`, and `hasArchivedOnlyMemories` describe the full runtime state.

**Tech Stack:** Pinia store, Vitest.

---

### Task 1: Runtime Summary Count Contract

**Files:**
- Modify: `src/stores/relationshipRuntime.js`
- Modify: `tests/relationship-runtime-store.test.js`
- Modify docs touched by relationship runtime semantic changes.

- [x] Add a regression proving memory counts stay full when `memoryLimit` is `0` and when there are more than 50 memory groups.
- [x] Compute raw memory summaries before applying display caps.
- [x] Keep archived-memory filtering separate from returned summary truncation.
- [x] Sync relationship runtime docs.
- [x] Run targeted tests, then lint/test/build.
