# Chat UI/UX Kakao-like Redesign Handoff

Date: 2026-05-30

## Context

The latest committed baseline is `168bcf1 feat(chat): refine app shell and more settings`.

Current Chat V1 already has:

- Bottom tabs: `Messages / Objects / Groups / Services / More`.
- Chat home top-right actions: search, new chat, gear.
- Gear currently routes to `/chat-feature/more`.
- `/chat-feature/more` currently acts like a settings-ish page, centered on Chat identity/anonymity and maintenance diagnostics.
- Global `/appearance` already supports advanced custom CSS through `settings.appearance.customCss`; `App.vue` injects it into a `<style data-schatphone-custom-css>` tag.
- `src/style.css` already exposes chat variables such as `--chat-bg`, `--chat-thread-bg`, `--chat-user-bubble-bg`, `--chat-assistant-bubble-bg`, `--chat-input-bg`, and `--chat-send-bg`.

The user wants a more immersive KakaoTalk-like Chat experience, but the product logic should not duplicate settings entry points.

## Product Decision

Do not keep both the top-right gear and bottom `More` as settings-like destinations.

New mental model:

- **Top-right gear = Chat Settings**
  - Controls how Chat behaves and looks.
  - This is the place for Chat appearance, default conversation behavior, immersion/notification controls, and diagnostics.

- **Bottom `More` becomes `Me` / `我`**
  - Represents the user's Chat identity and social presence.
  - This is the place for identity/anonymity, recent interaction data, saved messages, and lightweight dynamic/social feed.

Recommended bottom tabs:

1. `消息 / Messages`
2. `对象 / Objects`
3. `群聊 / Groups`
4. `服务号 / Services`
5. `我 / Me`

## Entry Flow

### Chat Home

Top-right buttons should remain visually close to KakaoTalk:

- Search: opens Chat search.
- New chat: creates or selects a conversation target.
- Gear: opens Chat Settings.

The gear should no longer land on the user identity page.

### Chat Settings

Suggested route: `/chat-settings`.

Primary entries:

1. **Chat 外观 / Chat Appearance**
   - Kakao-like immersive preset.
   - Conversation row layout mode: WeChat-like, Kakao-like, iMessage-like.
   - Chat-scoped CSS import.

2. **沉浸与通知 / Immersion & Notifications**
   - Red dot behavior.
   - Foreground banner intensity.
   - Whether Chat should reduce system-style interruptions.

3. **默认会话行为 / Default Thread Behavior**
   - New thread default message layout.
   - Input bar defaults.
   - Reply trigger defaults.

4. **维护与诊断 / Maintenance & Diagnostics**
   - Move the existing schedule repair, override cleanup, and network diagnostics here.

### Me Page

Suggested route: `/chat-me`.

This replaces the bottom `More` destination.

Primary content:

1. **Profile hero**
   - Avatar, Chat display name, anonymity summary.
   - Tapping opens `Chat 身份与匿名 / Chat Identity & Anonymity`.

2. **Quick actions**
   - Identity & Anonymity.
   - Saved Messages.
   - My Dynamic Feed / Status.

3. **Recent interaction data**
   - "近期聊得最多 / Most chatted recently".
   - Show avatars ordered by recent activity.
   - V1 can compute from message counts and last activity timestamps over a 7-day window.

4. **Short dynamic feed**
   - Lightweight, social-app-like updates.
   - V1 should derive from existing data instead of inventing a new social backend.
   - Example feed items:
     - Someone replied to the user's status.
     - A group has new image activity.
     - A role/contact has a short status update.
     - A saved message or chat milestone.

The Me page should not be the primary place for appearance, diagnostics, or default conversation settings.

## Chat Appearance

Suggested route: `/chat-settings/appearance` or `/chat-appearance`.

Recommended V1 fields:

```js
settings.appearance.chat = {
  presetId: 'kakao_immersive',
  messageLayout: 'kakao',
  customCss: '',
  customCssEnabled: false,
}
```

Keep this in `systemStore.settings.appearance`, not `chatStore`, because it is presentation/UI preference rather than conversation content.

### Preset

Default preset should be **Kakao-like immersive**:

- Chat home uses a stronger yellow identity signal.
- Chat thread uses a warm, calm conversation canvas.
- Controls stay light and low-friction.
- Avoid direct KakaoTalk brand assets, trademarks, exact icons, or copyrighted visual elements.
- Use the provided mock image as structural reference, not as copied branding.

## Conversation Layout Modes

Important: these modes are not a simple avatar show/hide toggle. Each mode changes the entire message row layout: avatar gutter, bubble max width, sender name placement, timestamp placement, and alignment.

### WeChat-like

Use when the user wants both sides to feel like strongly identified participants.

Rules:

- Assistant/contact messages:
  - Avatar on the left.
  - Bubble begins after a fixed avatar gutter.
  - Sender name can be hidden in 1:1 chats and shown in groups.

- User messages:
  - Avatar on the right.
  - Bubble ends before a fixed right avatar gutter.
  - Bubble max width should be reduced to account for avatar space.

- Visual effect:
  - Strong contact presence.
  - More structured, less minimal.

### Kakao-like

Recommended default.

Rules:

- Assistant/contact messages:
  - Avatar shown on the left.
  - Sender name shown above bubble, especially for groups.
  - Bubble has comfortable spacing and rounded corners.

- User messages:
  - No user avatar in the message stream.
  - Message aligns right with a clean edge.
  - Timestamp/status may sit near bubble edge.

- Group chats:
  - Contact avatar and sender name are important.
  - Consecutive messages from the same sender can reduce repeated avatar/name later, but V1 can keep it simple.

