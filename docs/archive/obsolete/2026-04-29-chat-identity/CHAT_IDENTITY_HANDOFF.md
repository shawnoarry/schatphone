# Chat Identity Handoff

> Obsolete archive / 过时归档：This file is retained only for historical lookup. It is superseded by `docs/README.md` and must not be used as a current roadmap, status report, or implementation source.
>
> 当前仅保留历史查询；请以 `docs/README.md` 中列出的当前文档为准。
Status: Closed / Reference only

This refactor track has no mandatory remaining task. Do not use this file as an active execution board. If Chat identity work is reopened, promote the selected task into `docs/roadmap/TODO_ROADMAP.md` first and use `docs/roadmap/PROJECT_MODULE_AUDIT.md` only for sorting.

状态：已关闭 / 仅作参考

本重构线当前没有强制剩余任务。不要把本文当作活动执行看板。若后续重新开启 Chat 身份相关工作，需先把选中的任务转入 `docs/roadmap/TODO_ROADMAP.md`，`docs/roadmap/PROJECT_MODULE_AUDIT.md` 仅用于排序。

## Goal

Refactor `/chat-feature/identity` so it manages only the user identity inside Chat.

Keep only:

1. module avatar
2. module nickname
3. anonymity toggle
4. anonymity scope
5. targeted anonymity contacts

---

## Done

1. `src/stores/chat.js` already has `moduleIdentity`
2. `moduleIdentity` persistence and restore are already wired
3. `src/views/ChatView.vue` already uses module nickname
4. `src/views/ChatView.vue` prompt already uses anonymity logic
5. related store tests in `tests/chat-store-model.test.js` already pass
6. Task 1 done: anonymity UI moved from `preferences` to `identity`
7. Task 1 done: duplicated anonymity block removed from `preferences`
8. Task 2 done: `identity` now shows only user-identity-facing visible fields
9. Task 2 done: old AI-role module override block removed from page structure
10. Task 3 done: mojibake text and empty labels in `src/views/ChatFeaturePlaceholderView.vue` were fixed
11. Task 4 done: restored the `preferences` template card display
12. Task 4 done: restored the real scope preview block
13. Task 4 done: removed the empty placeholder nodes left by the anonymity move
14. Task 5 done: removed unused script methods left behind after the old identity UI removal
15. Task 5 done: `npm run lint` now passes again
16. Task 6 done: `moduleIdentity.avatar` is now independent from legacy `moduleAvatarOverrides.selfAvatar`
17. Task 6 done: legacy backups without `moduleIdentity` now migrate the old `selfAvatar` only during restore
18. Task 7 baseline done: added regression tests covering independent avatar clearing and legacy restore migration

---

## Remaining

1. No required remaining items for this refactor track.

---

## Next Task

No mandatory next task in the Chat identity refactor track.

Only do:

1. If future changes touch this area, keep `identity` page scoped to user-side Chat identity only.
2. Do not re-couple `moduleIdentity.avatar` with legacy avatar override fields.
3. Keep backup-restore compatibility covered by tests.

---

## Key Files

1. `src/views/ChatFeaturePlaceholderView.vue`
2. `src/views/ChatView.vue`
3. `src/stores/chat.js`
4. `tests/chat-store-model.test.js`
5. `docs/archive/obsolete/2026-04-29-chat-identity/CHAT_IDENTITY_REFACTOR_BREAKDOWN.md`

---

## Verification

1. historical: `npm test -- tests/chat-store-model.test.js` passed
2. historical: `npm run build` passed
3. current turn: confirmed no `t('', '')` remains in `src/views/ChatFeaturePlaceholderView.vue`
4. current turn: confirmed known mojibake markers were removed from `src/views/ChatFeaturePlaceholderView.vue`
5. current turn: restored `preferences` template card and real scope preview in `src/views/ChatFeaturePlaceholderView.vue`
6. current turn: confirmed no `v-if="false"` placeholder remains in `src/views/ChatFeaturePlaceholderView.vue`
7. current turn: `npm run build` passed
8. current turn: removed unused script leftovers in `src/views/ChatFeaturePlaceholderView.vue` and `src/views/ChatView.vue`
9. current turn: `npm run lint` passed
10. current turn: `npm test -- tests/chat-store-model.test.js` passed with new avatar-decoupling coverage
11. current turn: `npm run build` passed after the avatar-decoupling store changes

---

## Update Rule

After each task, only update:

1. `Done`
2. `Remaining`
3. `Next Task`
4. `Verification`
