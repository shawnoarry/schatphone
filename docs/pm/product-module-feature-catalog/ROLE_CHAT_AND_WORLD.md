# Role Chat And World Module Catalog

Updated: 2026-05-19

Use this file for role-facing, chat-facing, worldview, and runtime-review surfaces.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Chat | `/chat`, `/chat/:id` | Home app | AI conversation and thread interaction |
| Chat Directory | `/chat-contacts` | Chat/context entry | Chat-side binding and service-account entry management |
| Contacts | `/contacts` | Home app | global role archive and role-centered management |
| WorldBook | `/worldbook` | Settings/context entry | worldview and reusable knowledge points |
| World Hub | `/control-center` | optional hidden app | runtime review and narrow control |
| Cheats | not frozen yet | future hidden surface | future stronger override lane |

## 2. Module Notes

### Chat

What it is:

- the strongest everyday interaction surface in the product.

What users mainly do here:

- chat with bound role threads or service-account style threads;
- send rich messages;
- consume AI replies and structured message surfaces.

Important boundary:

- Chat owns message history and thread behavior, not global role truth.

### Chat Directory

What it is:

- the Chat-side target list and binding surface.

What users mainly do here:

- decide which roles enter Chat;
- manage service-account style entries;
- manage Chat-side target readiness and binding.

Important boundary:

- Chat Directory is not the global role archive.

### Contacts

What it is:

- the global role archive and role-centered management hub.

What users mainly do here:

- create or edit role profiles;
- review relationship snapshots and memory groups;
- perform destructive role-level actions such as reset and delete flows.

Important boundary:

- Contacts is the main role-management hub, not Chat Directory.

### WorldBook

What it is:

- the shared worldview and reusable knowledge-point layer.

What users mainly do here:

- manage reusable world-context entries;
- bind or reference knowledge context from several modules.

Important boundary:

- WorldBook supports context and continuity; it is not the main place where ordinary app records should be authored.

### World Hub

What it is:

- the optional runtime review and narrow-control app.

What users mainly do here:

- inspect event-runtime or relationship-runtime state;
- review pending effects and selected cleanup flows.

Important boundary:

- World Hub is optional and should not become the normal data-entry surface.

### Cheats

Current status:

- future-only stronger override lane;
- not yet a frozen public product surface.

Important boundary:

- do not confuse it with the current World Hub baseline.
