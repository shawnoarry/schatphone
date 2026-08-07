# Wallet Quote Explainability Handoff

Updated: 2026-08-07

Status: `DONE 2026-08-07`

## 1. Purpose And Authority

This document hands one bounded Wallet implementation slice to another machine or Codex task. It is not a second roadmap or a general Wallet backlog.

Apply authority in this order:

1. the current user request and root `AGENTS.md`;
2. `docs/process/AI_WORK_MODE.md`;
3. `docs/roadmap/TODO_ROADMAP.md`;
4. this package's `README.md` and `STATUS_AND_HANDOFF.md`;
5. this focused handoff and `WALLET_CURRENCY_AND_MONEY_CONVERSION_PLAN.md`.

The user explicitly selected Wallet quote explainability as the next focused implementation slice. Default Home release curation remains the next product-choice review after this slice; this file does not promote Shopping mixed-currency settlement, refunds, device proof, or Food Delivery decomposition.

## 2. Starting Point

Before implementation:

- update local `main` from the remote and confirm the working tree is clean;
- confirm `main` contains `6e53d3c` (`feat(commerce): adopt wallet quote snapshots`) and `d42c8ee` (`test(shopping): prove life consequence flow`) or later equivalent commits;
- read `src/views/WalletView.vue`, `src/stores/wallet.js`, `src/lib/currency-system.js`, `tests/wallet-view.test.js`, and the focused currency plan;
- preserve all unrelated work and do not rewrite historical transaction amounts.

Current facts:

- Wallet transactions already normalize and persist an optional `quoteSnapshot`;
- a valid snapshot contains `sourceMoney`, `quotedMoney`, `targetCurrency`, `rateSetId`, `rate`, `rateSource`, and `quotedAt`;
- the snapshot does not contain a separate `rateRevision`; `rateSetId` is the persisted quote-version identifier and must not be reconstructed from the current rate table;
- existing `receiptId` routing and the Transfer Receipt page are restricted to confirmed role-payee transfers;
- ordinary Shopping and Food Delivery expenses currently have no general transaction-detail surface.

## 3. User-Visible Goal

From Wallet Activity, every transaction can open a general transaction detail. For transactions with a saved quote snapshot, the detail explains the historical settlement without recalculating it. For transactions without a valid snapshot, it shows:

`旧版记录，无报价快照 / Legacy record, no quote snapshot`

The existing role-payee Transfer Receipt remains a separate, working surface.

## 4. Focused TODO

### A. Add General Transaction Detail

- Add a Wallet `transaction-detail` section driven by a selected transaction ID.
- Add `transactionId` to the Wallet workflow query contract so `/wallet?transactionId=...` survives reload and direct reopen.
- Add a details control to every Activity row with an accessible label and stable test ID.
- Keep the existing receipt control for eligible role-payee transfers; do not replace or broaden `receiptId` semantics.
- Back from transaction detail returns to Activity and clears only transaction-detail query state.
- A missing or deleted transaction shows a focused unavailable state and a return-to-Activity action.

Suggested stable test IDs:

- `wallet-open-transaction-detail-<transactionId>`
- `wallet-transaction-detail`
- `wallet-transaction-detail-unavailable`

### B. Present Recorded Transaction Truth

Always show:

- recorded transaction title, counterparty/source label, timestamp, direction, and settled transaction amount;
- source module and source record ID when present;
- account/card lineage when it already resolves through Wallet.

When `quoteSnapshot` exists, additionally show:

- source amount and source currency from `sourceMoney`;
- settled quoted amount and currency from `quotedMoney`;
- applied rate from `rate`;
- quote-version identifier from `rateSetId`;
- localized rate-source label from `rateSource` while retaining the saved value as truth;
- quote time from `quotedAt`.

Use Wallet's existing currency definitions and formatter for both Money values. If a historical currency definition is unavailable, fall back to an honest raw minor-unit/code presentation rather than hiding the field or substituting the current primary currency.

Suggested stable test IDs:

