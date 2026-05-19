# Notification And App Icon Requirements

Updated: 2026-05-19

Purpose: record the current product decisions for notification layering and app-icon customization.

If older discussion or older partial docs conflict with this file, treat this file as the working source of truth for this topic.

Audience:

- PM
- design
- engineering
- QA
- future AI assistants

## 1. Implementation Snapshot

Current baseline:

1. in-shell notifications support module-grouped lock-screen stacks, shared module identity rendering, and unlocked top banners
2. external push defaults to a restrained `SchatPhone`-level title/body instead of mirroring in-shell copy directly
3. Settings offers `minimal`, `standard`, and `preview` external-push display modes
4. Appearance exposes preset-based app-icon customization for built-in Home modules
5. icon customization also flows into in-shell notification identity rendering
6. image-upload icon customization and richer push-copy customization remain future work

## 2. Core Product Decision

In-shell notifications and real device system notifications are different product layers and must not be treated as the same surface.

The intended behavior is:

- inside the virtual phone, notifications should preserve module identity
- outside the app, notifications should default to one installed-app identity: `SchatPhone`

This protects both immersion and privacy.

## 3. In-Shell Notification Rules

In-shell notifications must:

1. preserve module identity clearly
2. let the user distinguish whether something came from Chat, Map, Photos, Shopping, Reminders, or System
3. share the same identity logic across lock screen and unlocked banner surfaces
4. stay stable even if custom icon data is missing, reset, or invalid

## 4. External Push Rules

External push should default to a restrained `SchatPhone`-level presentation.

Default behavior:

1. title defaults to `SchatPhone`, not internal module names
2. default copy should avoid over-exposing internal module names, role names, or private immersive content
3. users choose verbosity through display modes instead of one hardcoded style

## 5. External Push Display Modes

### Minimal

Purpose:

- maximum privacy
- minimum noise

Behavior:

- title: `SchatPhone`
- body: generic reminder only
- no module-type leak by default
- no message preview by default

### Standard

Purpose:

- keep privacy while still revealing the type of update

Behavior:

- title: `SchatPhone`
- body: module-aware generic text such as "You received a new chat message" or "You have a new trip reminder"
- no raw message preview

### Preview

Purpose:

- closest to a real messaging-app/system-notification experience

Behavior:

- title still defaults to `SchatPhone` unless later product rules say otherwise
- body may show preview text when preview-safe content exists
- otherwise falls back to Standard-mode copy
- remains a user-controlled choice because it is the most expressive mode

## 6. App Icon Requirements

Module identity should be visible not only on the Home screen, but also inside in-shell notification surfaces.

Current direction:

1. built-in Home modules are customized through a safe preset-based icon system
2. customization currently means preset glyph plus accent combinations, not image upload
3. selected customization should flow consistently through:
   - Home tiles
   - Dock items
   - in-shell lock-screen notification center
   - in-shell unlocked banners
4. missing custom icon data must always fall back safely to built-in defaults

## 7. Current Implementation Contract

Current rendering contract:

1. in-shell notification presentation derives from module key, module label, icon glyph, and accent tone
2. external push presentation derives from locale, display mode, and notification payload
3. display mode is a system-level setting and applies to both:
   - instant push relay when the page is backgrounded
   - scheduled push deliveries such as arrival reminders or chat auto-reminders
4. app-icon customization is preset-based rather than image-upload based

## 8. Acceptance Criteria

This area is acceptable when:

1. in-shell notifications clearly show module identity even if external push stays generic
2. external push mode changes in Settings affect delivered payloads, not just UI labels
3. scheduled push and instant push honor the same external display-mode policy
4. Home icons, Dock icons, and in-shell notification icons remain visually consistent after customization changes
5. missing or invalid customization data never breaks rendering, navigation, or route jumps

## 9. Next-Phase Suggestions

Later improvements may include:

1. image-upload based custom app icons with file-size guard and safe fallback
2. richer notification-center management, such as per-module filters and grouped read state
3. deeper user-facing control over external push copy if product decides it is needed
4. a more explicit schema split between in-shell notification fields and external-push fields
