# Shell And System Module Catalog

Updated: 2026-05-19

Use this file for shell-level and system-configuration modules.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Lock Screen | `/lock` | shell default surface | device-style lock state and notification return path |
| Home | `/home` | shell default surface | app entry shell, widgets, and future folders |
| Settings | `/settings` | Home app | system settings, backup, diagnostics, push, and automation |
| Appearance | `/appearance` | Home app | theme, wallpaper, app icons, and widget styling |
| Network & API | `/network` | Home app | provider setup and diagnostics |
| App Store | `/app-store` | Home app | app-entry visibility, summaries, and Home placement |
| Profile | `/profile` | Settings entry | player identity and AI context preview |

## 2. Module Notes

### Lock Screen

What it is:

- the default entry and locked-state shell surface;
- the place where stacked notifications can be seen before entering the phone.

What users mainly do here:

- unlock the device shell;
- tap notifications and jump into the owning surface after unlock.

### Home

What it is:

- the phone-style app grid and widget shell.

What users mainly do here:

- open apps;
- see lightweight widgets and shell status;
- access grouped folder-style entry families later on.

Important boundary:

- Home is a shell surface, not the owner of app data.

### Settings

What it is:

- the main control center for system-level user settings.

What users mainly do here:

- manage backup and restore;
- manage push and notification behavior;
- manage automation policies;
- open diagnostics and setup flows.

Important boundary:

- Settings owns configuration and safety controls, not ordinary content authoring.

### Appearance

What it is:

- the styling and shell-appearance workspace.

What users mainly do here:

- switch themes;
- choose wallpaper sources;
- adjust app icon presets;
- manage widget visual presentation.

Important boundary:

- Appearance changes presentation, not product ownership.

### Network & API

What it is:

- the provider setup and network-diagnostics surface.

What users mainly do here:

- configure provider endpoint and key;
- choose models;
- verify API and network readiness.

### App Store

What it is:

- a native-system app-entry library presented like a lightweight app store.

What users mainly do here:

- browse preinstalled app summaries;
- open apps;
- add app entries to Home slots;
- remove app entries from Home without disabling the app.

Important boundary:

- App Store should stay limited to app-entry visibility and Home placement. It must not become a widget/theme/download marketplace.

### Profile

What it is:

- the player-identity support surface.

What users mainly do here:

- manage self-profile context;
- preview or shape identity data that flows into AI context.

Important boundary:

- Profile is a support lane, not a second Contacts system.
