# Chat And Chat Directory Status And Handoff

Updated: 2026-05-29

This file is the handoff page for Chat, Chat Directory, service accounts, and Chat-side role binding work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. Chat is a mature core lane with threads, rich messages, AI reply flow, and thread-level preferences;
2. Chat Directory and Contacts now have a clearer product boundary;
3. role binding into Chat is treated as a Chat-side entry concern, not a replacement for the global role archive;
4. service-account style messaging now connects Shopping checkout, Shopping logistics events, Food Delivery checkout, and Food Delivery order events into Chat through reusable notification messages.
5. Chat role-binding contracts now carry Contacts entity type, WorldBook template links, profile values, and capability flags.
6. Chat prompt context now orders primary worldview rules before current role profile values, visible user self-profile values, relationship runtime context, and supplemental role-bound knowledge points.
7. service notifications store source module/id references, optional source event id, status, amount, service label, and route actions while avoiding copied business state.
8. Chat prompt assembly and the thread WorldBook summary now consume the same `world-interface` context, so enabled/disabled/missing role-bound knowledge counts match what is sent to AI.

Still incomplete or risky:

1. Chat remains a large surface and still needs careful decomposition work;
2. legacy Chat-side relationship compatibility fields can still cause semantic drift if displayed carelessly;
3. service-account behavior is now coherent for Shopping/logistics/Food Delivery but still needs future visual polish and notification-style copy tuning.
4. self-profile visibility remains a V1 familiar/public gate until relationship-stage visibility mapping is designed.

## 2. Recommended Next Slice

1. Continue shrinking semantic drift in Chat Directory displays and binding flows.
2. Keep extracting low-risk Chat or Chat Directory UI pieces only when behavior can stay stable.
3. Later visual work can polish the service-notification card language and layout without changing ownership.

## 3. Do Not Do

1. Do not let Chat Directory turn into the global role archive.
2. Do not move destructive role cleanup into Chat or Chat Directory.
3. Do not mix service accounts into role-profile logic without an explicit contract.
4. Do not present `relationshipLevel` or `relationshipNote` as the current relationship truth.
5. Do not treat Chat Directory membership as proof that a Contacts entity is a Main Role.
6. Do not bind Self Profile as a Chat target.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/architecture/ROLE_BINDING_CONTRACT.md` when binding semantics changed
6. `docs/pm/contacts-relationship-system-v2/README.md` when Contacts vs Chat Directory meaning changed
