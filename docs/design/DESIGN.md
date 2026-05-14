# SchatPhone Design System

Updated: 2026-05-13

This document defines the visual ownership model for SchatPhone. SchatPhone is an immersive virtual-phone OS shell, not a single ordinary app. Its design must distinguish between the native phone system and the installed apps running inside it.

## 1. Core Principle

SchatPhone has two visual layers:

1. **Native System Layer**
   The phone shell itself: lock screen, home screen, status bar, system notifications, settings, appearance controls, permissions, backup, storage, and other OS-level surfaces.

2. **Installed App Layer**
   Individual app modules inside the phone: chat, map, gallery, calendar, wallet, stock, files, phone, and future app-like modules. These may have their own product identity, layout language, and mood.

The system layer should feel coherent and device-owned. Installed apps may feel distinct, but they must still obey the basic phone shell constraints: safe areas, touch targets, legibility, accessibility, status bar behavior, navigation affordances, and performance.

### Entry-Context Ownership Rule

Visual ownership is determined by the user's current entry and navigation context before it is determined by data ownership or code location.

Do not decide a surface's style only by asking which store, file, or data model it uses. First trace how the user actually arrives there:

1. If the user enters from the Home app icon, the opened module owns the app-level visual identity.
2. If the user enters from Settings, Appearance, Lock, Home, the status bar, notification center, or another OS shell surface, the native system layer owns the visual frame.
3. If the user is already inside an installed app, in-app drawers, pickers, previews, subpages, cards, and action sheets should keep that app's visual logic, even when they read or write system data.
4. If a shell surface renders app content, such as a lock-screen notification or foreground banner, the shell owns the container while the app may contribute icon, label, and accent.
5. If the same data can be reached from multiple places, design the surface as context-aware or split it into host-local presentations instead of forcing one global visual style.

Short rule:

```text
Entry and parent context decide visual ownership.
Data source decides content structure, not the outer style.
```

This is essential for immersion. A Chat-local WorldBook summary should feel like part of Chat. A Map-local Calendar cue should feel like part of Map. A Settings-owned WorldBook management page can remain system-like because the user reached it as a system utility.

The current baseline native-system style is defined in:

```text
docs/design/DEFAULT_SYSTEM_STYLE.md
```

The current entry-based ownership map is defined in:

```text
docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md
```

## 2. Native System Layer

The native system layer should be the main visual anchor of SchatPhone.

Design direction:

- Familiar to iOS users, but not a direct iOS clone.
- Calm, tactile, translucent where useful, and strongly spatial.
- Premium but restrained: avoid loud decoration and overly theatrical gradients.
- Built around a virtual device feeling: lock screen, wallpaper, dock, app icons, widgets, status bar, notification surfaces, and settings should feel like one OS.

Native system surfaces:

- `src/App.vue`
  - Device shell
  - Status bar
  - Home indicator
  - Foreground notification banner
  - Wallpaper application
- `src/views/LockScreen.vue`
  - Lock screen
  - Clock/date
  - Lock notifications
  - Unlock affordance
- `src/views/HomeView.vue`
  - Home pages
  - Widgets
  - App icons
  - Dock
  - Page indicator
  - Fixed Home layout slots
  - Experimental layout edit mode, if explicitly enabled
- `src/views/SettingsView.vue`
  - System settings hub
  - Backup, storage, notification, diagnostics, automation settings
- `src/views/AppearanceView.vue`
  - Theme, wallpaper, font, icon, widget, and visual customization controls
- `src/views/NetworkView.vue`
  - System-level AI/network provider configuration
- `src/views/UserProfileView.vue`
  - System-owned user identity
- `src/views/WorldBookView.vue`
  - System-owned world kernel and knowledge management
- `src/components/AppDialogHost.vue`
  - System modal/dialog layer
- `src/components/settings/*`
  - System settings list and quick-access components

Native system visual rules:

- Use shared tokens for surfaces, text, borders, radius, shadows, blur, and motion.
- Prefer system list rows, grouped settings panels, translucent bars, and clear hierarchy.
- Primary navigation should feel predictable and OS-level.
- Avoid app-specific color dominance unless the page is explicitly a theme preview.
- Keep Chinese, English, and Korean text able to fit without cramped controls.
- User-visible copy must be product copy. Do not expose developer comments, TODOs, debug labels, implementation notes, component names, store names, route names, class names, or token names in the rendered interface unless the page is explicitly a developer tool.

### Home Layout Rule