- Visual effect:
  - Best fit for immersive KakaoTalk-like feeling.
  - Less visual clutter on the user's side.

### iMessage-like

Use when the user wants the cleanest, lowest-avatar message stream.

Rules:

- No avatars in the message stream.
- Identity is handled by the top thread header.
- Bubbles sit closer to screen edges than the other modes.
- User bubble uses a strong accent color.
- Assistant/contact bubble uses a neutral surface.
- Group chats need sender names because avatars are hidden.

Visual effect:

- Lightweight and system-like.
- Less social-avatar presence.

## CSS Import

Global CSS already exists:

- UI: `/appearance` -> `主题美化 / Theme` -> `高级 CSS / Advanced CSS`.
- Store: `settings.appearance.customCss`.
- Injection: `App.vue` creates `<style data-schatphone-custom-css>`.

New Chat-specific CSS should be added separately:

- UI: `Chat Settings` -> `Chat Appearance` -> `Advanced CSS`.
- Store: `settings.appearance.chat.customCss`.
- Injection: create a separate `<style data-schatphone-chat-css>`.
- Scope guidance: users should primarily override Chat CSS variables, not arbitrary global selectors.

Recommended exposed tokens:

```css
.chat-shell {
  --chat-bg: #fee500;
  --chat-thread-bg: #fff7d1;
  --chat-thread-header-bg: rgba(255, 247, 209, 0.92);
  --chat-ink: #272018;
  --chat-user-bubble-bg: #fee500;
  --chat-user-bubble-text: #272018;
  --chat-assistant-bubble-bg: #ffffff;
  --chat-assistant-bubble-text: #171717;
  --chat-input-bg: #ffffff;
  --chat-input-field-bg: #f3f3f3;
  --chat-send-bg: #fee500;
  --chat-send-text: #272018;
}
```

If possible, the editor should show variable snippets first and make raw CSS an advanced affordance. Existing global CSS remains in `/appearance`.

## Implementation Guide

Recommended file-level plan:

1. **Bottom tab rename**
   - File: `src/components/chat/ChatAppTabBar.vue`
   - Rename `more` label to `我 / Me`.
   - Change route from `/chat-feature/more` to `/chat-me`.
   - Keep test IDs stable only if tests depend on them; otherwise rename to `chat-app-tab-me`.

2. **Top-right gear route**
   - File: `src/views/ChatView.vue`
   - Rename `openChatMore` to `openChatSettings`.
   - Gear should route to `/chat-settings`.
   - Gear aria label should be `Chat 设置 / Chat Settings`, not `更多 / More`.

3. **Create dedicated pages**
   - Add `src/views/ChatSettingsView.vue`.
   - Add `src/views/ChatMeView.vue`.
   - Add `src/views/ChatAppearanceView.vue` if appearance is not handled inline.
   - Add routes in `src/router/index.js`.

4. **Move existing More contents**
   - Identity/anonymity moves to `ChatMeView`.
   - Maintenance/diagnostics moves to `ChatSettingsView`.
   - The old `/chat-feature/more` can redirect to `/chat-me` for compatibility.
   - The old `/chat-feature/labs` can redirect or render diagnostics under settings.

5. **Add Chat appearance state**
   - File: `src/stores/system.js`
   - Add normalized `settings.appearance.chat`.
   - Persist it with existing appearance settings.
   - Keep defaults conservative:
     - `presetId: 'kakao_immersive'`
     - `messageLayout: 'kakao'`
     - `customCssEnabled: false`
     - `customCss: ''`

6. **Apply layout mode**
   - Current message rendering lives in `src/views/ChatView.vue`.
   - Because `ChatView.vue` is already large, prefer extracting a presentational `src/components/chat/ChatMessageRow.vue`.
   - The row component should receive:
     - `message`
     - `layoutMode`
     - `activeSelfAvatar`
     - `activeContactAvatar`
     - `isGroup`
     - sender/name metadata
   - Implement the three layout modes through classes, not scattered inline branches.

7. **CSS strategy**
   - Add base classes in `src/style.css`:
     - `.chat-message-row`
     - `.chat-message-row.is-user`
     - `.chat-message-row.is-assistant`
     - `.chat-layout-wechat`
     - `.chat-layout-kakao`
     - `.chat-layout-imessage`
   - Avoid a pure `v-if avatar` approach. The grid/flex structure must change per mode.

8. **Tests**
   - Rename or replace `tests/chat-more-page.test.js`.
   - Add route tests:
     - Gear opens Chat Settings.
     - Bottom `Me` opens Chat Me.
     - Settings page contains Chat Appearance and Diagnostics.
     - Me page contains Identity & Anonymity and recent interaction data, but not primary diagnostics.
   - Add store tests for appearance normalization.
   - Add component tests that verify each message layout mode changes avatar presence and row alignment.

## Acceptance Criteria

- There is no duplicate settings destination.
- Gear always means Chat Settings.
- Bottom `我 / Me` is a user/social page, not a settings dump.
- Chat Appearance can select WeChat-like, Kakao-like, and iMessage-like layouts.
- Kakao-like is the default immersive preset.
- Changing layout mode changes message row structure, not just avatar visibility.
- Chat-specific CSS can be imported from Chat Appearance.
- Global custom CSS remains available in `/appearance`.
- Existing identity/anonymity functionality remains available, but lives under Me.
- Diagnostics remain available, but live under Chat Settings.

## Deferred

- Full social feed backend.
- Pixel-perfect KakaoTalk brand replication.
- Per-thread appearance overrides beyond a later lightweight thread menu entry.
- Automatic generation of CSS themes from imported screenshots.

## Temporary Visual Companion

During discussion, mockups were created under `.superpowers/brainstorm/`. These are temporary visual companion files and should not be committed.
