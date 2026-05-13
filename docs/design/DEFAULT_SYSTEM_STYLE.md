# Default System Style v1

Updated: 2026-05-13

This document defines the default native-system visual style for SchatPhone. It is the baseline style for the current version before any future WorldBook/worldview-driven visual profiles are introduced.

## 1. Style Name

```text
Default System Style v1
```

Working description:

```text
Soft iOS-like Personal OS
```

This style should feel like a real phone system that a user could live with every day. It can feel familiar to iOS users, but it should not copy iOS directly.

## 2. Positioning

Default System Style v1 is for the **Native System Layer**:

- Lock screen
- Home screen
- Status bar
- Home indicator
- Foreground notification banner
- System notification cards
- Settings
- Appearance customization
- Network/provider settings
- User profile
- WorldBook as system-owned world-kernel management
- System dialogs and confirmations

It does not force installed apps to share the same full visual language. Chat, Map, Gallery, Calendar, and future installed apps may keep their own identities.

### Entry-Context Boundary

Default System Style v1 applies when the user is operating in the phone shell or a system-owned management surface. It should not automatically take over every UI that uses system data.

Before applying this style to a page, panel, drawer, picker, or card, confirm the user's parent entry:

- From Lock, Home, Settings, Appearance, status chrome, notification center, or system dialogs: use Default System Style v1 for the container.
- From inside Chat, Map, Gallery, Calendar, Contacts, or another installed app: keep the host app's visual language for the container, even if the content reads WorldBook, Gallery assets, Contacts, Calendar reminders, or other shared data.
- From a full-screen route opened as its own app icon: use that app's default visual identity.
- From a shell notification: use system notification materials, with the source app contributing icon/accent only.

Immersion rule:

```text
Do not visually jump from an installed app into system styling just because the data is system-owned.
```

Examples:

- WorldBook management opened from Settings can use Default System Style v1.
- WorldBook context shown inside Chat should feel like a Chat thread/context panel.
- WorldBook context shown inside Map should feel like a Map clue/area card.
- Gallery assets selected inside Chat should feel like Chat attachments, not the full Gallery app.
- Calendar suggestions created inside Map should look like Map follow-up cues until the user opens Calendar.

## 3. Desired Feeling

The default system should feel:

- Real-phone-like
- Calm
- Personal
- Soft
- Clear
- Tactile
- Immersive
- Mature
- Stable
- Lightly premium

It should not feel:

- Like a web admin dashboard
- Like a SaaS control panel
- Too cyberpunk
- Too neon
- Too childish
- Too playful-toy-like
- Like a direct iOS clone
- Like a marketing landing page

## 4. Visual Keywords

Use these keywords when judging or generating system UI:

- Soft system glass
- Gentle depth
- Quiet translucency
- Wallpaper-aware surfaces
- Warm but controlled highlights
- Rounded but not toy-like
- Spatial hierarchy
- Compact phone-native controls
- Polished utility
- Private device

Avoid these keywords as main direction:

- Cyber HUD
- Neon dashboard
- Candy UI
- Heavy bento marketing layout
- Flat web admin
- Purple-blue AI gradient overload
- Over-glassmorphism
- Over-skeuomorphic metal/plastic

## 5. Color Direction

Default system colors should be restrained and wallpaper-aware. The previous vapor/Y2K direction used high-saturation pink, purple, cyan, and blue-violet gradients across wallpaper, app icons, notification accents, and magic/AI controls. That made the default OS feel stylized and trend-led instead of like a credible phone shell.

Recommended base behavior:

- Use neutral system surfaces as the foundation.
- Let wallpapers provide atmosphere.
- Use accent colors sparingly for active states, key actions, and app identity marks.
- Avoid making the whole OS dominated by one loud hue.
- Avoid neon pink, purple-blue, cyan glow, and candy gradients in the default system style.
- Keep legacy/world-specific expressive styles out of the default system baseline.

Suggested token direction:

```css
--system-bg: #f3f5f6;
--system-surface: rgba(252, 253, 253, 0.76);
--system-surface-strong: rgba(255, 255, 255, 0.90);
--system-surface-muted: rgba(239, 243, 245, 0.82);
--system-border: rgba(31, 42, 52, 0.11);
--system-text: #17202a;
--system-text-muted: rgba(23, 32, 42, 0.62);
--system-text-soft: rgba(23, 32, 42, 0.44);
--system-accent: #446f87;
--system-success: #3f8f67;
--system-warning: #a77736;
--system-danger: #b85353;
```

Dark or wallpaper-heavy surfaces may invert text and use stronger blur, but should keep contrast readable.

Current built-in theme variants:

- `default`: the primary low-saturation light system baseline.
- `zen` / `Graphite Quiet`: a redesigned low-saturation graphite dark variant. The `zen` id is retained only for saved-state compatibility; it should no longer be treated as the old pure-white theme.

## 6. Typography

Current font foundation is acceptable:

```css
Inter, Noto Sans SC, sans-serif
```

Typography direction:

- Keep system text highly legible.
- Use clear hierarchy, not huge marketing-style headings.
- Use smaller, denser headings inside settings and utility screens.
- Use tabular or stable numbers for clocks, counters, and timers.
- Avoid negative letter spacing except possibly for large lock-screen clock styling.

Suggested hierarchy:

- Lock clock: large, calm, low-weight.
- Page title: 20-24px, strong but not oversized.
- Section label: 11-12px, medium weight, muted.
- List title: 14-15px, medium/semibold.
- Supporting text: 11-12px, muted.
- Button text: 12-14px, semibold.