Home is a native-system surface. Its default layout model should preserve the feeling of a stable phone OS rather than a free-form desktop board.

Default direction:

- Use a fixed page skeleton with named widget slots.
- Each slot has a stable size, such as `1x1`, `2x1`, `2x2`, `4x2`, or `4x3`.
- Users customize Home by replacing the content inside a slot, not by freely dragging every item.
- A widget picker opened from a slot should only show widgets that match that slot size.
- App entries and the Dock stay in fixed system-owned zones.
- Users may choose which app entries appear on Home, but app icons should not compete with widget placement.
- Extra apps should go to an App Library, More page, or another system-owned overflow surface.

Current implementation note:

- The current store uses `homeWidgetPages` as an ordered page array. Future visual work should evolve this toward a slot model, for example `homeLayoutSlots: [{ page, slotId, size, widgetId }]`.
- Free drag can remain as an experimental or developer-only feature, but it is not the default visual direction.

## 3. Installed App Layer

Installed apps can have their own visual identity. This is intentional and helps the phone feel like it contains separate apps rather than one uniform dashboard.

Installed app surfaces:

- `src/views/ChatView.vue`
  - Chat app
  - Currently allowed to keep a Kakao-like visual direction for chat surfaces.
- `src/views/ChatDirectoryView.vue`
  - Chat contacts/service directory
  - App-like, but should share some system list discipline because it manages chat accounts.
- `src/views/ContactsView.vue`
  - Contacts app / role archive
  - Can feel like a native utility app unless a future world theme overrides it.
- `src/views/GalleryView.vue`
  - Gallery / asset hub app
  - Can lean toward a photo-library or asset-manager identity.
- `src/views/MapView.vue`
  - Map simulation app
  - Can use travel, route, progress, and exploration visual motifs.
- `src/views/CalendarView.vue`
  - Calendar app
  - Should remain readable and schedule-oriented.
- `src/views/PhoneView.vue`
  - Phone app placeholder/MVP
- `src/views/WalletView.vue`
  - Wallet app placeholder/MVP
- `src/views/StockView.vue`
  - Stock app placeholder/MVP
- `src/views/FilesView.vue`
  - Files app MVP
- `src/views/MoreView.vue`
  - More app MVP
- Future modules that appear as app icons on Home

Installed app visual rules:

- App identity is allowed; app chaos is not.
- Each app may define its own accent, background, component shapes, and mood.
- Apps must preserve system safe areas and status bar readability.
- Apps should still use common base controls where they behave like OS controls: back buttons, dialogs, permission notices, destructive confirmations, file pickers, and empty states.
- If an app mimics a real-world style, it should be treated as "inspired by", not a direct brand copy.
- App-local copy can match the app's tone, but it must still avoid development leakage such as internal object names, placeholder notes, debugging text, and implementation explanations.

## 4. Hybrid Surfaces

Some surfaces sit between OS and installed app.

Hybrid surfaces:

- Chat directory and contacts management
- Gallery asset picker when opened from another app
- WorldBook context previews inside Chat, Map, or Calendar
- App icon customization
- Notification previews that refer to an app but are rendered by the OS

Rule:

The active parent context owns the container. Embedded data may preserve its semantic marks, but it should not visually pull the user out of the parent app or system surface.

Example:

- A Chat notification on the lock screen should use the system notification card layout, but may use the Chat icon/accent.
- A Gallery picker opened inside Chat should feel like a Chat attachment picker that happens to show Gallery assets, not like the full Gallery app or a system settings page.
- A WorldBook preview inside Map should not turn Map into the WorldBook page; it should present knowledge context as a compact Map-local module.
- A Calendar suggestion produced by Map should look like a Map trip/reminder cue until the user explicitly opens the Calendar app.
- A role asset binding panel inside Contacts should stay in the Contacts/role-archive visual language, even if it reads Gallery folders and WorldBook knowledge points.

Before redesigning a hybrid surface, write down:

```text
Current user path:
Parent context:
Data sources:
Visual owner:
Allowed borrowed accents:
Must not visually jump to:
```

## 5. Current Classification

This table describes the default ownership when the route is opened as a full-screen destination. In-app embedded versions must still follow the Entry-Context Ownership Rule.

For detailed entry paths, cross-module panels, and current risk areas, use:

```text
docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md
```

