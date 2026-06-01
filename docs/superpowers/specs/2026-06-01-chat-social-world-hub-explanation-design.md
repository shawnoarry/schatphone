# Chat Social World Hub Explanation Design

Date: 2026-06-01

## Product Meaning

World Hub should not only show that a Chat social proposal exists. It should explain why the proposal appeared, where it came from, and what it is allowed to change.

For users and PM review, this means:

1. role social proposals show whether they came from Chat AI output or the foreground/session event tick;
2. runtime greetings explain that V1 only proposes conservative contact openings for stranger or declined role contacts;
3. high-risk communication changes explain that Chat state stays unchanged until World Hub approves them;
4. every proposal reminds reviewers that Chat owns messaging reachability, Contacts only displays a snapshot, and Relationship Runtime is not changed by the proposal alone.

## Scope

In scope:

1. add source labels and review explanations to the World Hub Chat social-events panel;
2. show a compact policy snapshot for Surprise Mode, module event toggle, cooldown, and daily cap;
3. add safety notes for runtime greeting and AI-sourced proposals;
4. cover AI high-risk and runtime greeting cases in tests;
5. sync handoff docs.

Out of scope:

1. new social event types;
2. new relationship-stage effects;
3. Cheats editing controls;
4. direct Contacts or relationship-runtime mutation from the World Hub Chat proposal panel.
