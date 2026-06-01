# Chat AI Social Proposal Entry Design

Updated: 2026-06-01

## 1. Product Meaning

This slice makes Chat AI able to propose communication-state changes without secretly changing the relationship.

User-facing rule:

- `Chat / 聊天` is where the conversation happens and where confirmed communication state is applied.
- `Event Runtime / 事件运行时` reviews AI-generated role social proposals.
- `World Hub / 世界中枢` reviews high-risk proposals before they take effect.
- `Contacts / 通讯录` only shows the current communication snapshot for the role.
- `Relationship Runtime / 关系运行时` is not changed by the proposal alone.

In plain product terms: AI may say "this role wants to contact, refuse, block, restore, or unblock", but the system decides whether that proposal can become product state.

## 2. V1 Scope

V1 adds a Chat AI proposal entry only.

Included:

1. The Chat AI prompt tells the model to return optional social proposals in the same JSON envelope as assistant messages.
2. The Chat response parser accepts a normalized `socialEvents` array.
3. After assistant messages are appended, Chat submits each proposal to `simulationStore.submitChatSocialEventProposal()`.
4. Low-risk role greeting proposals may auto-apply as audited pending message requests.
5. High-risk refusal, block, restore, and unblock proposals stay pending in World Hub.
6. Tests prove AI responses cannot directly mutate Chat state without the review seam.

Excluded:

1. No background/random trigger source yet.
2. No Cheats / 金手指 controls.
3. No automatic relationship fact or memory creation.
4. No broad relationship-stage or affinity mutation.
5. No service-account, group-chat, or Self Profile social proposal support.

## 3. Assistant JSON Contract

The assistant may return:

```json
{
  "messages": [
    {
      "replyType": "plain",
      "quote": null,
      "blocks": [{ "type": "text", "variant": "primary", "lang": "zh", "text": "..." }]
    }
  ],
  "socialEvents": [
    {
      "type": "role_greeting_request",
      "explanation": "Role wants to open contact after the current exchange."
    }
  ]
}
```

Supported V1 `type` values:

- `role_greeting_request`
- `role_refuse_messages`
- `role_restore_messages`
- `role_block_user`
- `role_unblock_user`

The parser ignores unknown event types, missing arrays, malformed items, and proposals from fallback plain-text responses.

## 4. Review Behavior

Every parsed proposal is submitted with:

- current active Chat contact id;
- trigger source `ai_assisted`;
- source module `chat`;
- conversation id;
- trigger message id when available;
- assistant message id when available;
- short explanation.

The existing review policy decides the result:

- greeting request: low-risk, may become `incoming_request` with audit;
- refusal/block/restore/unblock: high-risk, enters World Hub pending review;
- invalid role, service, group, self, blocked transition, disabled module, Surprise Mode off, cooldown, or daily cap: blocked.

## 5. User Experience

V1 does not add a large new Chat panel.

Visible outcomes:

- If a greeting proposal applies, Chat and Contacts show the current communication state as a message request.
- If a high-risk proposal is created, World Hub shows it in the existing generated Chat social review panel.
- Chat assistant text remains normal role dialogue. The hidden proposal is not shown as raw JSON to the user.

## 6. Acceptance

The slice is complete when:

1. AI JSON with `socialEvents` is parsed and normalized.
2. Assistant messages still render normally.
3. Parsed proposals are submitted after messages are appended.
4. High-risk proposals do not change Chat until World Hub approval.
5. Low-risk greeting proposals use the existing audited auto-apply path.
6. Malformed or unsupported proposals are ignored safely.
7. Documentation states that Chat AI proposal entry is landed, while random/background triggers remain future work.