| Route / Module | Default Visual Ownership | Entry Context Notes |
| --- | --- | --- |
| `/lock` | Native System | Lock screen, clock, notification stack. |
| `/home` | Native System | Home screen, widgets, app icons, dock. |
| Global status bar / home indicator | Native System | Owned by `App.vue`. |
| Foreground notification banner | Native System + App Accent | System card with app icon/accent. |
| `/settings` | Native System | OS settings hub. |
| `/appearance` | Native System | Visual customization center. |
| `/network` | Native System | Provider/network configuration when reached as system setup. |
| `/profile` | Native System | System-owned user identity when reached as OS profile. |
| `/worldbook` | Native System | Full management page is system-owned when reached from Settings/system utilities. In-app WorldBook previews inherit the host app. |
| `/chat` list | Installed App | Chat app entry. May use chat identity. |
| `/chat/:id` | Installed App | Chat thread. Kakao-like direction is acceptable. |
| `/chat-contacts` | Installed App: Chat | Chat-owned directory/settings surface, even if it uses contacts/profile data. |
| `/contacts` | Installed App / Utility App | Role archive and contacts utility. Keep role-management identity; app-local panels can read Gallery/WorldBook without turning into those modules. |
| `/gallery` | Installed App | Photo/asset app. Gallery pickers embedded elsewhere inherit the host app, not the full Gallery page. |
| `/map` | Installed App | Local simulation app with exploration identity. Calendar and WorldBook cues inside Map stay Map-local. |
| `/calendar` | Installed App | Schedule/reminder app. Map-derived reminders inside Calendar use Calendar layout with source attribution. |
| `/phone` | Installed App | MVP placeholder for now. |
| `/wallet` | Installed App | MVP placeholder for now. |
| `/stock` | Installed App | MVP placeholder for now. |
| `/files` | Installed App / Utility App | File utility. If opened as a system import/export picker later, reassess by entry context. |
| `/more` | Installed App | MVP collection/overflow app. |
| App dialogs | Native System Mechanics + Host Context | Dialog mechanics are system-owned, but app-local dialogs should keep the host app's accent and wording context where appropriate. |

## 6. Theme Strategy

Current theme state:

- `default`
- `zen` / `Graphite Quiet` (legacy id, redesigned theme)

Short-term direction:

- Treat `Default System Style v1` as the current default native-system baseline.
- `y2k` was a legacy vapor-style theme and is no longer part of the default selectable system themes. Persisted `y2k` state should migrate to `default`.
- Keep the theme-switching mechanism, but avoid old novelty themes. Secondary themes should be mature system variants, such as low-saturation dark graphite, not vapor, neon, candy, or pure decorative skins.
- Keep themes as OS-level visual modes.
- Do not force every installed app to adopt the same full visual language.
- OS themes may influence system surfaces, wallpaper, app icons, status bar, dock, and notification materials.
- Installed apps may choose whether to inherit only base tokens or also adapt their own palette.

Future world-theme direction:

SchatPhone may later map WorldBook/worldview settings to larger visual themes. This is a future extension and should not block the current visual rebuild.

Reserve these concepts for later:

- `system visual theme`: OS shell theme.
- `world visual profile`: world/story-driven mood layer.
- `app visual identity`: per-app visual style.
- `theme inheritance policy`: whether an installed app follows the OS theme, follows the world profile, or keeps its own identity.

Possible future data shape:

```js
{
  systemThemeId: 'aurora',
  worldVisualProfileId: 'near-future-soft',
  appThemePolicies: {
    chat: 'app-owned',
    map: 'world-aware',
    calendar: 'system-native'
  }
}
```

This is only a planning placeholder. Do not implement it until the product direction is confirmed.

## 7. First Visual Build Priorities

1. Stabilize the Native System Layer first.
2. Define shared visual tokens in `src/style.css`.
3. Polish `App.vue`, `LockScreen.vue`, `HomeView.vue`, and `AppearanceView.vue`.
4. Create reusable system components for settings rows, grouped panels, icon tiles, notification cards, and system buttons.
5. Preserve app-specific identity for Chat, Map, Gallery, and Calendar.
6. Only then refine installed apps one by one.

## 8. Design References

Use `awesome-design-md` as a reference library, not as a direct style source.

Current local reference path:

```text
D:\github\_references\awesome-design-md
```

Useful references to inspect later:

- `apple`: familiar OS-like clarity, spacing, and restraint.
- `raycast`: compact command surface and refined dark UI.
- `linear.app`: disciplined density and low-noise app chrome.
- `superhuman`: polished communication app patterns.
- `notion`: calm content management and editable knowledge surfaces.

SchatPhone should borrow principles, not copy brand appearance.
