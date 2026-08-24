# Design QA — System Notification Center

Date: 2026-08-24

## Comparison scope

- Selected source direction: `output/visual-review/notification-center-directions-20260824/01-app-groups.png`
- Implemented surface: `src/components/SystemNotificationShade.vue`
- Primary implementation evidence: `output/e2e/system-notification-shade/mobile-chrome-grouped-day.png`
- Viewport/state: simulated Pixel 5, unlocked phone, day mode, Chinese, three App-owned notification groups
- Full comparison: `output/design-qa/system-notification-shade/full-comparison.png`
- Focused top/group comparison: `output/design-qa/system-notification-shade/focused-comparison.png`

## Visual assessment

- Typography: passed. The implementation preserves the large system title, quiet unread count, compact App-group metadata, and strong notification subject hierarchy. Runtime type uses the product's system typography rather than baking generated-image lettering into the UI.
- Spacing and composition: passed. The top safe-area rhythm, segmented filter, stacked rounded groups, internal row dividers, and fixed bottom action follow the selected direction without horizontal overflow at the Pixel 5 viewport.
- Colors and tokens: passed. The translucent system shade is implemented with shared system color, border, shadow, focus, radius, and day/night tokens rather than direction-specific hard-coded colors. Day and night screenshots both retain readable contrast.
- Image and icon fidelity: passed. Generated illustrative icons were not copied as assets. Each group resolves the existing App identity, current built-in icon theme, and user App-icon override through the shared icon-presentation path.
- Copy and localization: passed. Titles, filters, empty/disabled states, bulk actions, accessible labels, and group counts are available in Chinese and English; notification-owned text remains source content and wraps within the group.

## Intentional functional adaptations

- Added an explicit close control because the production shade must have a discoverable keyboard and pointer exit in addition to scrim/Escape dismissal.
- Replaced one-card-per-App mock content with real App groups that can contain multiple persisted notifications and show group/unread counts.
- Kept per-row deep-link and dismiss actions visible, and retained a persistent footer action for marking all notifications read.
- Used live App identities and shared system tokens so Appearance changes remain authoritative instead of creating a second notification-only visual system.

## Functional QA represented by the evidence

- Tap and downward status-bar gesture entry
- All/Unread filters
- Mark one/all read, dismiss one, clear all
- Owner deep links without mutating owner records on notification dismissal
- Disabled and empty states
- Chinese/English, day/night, long text, focus/Escape/Tab handling, reduced motion
- Desktop Chromium and simulated Pixel 5 coverage; no physical-device claim

final result: passed
