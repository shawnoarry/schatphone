# Chat Social Runtime Trigger Plan

Date: 2026-06-01

## Goal

Connect the foreground/session event runtime to the landed Chat social-event review seam, so runtime-generated role greetings can become reviewed Chat proposals without bypassing policy.

## Steps

- [x] Add a focused runtime-source helper that selects safe role greeting candidates.
- [x] Add a Simulation store action that submits the runtime candidate through `submitChatSocialEventProposal`.
- [x] Register the Chat social runtime source as an event tick pilot beside the existing Food Delivery pilot.
- [x] Pass `chatStore` through foreground tick lifecycle wiring.
- [x] Cover helper, store action, and tick runner behavior with focused tests.
- [x] Sync Chat/Event Runtime docs and roadmap handoff notes.
- [x] Run lint/build/tests and commit.
