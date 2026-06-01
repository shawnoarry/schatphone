# Chat Social Event Review Design

Updated: 2026-06-01

Status: `DESIGN_READY_FOR_REVIEW`

## 1. Decision Summary

SchatPhone should treat AI-generated friend, request, and block changes as reviewed social-channel events, not as direct Chat mutations.

The selected direction is:

1. Chat owns the applied communication state.
2. Event Runtime owns generated social-event proposals, eligibility, review state, and audit logs.
3. Relationship Runtime may record a confirmed relationship fact or memory after an applied social event, but it does not own whether the user and role can message each other.
4. Contacts may show a read-only social-channel snapshot for a role, but it must not decide or apply generated social events.
5. AI may read a prepared runtime summary and propose candidate events, but the deterministic system layer decides eligibility, risk, cooldown, review mode, and state writes.

Short version:

> AI can propose and perform the story. Event Runtime judges whether the proposal is allowed. Chat applies only confirmed communication state.

## 2. Product Problem

The project is intentionally high-freedom because users interact with AI characters, world settings, and relationship arcs through natural language. That freedom creates a risk: if AI is allowed to directly mutate important system state, one model response can accidentally change a relationship, block a user, create a request, or rewrite continuity without a stable product rule.

Current state:

1. Chat already has V1 social-channel state such as connected, incoming request, outgoing request, request declined, user blocked, contact blocked, and mutual blocked.
2. Chat Directory can show and manually edit those states.
3. Docs already say role-initiated friend requests, blocks, and being-blocked outcomes must wait for an event-runtime review/audit seam.
4. Relationship classification now has saved category/modifier fields and gate helpers, but high-impact automation is not enabled.

The missing layer is the generated social-event review path between AI/runtime proposals and Chat state.

## 3. AI And Randomness Rule

AI should not be the final source of truth for random events or system switches.

Use three layers:

### 3.1 Internal Truth Layer

The system owns:

- numeric metrics;
- relationship stage;
- saved relationship category and modifiers;
- user switches;
- surprise mode;
- cooldowns and daily caps;
- whether a state mutation requires review;
- the final write into Chat, Relationship Runtime, or another module.

This layer may contain values that are never shown directly in an app UI.

### 3.2 AI-Readable Policy Layer

The system may prepare an AI-readable summary such as:

```text
This role is close to the user, but the relationship is not confirmed romantic.
Allowed low-risk events: greeting, small gift suggestion, gentle check-in.
Review-required events: refusing messages, blocking the user, relationship confirmation.
Forbidden direct mutation: changing relationship stage or Chat channel state.
```

This is not the same as giving AI raw control. It is a bounded prompt contract.

### 3.3 Proposal And Review Layer

AI may propose:

- "the role wants to send a greeting request";
- "the role wants to stop receiving messages for now";
- "the role wants to unblock the user";
- "the role wants to block the user after a conflict".

The proposal then passes through deterministic review:

1. normalize the event type;
2. resolve target contact/profile;
3. read saved relationship classification fields;
4. evaluate risk, cooldown, surprise mode, and current Chat state;
5. either block, queue for review, or apply a low-risk state with an audit record;
6. only then call a Chat-owned action to change `chatSocialState`.

## 4. In Scope For V1

V1 covers generated social-channel changes for role contacts:

1. role-initiated greeting or message request;
2. role-initiated refusal to receive messages;
3. role-initiated restoration from refusal;
4. role-initiated block of the user;
5. role-initiated unblock of the user.

V1 also covers direct user actions as audit-only events:

1. user accepts or declines a request;
2. user blocks or unblocks a role;
3. user marks or clears "role refuses messages" only when explicitly using a manual/test/debug control.

Direct user actions remain direct Chat actions. They do not need runtime approval because the user is the authority for their own controls.

## 5. Out Of Scope For V1

Do not include these in this slice:

1. automatic romance confession;
2. automatic relationship confirmation;
3. jealousy, breakup, betrayal, or other high-impact relationship automation;
4. broad Cheats controls;
5. money, unlock, app access, or inventory overrides;
6. AI directly writing Relationship Runtime facts;
7. Contacts applying social state;
8. a new visible Event app.

These can be future event packs after the social-event review seam is proven.

## 6. Ownership Model

### 6.1 Chat

Chat owns:

- `chatSocialState`;
- message request banners;
- whether a thread can send messages;
- request accept/decline UI;
- user block/unblock commands;
- ordinary conversation history.

Chat does not own:

- generated-event eligibility;
- high-risk generated-event approval;
- relationship metrics or stages;
- current relationship truth;
- Contacts role deletion/reset.

### 6.2 Chat Directory

Chat Directory owns:

- who can enter Chat;
- role binding into Chat;
- user-facing management of existing Chat social state;
- manual user actions for request/block state.

Chat Directory does not own:

- role archive truth;
- generated social-event review;
- relationship facts.

