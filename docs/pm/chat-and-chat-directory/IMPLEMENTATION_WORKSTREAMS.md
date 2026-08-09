# Chat And Chat Directory Implementation Workstreams / 聊天与会话通讯录实施工作流

Updated: 2026-08-09

## 1. Workstream A: Chat Thread Behavior

- reply trigger and manual AI invocation
- message actions
- delete vs recall behavior for ordinary role/group messages
- rich message surfaces
- thread-level preferences
- per-thread reply preset application
- ordinary message save/unsave actions and Chat Me saved-message review
- messaging-app style first-level shell and thread-list controls
- bounded auto-growing multiline composer with `Enter` send, `Shift+Enter` newline, IME-safe keyboard handling, in-context AI stop, and cancellation-to-retry recovery
- internal source-App structured sharing with lock-screen continuation, conversation selection, explicit `share_card` confirmation, bounded draft expiry, cancel-to-source, exact detail return, and send/cancel cleanup
- release-level rich-message acceptance for structured edit, media type/size recovery, one-off and Gallery-backed images, accessibility labels, persistence, source actions, and inert legacy Mini Scene history
- Chat Settings for Chat-local appearance entry points, diagnostics, and default-behavior surfaces
- Chat Appearance V1: layout classes, independent message avatar visibility, selectable bubble treatments, content-fit sizing for ordinary text with bounded rich-content rows, normalized persisted settings, shared preview rows, and iMessage-like thread-header identity presentation
- Chat Appearance preview polish: a first-screen live header/thread/composer preview, compact layout/theme/bubble selectors, layout-specific default palettes, role legend, iMessage identity header, and replaceable-avatar placeholder guidance
- Chat Appearance route-shell coverage: one shared class resolver and semantic page/sheet/panel/header/tab tokens across Messages, Contacts/Services, Groups, Me, Chat Settings, Chat Appearance, and retained feature routes while keeping bubble colors independently selectable
- Chat Me for user identity/anonymity, recent interaction data, and derived social feed items
- source-owned `share_card` rendering, message context, and Shopping share send paths for product links, gift cards, and virtual gifts
- preserve legacy `mini_scene.htmlSnippet` as inert Chat history; a later Chat request Adapter uses the shared Mini Scene Interface and stores only an artifact reference/display snapshot where required

## 2. Workstream B: Chat Role Binding And Directory Management

- Chat-owned idempotent role binding into Chat, callable from Chat Directory or an explicit eligible Contacts `Start Chat` action
- Chat Directory review, unbind, and Chat-local metadata management for existing targets
- group-chat target management
- service-account management
- chat-target lifecycle
- direct Chat social-channel state for greeting requests, blocked, and blocked-by-role outcomes
- generated social events only through the landed event-runtime review/audit seam
- unbind-only rules
- Chat-local relationship compatibility annotations, labeled as tuning/note rather than current relationship truth

## 3. Workstream C: Service Accounts And Cross-Module Messaging

- Shopping service accounts
- Logistics service accounts
- Food Delivery service accounts
- system notification identities
- World Pack service/official account availability handoff from WorldBook, with Chat-side user opt-in, editable/resettable built-in candidates, reviewed AI/pasted candidate confirmation, and idempotent add/create in Services management
- reusable `service_notification` rich messages with source references and dedupe
- source modules push only into existing Chat Directory service accounts
- subscription feed controls for mute, fold, and Chat-owned read-state cleanup
- subscription feed grouping by unread priority and recency
- quiet/folded subscription unread cues in Messages and Services
- Services inbox filter explanations, count chips, selected summary cards, and contextual empty states
- Services-to-thread return state: preserve filter context, selected account, scroll recovery, and read-filter exit feedback
- service-thread account card with service identity, source chips, replyability, source-record ownership, history-retention promise, and inbox placement
- service-thread date dividers and consecutive-notification digest while preserving replyable notification cards
- service-thread compact follow-up cards for same-day same-source notification runs
- service-thread subscription-home empty state and Chat-side source-open reminder without source-record mutation
- source-specific service-notification presentation for Shopping orders, logistics tracking, and Food Delivery updates
- service-notification visual separation between source-detail actions and Chat reply actions
- service-notification action feedback for source-open, reply context, and mark-read retention
- composer-adjacent service interaction dock for source-open, reply-ready, sent-reply, and Chat-only read feedback
- bottom composer status, quote, error, and notice rows that do not overlay service-notification actions on mobile
- descriptive source notification plans for generated and manually linked service accounts, mapping supported source bindings to event-driven source-module pushes without auto-subscribing users or creating source records
- deeper service-account behavior tied to broader World Pack app archetypes, actual source-module schedule execution, and event semantics is deferred until the generated-account contract is exercised by target modules
- Chat-side service-account linkage contract for generated service/official accounts, including idempotent account reuse, source notification plan rows, notification required fields, reply/quote capabilities, and source-record ownership boundaries

## 4. Semantic Guardrails

Treat these as bugs:

1. Chat Directory starts acting like the global role archive
2. Chat starts owning destructive role cleanup
3. service accounts are mixed into role-profile logic without a clear contract
4. Chat-side `relationshipLevel` or `relationshipNote` is shown as the main current relationship truth
5. World Pack generated accounts start creating or owning source-module business records, or WorldBook becomes the direct Chat Directory service-account creator again before the Chat-side add flow is designed
6. group-chat membership starts acting like a second Contacts archive
7. Chat Me becomes a duplicate management hub, appearance page, diagnostics page, or bulk thread override page
8. Chat Settings starts owning Chat-side identity/social presence instead of behavior, appearance, and maintenance controls
9. friend/block social state is treated as current relationship progress, or generated social events bypass event-runtime review/audit
10. recall is implemented as deletion, or recalled original content remains available through copy, quote preview, pending quote bars, edit, reroll, saved-message, AI context, or history review
11. `product_link` share cards are presented as purchased, delivered, or directly giftable items; user-sendable gifts should be source-created digital gifts, vouchers, or virtual gifts
12. Chat executes legacy/generated Mini Scene HTML or copies Book regex, profile resolution, artifact persistence, presenter, or fallback logic into Chat
13. Chat Appearance presentation controls mutate message, relationship, or source-module truth, or expose a Chat-local header note as authoritative relationship progress
