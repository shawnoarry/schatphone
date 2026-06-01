# Chat Social Runtime Trigger Plan

Date: 2026-06-01

## Goal

Connect the foreground/session event runtime to the landed Chat social-event review seam, so runtime-generated role greetings can become reviewed Chat proposals without bypassing policy.

## Steps

- [ ] Add a focused runtime-source helper that selects safe role greeting candidates.
- [ ] Add a Simulation store action that submits the runtime candidate through `submitChatSocialEventProposal`.
- [ ] Register the Chat social runtime source as an event tick pilot beside the existing Food Delivery pilot.
- [ ] Pass `chatStore` through foreground tick lifecycle wiring.
- [ ] Cover helper, store action, and tick runner behavior with focused tests.
- [ ] Sync Chat/Event Runtime docs and roadmap handoff notes.
- [ ] Run lint/build/tests and commit.
