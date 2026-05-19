# Chat And Chat Directory Status And Handoff

Updated: 2026-05-19

This file is the handoff page for Chat, Chat Directory, service accounts, and Chat-side role binding work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. Chat is a mature core lane with threads, rich messages, AI reply flow, and thread-level preferences;
2. Chat Directory and Contacts now have a clearer product boundary;
3. role binding into Chat is treated as a Chat-side entry concern, not a replacement for the global role archive;
4. service-account style messaging has started to connect Shopping, logistics, and Food Delivery into Chat.

Still incomplete or risky:

1. Chat remains a large surface and still needs careful decomposition work;
2. legacy Chat-side relationship compatibility fields can still cause semantic drift if displayed carelessly;
3. service-account behavior still needs deeper consistency across message surfaces and entry logic.

## 2. Recommended Next Slice

1. Continue shrinking semantic drift in Chat Directory displays and binding flows.
2. Deepen service-account push/message behavior for Shopping, logistics, and Food Delivery.
3. Keep extracting low-risk Chat or Chat Directory UI pieces only when behavior can stay stable.

## 3. Do Not Do

1. Do not let Chat Directory turn into the global role archive.
2. Do not move destructive role cleanup into Chat or Chat Directory.
3. Do not mix service accounts into role-profile logic without an explicit contract.
4. Do not present `relationshipLevel` or `relationshipNote` as the current relationship truth.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/architecture/ROLE_BINDING_CONTRACT.md` when binding semantics changed
6. `docs/pm/contacts-relationship-system-v2/README.md` when Contacts vs Chat Directory meaning changed