### 6.3 Event Runtime

Event Runtime owns:

- generated social-event proposals;
- proposal status;
- risk level;
- review mode;
- eligibility reason;
- event logs;
- cooldown/cap metadata;
- World Hub review state for high-risk proposals.

Event Runtime does not own the applied Chat state after approval.

### 6.4 Relationship Runtime

Relationship Runtime owns:

- relationship metrics;
- stage;
- memory groups;
- milestones;
- confirmed relationship facts after a social event is applied.

Relationship Runtime must not decide whether Chat can send messages.

### 6.5 Contacts

Contacts owns:

- global role archive;
- role-centered static information;
- relationship premise/classification editing;
- destructive role and relationship cleanup.

Contacts may show:

- current Chat social-channel snapshot for a role;
- last applied generated social event;
- whether the snapshot came from Chat.

Contacts must not:

- approve generated social events;
- mutate `chatSocialState`;
- treat Chat block/request state as relationship stage.

### 6.6 World Hub

World Hub owns:

- review of pending generated social events;
- explanation of why an event was proposed;
- preview of what will change if approved;
- approve/dismiss/block actions for review-required proposals.

World Hub remains optional and hidden-by-default runtime control. It is not the normal data-entry path.

## 7. Social Event Types

Use stable event type ids:

| Event type | Meaning | Requested Chat state | Default review mode |
| --- | --- | --- | --- |
| `role_greeting_request` | Role wants to greet or request a chat channel | `incoming_request` | auto-apply with audit when safe |
| `role_refuse_messages` | Role stops receiving user messages | `contact_blocked` or `mutual_blocked` | pending review |
| `role_restore_messages` | Role receives messages again | `connected` or `user_blocked` depending on current state | pending review |
| `role_block_user` | Role blocks the user | `contact_blocked` or `mutual_blocked` | pending review |
| `role_unblock_user` | Role removes its block | `connected` or `user_blocked` depending on current state | pending review |
| `user_accept_request` | User accepts a Chat request | `connected` | direct user action, audit only |
| `user_decline_request` | User ignores or declines a request | `request_declined` | direct user action, audit only |
| `user_block_role` | User blocks a role | `user_blocked` or `mutual_blocked` | direct user action, audit only |
| `user_unblock_role` | User unblocks a role | `connected` or `contact_blocked` | direct user action, audit only |

V1 may implement the first five generated event types first and record user actions later if that keeps the implementation smaller.

## 8. Proposal Shape

A generated social-event proposal should include:

```js
{
  id: 'chat_social_event_...',
  eventType: 'role_greeting_request',
  targetContactId: 123,
  targetProfileId: 456,
  requestedChatSocialState: 'incoming_request',
  currentChatSocialState: 'connected',
  triggerSource: 'ai_assisted',
  risk: 'low',
  reviewMode: 'auto_apply_with_audit',
  status: 'applied',
  reason: 'eligible_low_risk_greeting',
  explanation: 'Role initiated a low-risk greeting request.',
  relationshipGate: {
    mode: 'soft_reference',
    decision: 'allow',
    primaryRelationshipCategoryId: 'friendship_bond',
    relationshipModifierIds: ['mutual'],
    reason: 'matched'
  },
  policySnapshot: {
    surpriseMode: 'low',
    userAllowsGeneratedSocialEvents: true,
    currentStateAllowsAutoRequest: true
  },
  source: {
    moduleKey: 'chat',
    conversationId: 123,
    messageId: '',
    runtimeLogId: ''
  },
  createdAt: 1779916800000,
  reviewedAt: 0,
  appliedAt: 1779916800000
}
```

The exact fields can be normalized during implementation, but the interface must preserve these concepts:

1. what was proposed;
2. who it targets;
3. what state it wants to apply;
4. whether the system allowed, blocked, or queued it;
5. why that decision happened;
6. which saved relationship classification fields were read;
7. whether Chat has already applied the result.

## 9. Review Policy

### 9.1 Auto-Apply With Audit

Only use for low-risk greeting requests when all are true:

1. target is a role Chat contact;
2. target is not a service, official account, group, or Self Profile;
3. current state is connected, stranger, request declined, or no active request;
4. user has not blocked the role;
5. surprise mode or equivalent policy allows generated social events;
6. cooldown/caps pass;
7. relationship gate does not block.

The applied result should still create a runtime log and be visible later for review.

### 9.2 Pending Review

Use for:

1. role refusing messages;
2. role blocking the user;
3. role unblocking the user;
4. role restoring messages;
5. greeting requests when confidence, current state, or policy is ambiguous.

Pending review means no Chat state write yet.

### 9.3 Block

Block without applying when:

1. target contact/profile cannot be resolved;
2. target is Self Profile;
3. target is not a role contact;
4. event type is unsupported;
5. current Chat state makes the requested transition invalid;
6. user policy forbids generated social events;
7. cooldown/cap policy blocks the event;
8. relationship gate returns a hard block for a future high-risk preset.

