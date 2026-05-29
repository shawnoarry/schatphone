# World Pack Service Account Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users generate Chat Directory service/official accounts from the active World Pack's service-account templates.

**Architecture:** Add a pure helper that maps a normalized world service template to a Chat contact payload, extend Chat store contacts with origin metadata and idempotent creation, then render active-pack service-template generation inside `CurrentWorldPackPanel`. WorldBook coordinates the user action; Chat Directory remains the owner of the created contact.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Vitest, Vue Test Utils, Playwright.

**Plan Status:** `SECOND_BLOCK_COMPLETE_VALIDATED`

---

## File Map

- Create `src/lib/world-pack-service-accounts.js`
  - Converts active-pack service templates into Chat contact payloads.
  - Maps safe module bindings to existing service keys only.
- Modify `src/stores/chat.js`
  - Persists world-template origin metadata on service contacts.
  - Adds find/create helpers for generated world service accounts.
- Modify `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Shows active-pack service templates, generated state, and create/open actions.
- Modify `src/views/WorldBookView.vue`
  - Builds service template rows from the active pack and calls Chat store generation.
- Add or update tests:
  - `tests/world-pack-service-accounts.test.js`
  - `tests/chat-store-model.test.js`
  - `tests/worldbook-functional-ia.test.js`
  - `e2e/worldbook-acceptance.spec.js`

## Tasks

- [x] Add pure service-template mapping helper.
- [x] Extend Chat contact normalization with world pack origin fields.
- [x] Add idempotent Chat store creation helpers.
- [x] Render active World Pack service templates in WorldBook.
- [x] Add focused unit/component/e2e coverage.
- [x] Run lint, build, full test suite, e2e, `git diff --check`, and desktop/mobile visual checks.
- [x] Sync roadmap, PM, architecture, and package handoff docs.

Validation results:

- Focused service-template, Chat store, Chat Directory, Shopping/Food Delivery service-routing, World Interface, System World Pack, and WorldBook UI tests passed.
- Full `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, and `npm.cmd run test:e2e` passed.
- Desktop and mobile Playwright screenshots passed with no horizontal overflow.

## Review Format

After implementation, report:

- what user problem this block solves;
- what the user can do now;
- which boundaries stayed intact;
- what is still metadata-only;
- validation results.
