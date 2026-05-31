# Relationship High-Risk Gate Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make future high-risk relationship event packs consume named gate presets instead of rebuilding hard-gate rules in each adapter.

**Architecture:** Add pure preset helpers in `relationship-event-gating.js`; do not enable any new high-impact automation or module adapter. Tests cover block/confirm/allow decisions through the preset seam.

**Tech Stack:** Pure JS helper, Vitest.

---

### Task 1: High-Risk Gate Presets

**Files:**
- Modify: `src/lib/relationship-event-gating.js`
- Modify: `tests/relationship-event-gating.test.js`
- Modify event/runtime and relationship docs.

- [x] Add named high-risk gate presets for future relationship event packs.
- [x] Add a helper that builds a relationship fact gate from a preset id.
- [x] Test preset block/confirm/allow behavior without enabling any event adapter.
- [x] Sync docs.
- [x] Run targeted tests, lint, test, and build.
