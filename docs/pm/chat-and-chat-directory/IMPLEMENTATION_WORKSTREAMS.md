# Chat And Chat Directory Implementation Workstreams / 聊天与会话通讯录实施工作流

Updated: 2026-05-30

## 1. Workstream A: Chat Thread Behavior

- reply trigger and manual AI invocation
- message actions
- rich message surfaces
- thread-level preferences
- per-thread reply preset application
- messaging-app style first-level shell and thread-list controls

## 2. Workstream B: Chat Directory And Binding

- role binding into Chat
- group-chat target management
- service-account management
- chat-target lifecycle
- unbind-only rules

## 3. Workstream C: Service Accounts And Cross-Module Messaging

- Shopping service accounts
- Logistics service accounts
- Food Delivery service accounts
- system notification identities
- World Pack generated service/official accounts after user confirmation
- reusable `service_notification` rich messages with source references and dedupe
- source modules push only into existing Chat Directory service accounts

## 4. Semantic Guardrails

Treat these as bugs:

1. Chat Directory starts acting like the global role archive
2. Chat starts owning destructive role cleanup
3. service accounts are mixed into role-profile logic without a clear contract
4. Chat-side `relationshipLevel` or `relationshipNote` is shown as the main current relationship truth
5. World Pack generated accounts start creating or owning source-module business records
6. group-chat membership starts acting like a second Contacts archive
7. Chat More becomes a duplicate management hub or bulk thread override page