## 7. Shape, Radius, and Density

System UI should feel phone-native rather than webpage-like.

Recommended radius language:

- App icons: 16-20px depending size.
- Small icon containers: 10-12px.
- Settings rows/groups: 18-22px.
- Notification cards: 18-22px.
- Dock: 28-36px.
- Pills and switches: 999px.

Avoid:

- Excessively large card radii everywhere.
- Nested card stacks that look like a web dashboard.
- Tiny desktop-web controls.
- Oversized hero sections inside system tools.

## 8. Material, Shadow, and Blur

Use depth to support phone immersion.

Material direction:

- Soft translucent bars and cards over wallpaper.
- White or near-white system panels on utility pages.
- Subtle borders for separation.
- Shadows should be broad and low-opacity, not harsh.
- Blur should support readability and layering, not become decoration.

Suggested material levels:

1. **Wallpaper layer**
   The emotional background.
2. **System chrome**
   Status bar, dock, foreground banners.
3. **System surface**
   Settings groups, notification cards, app icon labels.
4. **Overlay**
   Dialogs, action sheets, edit mode controls.

## 9. Motion and Interaction

Default motion should feel responsive and quiet.

Rules:

- Press states should be tactile and short.
- Page transitions should reinforce phone navigation.
- Notification banners should enter/exit softly.
- Drag/edit mode may have slightly more expressive motion, but still controlled.
- Respect reduced-motion preferences when implemented.

Suggested durations:

- Press feedback: 90-140ms.
- Small state transition: 140-180ms.
- Notification/banner transition: 200-260ms.
- Page transition: 240-320ms.
- Drag/drop confirmation: 260-380ms.

Avoid:

- Bouncy decorative motion everywhere.
- Slow cinematic transitions.
- Animating layout-heavy properties when transform/opacity would work.

## 10. Native System Surface Guidance

### Lock Screen

Goal:

- First impression of a real device.

Direction:

- Wallpaper-forward.
- Clock is elegant and calm.
- Notification stack is readable and layered.
- Unlock affordance is subtle but discoverable.
- Use app accents inside system notification cards.

Avoid:

- Overly dense notification cards.
- Too much blur that destroys wallpaper mood.
- Large decorative widgets before basic lock-screen clarity.

### Home Screen

Goal:

- Main proof that this is a phone OS.

Direction:

- App icons and widgets should feel arranged on a device, not a dashboard.
- Dock should be a strong native-system anchor.
- Widget surfaces should be softer and less card-heavy than web widgets.
- Edit mode can be functional, but should still feel OS-native.

Avoid:

- Desktop-like grid density.
- Too many unrelated icon styles.
- Home widgets that look like embedded web cards.

### Settings

Goal:

- Native system management, not a web admin page.

Direction:

- Grouped list structure.
- Calm background.
- Compact but readable rows.
- Consistent icon containers.
- Clear destructive/safety actions.

Avoid:

- Dashboard panels.
- Excessive blue links and web-form styling.
- Unrelated card sizes and row densities.

### Appearance

Goal:

- Visual customization center.

Direction:

- Should feel more visual and preview-driven than normal settings.
- Include phone-like previews where useful.
- Theme/wallpaper/icon controls should show their effect clearly.

Avoid:

- Pure settings list with no visual affordance.
- Large raw-code emphasis before normal users can understand the visual result.

### Network / Profile / WorldBook

Goal:

- System-owned utility surfaces.

Direction:

- Use the same system row, grouped panel, and form language.
- WorldBook may contain rich content, but its management shell remains system-owned.

Avoid:

- Making these pages feel like unrelated web apps.

## 11. Installed App Relationship

Default System Style v1 should not flatten installed app identities.

Allowed:

- Chat keeps a Kakao-like chat identity.
- Map has an exploration/travel identity.
- Gallery feels like a photo/asset app.
- Calendar feels schedule-focused.

Required:

- Safe areas align with the system shell.
- Back and close controls remain predictable.
- Dialogs and destructive confirmations use system modal rules.
- App notifications rendered by the OS use system notification materials.
- App icon/accent metadata can flow into OS surfaces.
- Embedded shared-data panels follow the current app's parent context unless the user explicitly navigates to a system-owned full page.

Practical test:

```text
If the user would say "I am still inside Chat/Map/Gallery", do not restyle the surface as Settings.
```

## 12. Future World Visual Profiles

Future versions may allow WorldBook/worldview to influence the phone's visual identity.

Current decision:

- Do not implement world-bound visual profiles yet.
- Keep Default System Style v1 as the baseline.
- Reserve conceptual space for future visual layers.

Future layering idea:

```text
Native System Style
  -> World Visual Profile
    -> Installed App Identity
```

Example:

- Native System Style: Default System Style v1
- World Visual Profile: Near-future quiet city
- Installed App Identity: Chat remains Kakao-like, but adopts a subtler wallpaper/accent bridge

Do not build this until the product direction is confirmed.

## 13. First Implementation Direction

Recommended first code phase:

1. Add semantic system tokens to `src/style.css`.
2. Polish `App.vue` foreground banner/status chrome.
3. Polish `LockScreen.vue` using the default system style.
4. Polish `HomeView.vue` dock/icons/widgets without changing layout behavior.
5. Rework `AppearanceView.vue` into a more visual customization center.
6. Only then normalize Settings and other system utility pages.

The first implementation should not touch installed app identities unless a shared OS surface requires it.