Blocked proposals should still be auditable during development and World Hub review if they help explain behavior.

## 10. Relationship Classification Use

Generated social events must read saved classification fields only:

- `primaryRelationshipCategoryId`;
- `relationshipModifierIds`;
- `classificationConfidence`;
- `classificationSource`;
- `classificationUpdatedAt`.

They must not read raw `relationshipLabelText` or `relationshipLabelNote` for event decisions.

For V1:

1. greeting requests may use a soft-reference gate;
2. role block/refusal events should use review-required policy even if the category seems compatible;
3. high-risk romance/conflict presets stay available but are not triggered by this feature;
4. future social-event-specific presets may be added only after V1 proves the review seam.

## 11. User Experience

### 11.1 Chat

Chat already shows request and blocked states. V1 should reuse those states.

When a low-risk generated greeting is applied:

- Chat shows it as a message request;
- the user can accept or ignore;
- the thread remains readable where current UI allows it;
- no relationship stage is changed.

### 11.2 Chat Directory

Chat Directory remains the management surface for current Chat social state:

- requests filter;
- blocked filter;
- accept/ignore;
- user block/unblock.

If a state came from a generated event, the detail copy may later say it was generated and reviewed, but V1 can keep that as a follow-up if the implementation risk is high.

### 11.3 Contacts

Contacts should later display a read-only snapshot such as:

```text
Chat 通讯状态: 对方打招呼待处理
来源: Chat
最近变化: 由事件运行层记录
```

This should be display-only.

### 11.4 World Hub

World Hub should show pending generated social events with:

- role name and visible role id when available;
- current Chat state;
- requested Chat state;
- trigger source;
- risk;
- policy reason;
- classification gate summary;
- approve and dismiss actions.

Approving a proposal should call a Chat-owned action to apply the state. Dismissing should keep Chat unchanged.

## 12. Skill And Tooling Note

The local project already has a `game-engine` skill at:

```text
.agents/skills/game-engine/SKILL.md
```

It is usable in this Codex session, but it is not the right primary skill for this feature. This feature is an event/runtime and Chat state review seam, not a Canvas/WebGL/game-loop implementation.

Use `game-engine` later only when building true game-loop surfaces, minigames, Canvas/WebGL rendering, collision, map-game mechanics, or interactive sprite/physics systems.

On this machine, PowerShell blocks direct `npx` through `npx.ps1`. Use `npx.cmd` if a future skill install command is needed.

## 13. Error Handling

Generated proposal intake should fail closed:

1. unsupported event type: block and log;
2. missing contact/profile: block and log;
3. service/group/self target: block and log;
4. invalid requested state: block and log;
5. Chat action returns false: mark proposal as failed and keep audit detail;
6. duplicate pending proposal: keep the existing pending proposal and log a skip;
7. cooldown active: skip with reason `cooldown_active`;
8. daily cap reached: skip with reason `daily_limit_reached`.

No error path should silently mutate Chat state.

## 14. Testing Requirements

Implementation should include tests for:

1. AI-generated greeting creates/applies only the allowed request state and records audit data;
2. generated role block queues pending review and does not change Chat state before approval;
3. approving a pending block applies the Chat state through Chat-owned actions;
4. dismissing a pending event keeps Chat unchanged;
5. user block/unblock remains direct and does not require runtime approval;
6. service/group/self targets are blocked;
7. raw relationship prose is not used for decisions;
8. saved category/modifier fields appear in relationship gate metadata;
9. Contacts consumes only a read-only snapshot;
10. World Hub can display pending proposal detail without becoming the Chat editor.

## 15. Acceptance Criteria

This design is complete when future implementation produces these user-visible truths:

1. AI cannot directly change friend/block/request state.
2. Generated low-risk greetings can become Chat message requests only after policy and audit pass.
3. Generated role block/refusal/unblock events wait for review.
4. Chat remains the only owner of applied `chatSocialState`.
5. Contacts shows only role-level snapshots.
6. Relationship Runtime does not treat Chat social state as relationship truth.
7. World Hub can explain and review high-risk generated social events.
8. The system can tell AI what is allowed without letting AI become the rule engine.

## 16. Open Decisions For Implementation Planning

These decisions have a recommended default so implementation planning can proceed without another product debate:

1. Pending proposal storage: use Event Runtime / `simulationStore` by default because generated social events are runtime proposals, not Chat truth.
2. Low-risk greeting behavior: allow auto-apply to `incoming_request` with audit because the user still accepts or ignores the request in Chat.
3. Block/refusal behavior: always review-required in V1.
4. Contacts snapshot: implement after the runtime proposal path is stable if needed to keep the first code slice small.
5. Relationship fact creation: defer automatic fact creation until after Chat state review works; V1 can keep social-event audit separate from memory growth.

