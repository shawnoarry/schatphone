# Role Chat And World Module Catalog

Updated: 2026-05-29

Use this file for role-facing, chat-facing, worldview, and runtime-review surfaces.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Chat | `/chat`, `/chat/:id` | Home app | AI conversation and thread interaction |
| Chat Directory | `/chat-contacts` | Chat/context entry | Chat-side binding and service-account entry management |
| Contacts | `/contacts` | Home app | global role archive and role-centered management |
| WorldBook | `/worldbook` | Settings/context entry | worldview and reusable knowledge points |
| Book | `/book` | planned Home/App Store app | reusable text-source library for worldbook documents and knowledge/reference notes |
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
- after the Book text-library slice, WorldBook should activate selected Book sources instead of becoming a long-form text warehouse.

### Book

What it is:

- the planned reusable text-source library for long worldbooks, knowledge notes, rules, glossary material, and references.

What users mainly do here:

- import or create `.txt`, `.md`, and structured worldbook export files;
- edit reusable source documents in a guarded workspace;
- organize text by type, category, tag, lock state, and active-source usage.

Important boundary:

- Book stores and edits source text; it does not decide what is active in Chat.
- WorldBook remains responsible for activation, Pack expansion, and prompt/runtime governance.
- Book is not Files and not the future novel/fanfic reader.

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