- `wallet-transaction-detail-source-money`
- `wallet-transaction-detail-quoted-money`
- `wallet-transaction-detail-rate`
- `wallet-transaction-detail-rate-set`
- `wallet-transaction-detail-rate-source`
- `wallet-transaction-detail-quoted-at`
- `wallet-transaction-detail-legacy`

### C. Preserve Historical And Ownership Contracts

- Never call `quoteMoney` to rebuild a saved transaction detail.
- Changing Wallet primary currency or exchange rates must not change an open or reopened historical detail.
- Treat a missing or malformed normalized snapshot as a legacy record; do not partially guess provenance.
- Do not mutate Shopping orders, Food Delivery orders, Wallet transactions, backups, or relationship facts in this slice.
- Wallet presents quote provenance but does not become the owner of product price, checkout, refund, or order policy.

### D. Keep The UI Focused

- Use the existing Wallet visual language and a compact definition-list treatment.
- Do not put a card inside another card or add a dashboard-style analytics surface.
- Keep long IDs and translated labels within the mobile width without horizontal overflow.
- Use familiar icons and tooltips/accessible names for detail, receipt, delete, and back actions.
- Do not expose developer-oriented explanatory prose outside the actual historical fields and legacy fallback.

### E. Tests And Validation

Add focused coverage for:

1. opening a Shopping/Food Delivery Wallet expense with a valid snapshot;
2. exact source money, quoted money, rate, `rateSetId`, source, and quote time display;
3. stability after changing the current Wallet primary currency and rates;
4. the legacy fallback for a transaction without a snapshot;
5. direct-route reopen through `transactionId`;
6. missing/deleted transaction behavior;
7. unchanged role-payee receipt routing and reopening;
8. Chinese and English labels where the existing Wallet tests make that practical.

Minimum validation:

- `git diff --check`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run governance:check`
- targeted desktop Chromium and simulated Mobile Chrome E2E, preferably by extending `e2e/shopping-life-consequence.spec.js` to open the saved Wallet expense detail

Update this package's `README.md` and `STATUS_AND_HANDOFF.md` after acceptance. Update the live roadmap only to mark this promoted slice complete and restore the next product-choice review; do not add a separate backlog.

## 5. Acceptance Criteria

The slice is complete only when:

- every Activity transaction has an operable details path;
- valid saved quote provenance is visible and formatted without re-quotation;
- old or malformed records show the explicit legacy fallback;
- changing current currency/rates cannot mutate historical display;
- transfer receipts still work independently;
- reload, back navigation, empty state, mobile width, tests, build, governance, and targeted E2E pass;
- no mixed-currency settlement, refund behavior, Home curation, or Food Delivery refactor is bundled into the change.

## 6. Copy-Paste Instruction For The Other Machine

Use this as the first message in the new Codex task:

> 基于远端最新 `main` 继续 SchatPhone 的 Wallet 报价可解释性。先完整阅读根目录 `AGENTS.md`、`docs/process/AI_WORK_MODE.md`、`docs/roadmap/TODO_ROADMAP.md`、commerce-finance-and-assets 包的 `README.md` 与 `STATUS_AND_HANDOFF.md`，再完整阅读 `docs/pm/commerce-finance-and-assets/WALLET_QUOTE_EXPLAINABILITY_HANDOFF.md`。按该 handoff 的 Focused TODO 实现通用 Wallet 交易详情，展示已保存的源金额、成交金额、成交汇率、`rateSetId` 版本标识、汇率来源和报价时间；旧记录显示“旧版记录，无报价快照”。保持角色转账回执独立，禁止按当前汇率重算历史记录，不扩展到混币结算、退款、Home 整理或 Food Delivery 拆分。完成代码、测试、E2E、文档同步和本地提交，并明确报告未推送状态与剩余风险。

## 7. Completion Record

Completed on 2026-08-07 in `WalletView.vue`, focused Wallet view tests, and the Shopping life-consequence Playwright journey. General transaction detail, saved quote fields, stability, direct reopen, legacy/missing/deleted states, raw unknown-currency fallback, independent receipt routing, desktop/mobile screenshots, and horizontal-overflow checks are covered. Mixed-currency settlement, refunds, Home curation, and broader Wallet expansion remain outside this completed slice.
