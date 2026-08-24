# Notification, Workplace, Fandom, Tickets, And Travel Shell Plan

Updated: 2026-08-24

Status: `PRODUCT_DIRECTION_ACCEPTED / NOTIFICATION_SYSTEM_S1_DONE 2026-08-24 / WORKPLACE_S1_DONE 2026-08-24 / FANDOM_S1_DONE 2026-08-24 / TICKETS_S1_DONE 2026-08-24 / TRAVEL_S1_DONE 2026-08-24 / FOLLOW_ON_SHELL_PORTFOLIO_S1_DONE 2026-08-24`

## 1. Purpose

This document records the accepted shell sequence after the Mail, Browser, Community core, Healthcare, and Housing S1 wave. It is a product and ownership plan, not a second roadmap and not implicit authorization for EVE-5 or another Event Surface.

The accepted visible product sequence is:

1. unlocked System Notification Center — `DONE 2026-08-24`;
2. Organization Workplace, beginning with a K-pop agency template — `S1 DONE 2026-08-24`;
3. one fandom product combining fan community and artist-message subscription — `星集 / Aster S1 DONE 2026-08-24`;
4. Tickets and cultural activities — `GATE / 入场 S1 DONE 2026-08-24`;
5. Travel and hotel — next planned shell.

Event Runtime remains a hidden coordinator. Each visible effect must appear through the native product that owns the message, task, schedule, publication, ticket, booking, payment, route, or attendance record.

## 2. Shared Product Rule

The shells form one causal ladder:

```text
owner-confirmed fact or request
-> native organization/public/transaction record
-> system notification
-> user opens the responsible App
-> user performs a real owner action
-> downstream owner confirms the result
-> Event Runtime retains provenance and progression only when an optional event recipe is active
```

No shell may use an event card as a substitute for its ordinary product loop. Disabling optional events must leave ordinary workplace communication, community reading, ticket purchase, travel booking, notification history, Calendar, Map, Wallet, Phone, and Chat usable.

## 3. System Notification Center

### 3.1 Product classification

The Notification Center is a native phone layer, not a Home App and not an Event Home.

Existing foundations already include:

- foreground floating banners in the unlocked shell;
- a grouped lock-screen Notification Center;
- persisted system notification history;
- unread, mark-read, dismiss, clear-all, route, icon, source, sound, haptic, and external-push seams;
- Settings controls for notification enablement, permission, preview policy, sound, and external push.

The landed S1 slice extends these foundations rather than creating a new notification Store or replacing the lock-screen experience.

### 3.2 Entry model

- Primary unlocked entry: tap or pull down from the status bar to open a system-owned notification shade.
- Locked entry: the existing lock-screen grouped notification stack.
- Secondary configuration entry: Settings -> Notifications.
- No Home icon, App Store entry, ordinary route card, or separate Notification App.

Settings owns policy. The notification shade owns daily reading and handling.

### 3.3 S1 scope

- all and unread views;
- grouping by resolved source App/module;
- source identity, time, title, preview, read state, and route availability;
- open target, mark one read, mark all read, dismiss one, and clear all;
- honest empty and disabled states;
- desktop click/tap and phone-sized status-bar pull-down/tap access;
- day/night, long text, keyboard, screen-reader labels, reduced motion, and zero horizontal overflow;
- the same underlying records and owner routes as the lock screen and foreground banner.

Dismissal changes only notification presentation. It never cancels a Calendar event, rejects a workplace task, edits a Community post, changes an order, or resolves an Event Instance.

### 3.4 Later owner depth

- per-App notification preferences and channels;
- quiet delivery and grouping policy;
- richer action descriptors validated by the source owner;
- notification retention/backup policy beyond the current bounded system history;
- real external-push delivery proof and installed-PWA/physical-device behavior.

## 4. Organization Workplace

### 4.1 Product role

Organization Workplace is the user's native entry for belonging to an organization and performing work or study. It supersedes the narrow `Work/HR` shell concept without turning Calendar, Agenda Journey, Chat, Mail, Files, Wallet, Map, or Event Runtime into subordinate pages.

The first reference template is a fictional K-pop agency because the user primarily intends to play an artist identity. The architecture must also compose manager, assistant, producer, ordinary employee, student, teacher, class, project team, and custom-world workplaces from the same bounded modules.

### 4.2 Stable modules

```text
Organization Workplace
|- Today overview
|- Teams and membership
|- Internal channels and work messages
|- Tasks and deadlines
|- Schedule proposals and approvals
|- Attendance and explicit status reports
|- Requests and approvals
|- Files and contracts
|- Organization identity and credentials
`- Notification preferences and history deep links
```

The UI is assembled from allowlisted modules and role capabilities. AI may recommend a template or draft bounded copy, but it must not generate arbitrary authorization logic or become the source of membership, contract, attendance, approval, or identity truth.

### 4.3 Role-specific first viewport

| Role | First-viewport emphasis |
| --- | --- |
| Artist | today's call sheet, team, confirmations, content review, status report, company credential |
| Manager | represented artists, conflicts, approvals, assignments, external coordination |
| Assistant | current tasks, pickup/arrival, materials checklist, explicit report, team channel |
| Producer | project rooms, recording schedule, files, review deadlines, works references |
| Employee | department channel, tasks, meetings, attendance, leave and approvals |
| Student | class channel, timetable, assignments, deadlines, attendance and clubs |

Role switching is never a permission-creation control. A user may switch only between current valid memberships or delegated roles already issued by an organization owner.

### 4.4 Identity and authorization

The model separates:

1. identity credential: who the person is;
2. organization membership: which organization represents or includes them;
3. role assignment: artist, manager, assistant, employee, student, teacher, or delegated staff;
4. channel capability: what that role may read, draft, publish, approve, sign, or administer;
5. external entitlement: what another App may unlock from the credential.

For an artist-community entry, the company attests affiliation and the fandom platform grants the product entitlement. A self-authored profile value may begin an application but cannot independently grant artist publishing access.

The first future owner contract must cover pending, approved, suspended, revoked, expired, transferred, and stale-revision states. It must support group and individual channels, multiple agencies or labels, independent artists, trainees, split music/acting representation, company transfer, and delegated managers without reducing authorization to one `isArtist` flag.

### 4.5 Calendar, Agenda Journey, Map, and attendance

The products integrate without merging ownership:

```text
Workplace proposes and approves why the activity exists
-> Calendar owns confirmed date/time/place/participants
-> Agenda Journey owns departure, arrival, skip, cancel, and activity execution
-> Map owns route, ETA, current-position provenance, and place session
-> Workplace owns the explicit work status or attendance record
```

Workplace may show read-only schedule projections and open Calendar or Agenda Journey. It must not persist a second canonical schedule. Coordinates or passive presence never create attendance. A valid attendance action requires an organization task/schedule reference plus an explicit user check-in or status report; Map/place-session evidence may support it but cannot manufacture intent.

### 4.6 Mail and Chat boundary

- Workplace owns internal organization channels, assignments, approvals, and work-thread history.
- Mail owns formal external correspondence, long-form institutional letters, delivered attachments, and formal copies.
- Chat owns private relationships and ordinary social conversation.
- Workplace may send notifications and deep links, but it does not copy Chat or Mail histories.

### 4.7 First S1 shell

The first agency S1 shell should prove:

- an artist-first Today view;
- one organization membership and visible team roster;
- internal channel reading and one local message draft/send loop;
- task completion and one explicit status-report loop;
- schedule proposal accept/decline state without writing Calendar yet;
- read-only Calendar/Agenda/Map handoff previews;
- an artist-entry application with pending status only, without granting fandom publishing rights;
- local bounded preview persistence and honest S1 boundaries.

Manager, assistant, student, and employee templates should be covered by pure fixture/resolver tests even if the first visible reference remains artist-first.

## 5. Unified Fandom Community And Artist Messages

### 5.1 One product, two workspaces

Fan community and artist-message subscription are one branded App, not two independent Home entries.

The consumer workspace contains:

- artist and group communities;
- official notices and public schedules;
- fan posts and media;
- artist-message subscriptions;
- membership and subscription state;
- notification and deep-link handling.

The artist workspace contains:

- personal and group channel selection;
- post and subscription-message drafts;
- media attachment references;
- company review when required;
- publish status and corrections;
- channel identity and delegated staff visibility.

The workspace switch appears only after a valid platform entitlement exists. It consumes permission; it never creates permission.

### 5.2 Approval chain

```text
user applies to claim an artist identity
-> organization membership/role is checked
-> representing agency or label attests affiliation
-> fandom platform issues a scoped artist entitlement
-> artist workspace becomes available
```

Independent artists use a separate platform-review path. AI may draft notices or request summaries but cannot approve identity, affiliation, a contract, a channel, or publishing authority.

### 5.3 Community core relationship

The existing Ripple S1 shell remains the generic public Community/Media fixture proof. The fandom App should reuse future Community account, claim, fact-reference, post, correction, and publication Interfaces rather than copying them. Artist subscription messages are committed platform content, not ordinary Chat private messages.

### 5.4 First event-integrated chain

```text
Calendar or Workplace confirms a public schedule fact
-> artist/company prepares a notice
-> company review applies when required
-> Community owner commits the publication
-> System Notification Center presents it
-> fan opens the fandom App detail
```

Event Runtime may coordinate waiting, timeout, provenance, and optional branching. It does not write the schedule, approve the artist, publish the post, or mark the fan's response as world truth.

## 6. Tickets And Cultural Activities

Tickets is an independent S1 App because browsing and managing admission remain useful without an event.

First product depth:

- concerts, music shows, films, exhibitions, festivals, and fan events;
- list/search/filter and event detail;
- sale, lottery, reservation, waitlist, and sold-out states;
- local favorite and application drafts at S1;
- future Wallet settlement, Calendar confirmation, Map venue, Agenda Journey, Mail receipt, and system notification Interfaces;
- ticket wallet/history and cancellation/refund states at S2.

The performance itself belongs to Calendar/Agenda Journey/Activity Session or an authored activity template. Tickets owns admission and purchase truth, not the event experience.

## 7. Travel And Hotel

Travel is an independent S1 App for destination and stay planning, not a second Map or Calendar.

First product depth:

- destination and hotel discovery;
- search, filters, favorites, recent views, and booking drafts;
- hotel/place references owned by Map;
- stay dates and guests;
- room, price, cancellation, unavailable, and source-stale states;
- future Wallet payment, Mail confirmation, Calendar stay, Map route, Agenda Journey, and system notification Interfaces.

Travel owns reservation and itinerary-grouping truth only after S2. Map owns places/routes; Calendar owns confirmed timed plans; Agenda Journey owns execution.

## 8. Implementation Sequence And Gates

### 8.1 Progress ledger

This table is the bounded handoff view for the Notification Center -> Workplace -> unified fandom -> Tickets -> Travel sequence. The cross-project shell portfolio and maturity index is `EVENT_APP_SHELL_PRIORITY_MATRIX.md`; update that master ledger after every accepted shell round. Do not infer completion from screenshots or route presence alone.

| Product surface | Current maturity | Current result | Next accepted work | Not yet complete |
| --- | --- | --- | --- | --- |
| Mail / Daon Mail | `S1 DONE` | ordinary mail loop plus separately accepted explicit AI Receive | future S2 owner and notification arrival | production mailbox owner, backup, real delivery, notification write |
| Browser / Prism | `S1 DONE` | Help and current-world search, local history/bookmarks | future public index/Web Adapter depth | private-source search, production external provider, event integration |
| Community core / Ripple | `S1 DONE` | fixture accounts/posts/follow/bookmark/read | Community Fact/Claim/Post owner | production publication, corrections owner, event chain |
| Healthcare / Ondam Care | `S1 DONE` | discovery, local appointments, authored reports, Map handoff | Healthcare owner and appointment interfaces | Calendar/Wallet/notification writes, real health data |
| Housing / Jari | `S1 DONE` | discovery, filters, favorites, viewing drafts, Map handoff | Housing owner and viewing interfaces | Calendar/Wallet/notification writes, residence/contract truth |
| System Notification Center | `SYSTEM S1 DONE / UNLOCKED_SHADE DONE 2026-08-24` | foreground banner, lock-screen groups, persisted bounded history, Settings controls, unlocked App-grouped shade | per-App channels and retention policy | physical-device push proof |
| Organization Workplace | `S1 DONE 2026-08-24` | Work Hub artist-first Today/Channels/Work/Org shell, in-App display naming, bounded local preview state, stable owner handoffs | future organization membership/credential owner | production membership, attendance truth, credential grants, Calendar writes, Event Runtime chain |
| Unified fandom community | `S1 DONE 2026-08-24` | `星集 / Aster` consumer shell, locked artist workspace, Work Hub pending return, local preview state, Ripple post-ID projection | future Community/platform owner contracts | artist workspace, platform entitlement owner, publication chain, Wallet subscription, system notification delivery |
| Tickets | `S1 DONE 2026-08-24` | `GATE / 入场` discovery, search/detail, explicit availability states, local favorites/recent/intent drafts | future ticket/admission owner contracts | inventory, seats, lottery result, Wallet settlement, Calendar/Map/Agenda integration, refunds, notification delivery |
| Travel / Hotel | `S1 DONE 2026-08-24` | `漫泊 / ROAM` destination/stay discovery, explicit source states, local favorites/recent views and stay-intent drafts | future travel/reservation owner contracts | booking inventory, Wallet/Mail/Calendar/Map/Agenda integration |
| Intercity transport | `S1 DONE 2026-08-24` | `联程 / VIA` multimodal comparison, source-state handling, passenger/fare selection, local trip-intent drafts | transport/booking owner contract | real schedules/inventory, ticketing, Wallet/Mail/Calendar/Map/Agenda/notification integration |
| Creator Rights / Works | `S1 DONE 2026-08-24` | `谱权 / CREDO` works, roles, rights-share previews, royalty statements, declaration drafts | institution/works/rights/royalty owner contract | certification, registration, shares, settlement, Wallet/Files/Music integration |
| Parcel / Post | `S1 DONE 2026-08-24` | `递送 / POSTA` parcel lookup, delivery inbox, pinning, local send drafts | logistics/shipment owner contract | labels, pickup, address/signature/delivery proof, Shopping/Map/notification integration |
| Jobs / Career | `S1 DONE 2026-08-24` | `机会 / NEXT` jobs, auditions, invitations, saved opportunities, application/profile drafts | opportunity/application/invitation owner contract | organization authority, submission receipts, Calendar/Mail/Work Hub/notification integration |

Status vocabulary in this ledger follows the shared S0-S3 model. `PLANNED` means product direction exists but no route or shell has been accepted. `FOUNDATION_PRESENT` means reusable behavior exists but the named user-facing surface remains incomplete.

### Slice A: Notification Center system S1

- `DONE 2026-08-24`: the existing system presentation now extends into an unlocked App-grouped notification shade.
- No Home/App Store entry, new route, new notification Store, or Event Runtime surface was created.
- Desktop and simulated Pixel 5 coverage passes for tap/pull-down entry, day/night, zh/en, accessibility, long text, deep links, zero horizontal overflow, and no owner-record mutation on dismiss. This is not physical-device evidence.

### Slice B: Workplace agency S1

- `DONE 2026-08-24`: `工作台 / Work Hub` is an independent installed App shell with an artist-first K-pop agency reference and Today, Channels, Work, and Org workspaces. Its original `幕间 / Interlude` name was retired after product review because it did not read as a daily work utility.
- The ordinary no-event loop covers one visible membership/team roster, call-sheet and checkpoint reading, local channel messaging, task completion, explicit status reporting, and schedule-proposal accept/decline. Accepting a proposal honestly remains waiting for scheduling staff and does not write Calendar.
- Calendar, Agenda Journey, and Map open through stable references and return context. The shell does not copy their canonical records, infer attendance from coordinates, or manufacture a route/place/schedule result.
- The artist-community action submits only a persisted pending application. It never grants an artist publishing entitlement; organization membership, credentials, attendance truth, and community authorization remain future owner seams.
- Artist, manager, assistant, producer, employee, and student variants compose from bounded role-template fixtures/resolvers. Device-local preview state is registered in the persistence inventory and excluded from backup; no production organization Store, provider call, notification write, Event Surface, or Event Runtime participation is implied.
- The Org workspace exposes a lightweight display-name editor. The App name reuses the shared App identity override so Home, App Store, and the in-App header stay aligned; the organization display alias changes only the shell heading. Neither action edits the canonical membership credential or grants organization/fandom authority. Workplace preview state migrates from V1 to V2 without dropping tasks, messages, reports, decisions, or pending applications.
- Focused unit/integration coverage passes 8 files / 112 tests. Dedicated Playwright passes 10/10 across desktop Chromium and simulated Pixel 5, including the in-App naming editor, shared App-name synchronization, V2 persistence/reopen, unchanged canonical credential, day/night, zh/en, accessibility, owner-handoff boundaries, long text, and zero page-level horizontal overflow. Screenshots live under `output/e2e/workplace-app-shell/`; no physical-device evidence is claimed.

### Slice C: Unified fandom S1

- `DONE 2026-08-24`: `星集 / Aster` is installed as `app_fandom` at `/fandom`, with Home, App Store, shared App identity/skin, navigation return, Home layout migration, and persistence inventory integration.
- The ordinary consumer loop contains Home, artist directory, official public schedule, Aster Notes preview, My space, local follow/bookmark/read/tab/alert preferences, and stable-ID projection of existing Ripple public posts. The projection is not a second publication record.
- Artist publishing remains fail-closed. The artist workspace is not exposed as a self-service mode switch; a Work Hub pending application can be inspected and returned from, but it never creates entitlement or publishing authority.
- Subscription messages are explicit committed-platform previews rather than Chat DMs. No payment, Wallet flow, subscription owner, Community owner, system-notification write, provider call, AI post, Event Surface, or Event Runtime participation is claimed.
- Focused Vitest passes 5 files / 77 tests and dedicated Playwright passes 10/10 across desktop Chromium and simulated Pixel 5. Coverage includes ordinary browsing, Work Hub pending return, locked publishing, local reopen persistence, day/night, zh/en, accessibility, and zero horizontal overflow. Screenshots live under `output/e2e/fandom-app-shell/`; no physical-device evidence is claimed.

### Slice D: Tickets S1

- `DONE 2026-08-24`: `GATE / 入场` is installed as `app_tickets` at `/tickets`, with Home, App Store, shared App identity/skin, navigation return, version-12 pristine Home migration, and persistence inventory integration.
- The ordinary no-event loop covers concerts, music shows, film, exhibitions, and fan events; category filtering, search, detail, favorites, recent views, sale-alert preference, and a local Passes area; and explicit sale, lottery, reservation, waitlist, and sold-out states.
- Saved admission intent is always labeled `LOCAL DRAFT`. It is not an order, payment, seat hold, lottery result, waitlist acceptance, or valid ticket. Sold-out entries fail closed and cannot create a draft.
- Venue metadata carries stable Map place references for future handoff but does not create places, routes, presence, journeys, or attendance. No Wallet, Calendar, Agenda Journey, Mail, notification, ticket owner, provider/AI call, Event Surface, or Event Runtime participation is claimed.
- Focused Vitest passes 6 files / 85 tests including shared Home/App Store/App identity contracts. Dedicated Playwright passes 8/8 across desktop Chromium and simulated Pixel 5 with ordinary drafting, sold-out fail-closed, reopen persistence, day/night, zh/en, accessibility, and zero horizontal overflow. Screenshots live under `output/e2e/tickets-app-shell/`; no physical-device evidence is claimed.

### Slice E: Travel S1

- `DONE 2026-08-24`: `漫泊 / ROAM` is installed as `app_travel` at `/travel`, with Explore, Search, Trip book, and My workspaces plus Home, App Store, App identity/skin, navigation return, version-13 pristine Home migration, and persistence inventory V14 integration.
- Five stable stay fixtures cover city, coast, nature, and culture destinations with explicit `available / limited / unavailable / source_stale` states. Search, filters, favorites, recent views, deal-alert preference, dates, guests, and room selection form the ordinary no-event loop.
- Trip book entries remain visibly `LOCAL DRAFT`. They are not reservations, payments, room holds, Mail confirmations, Calendar stays, Map routes, Agenda Journeys, notifications, or Event Runtime records. Unavailable and stale sources fail closed and cannot create drafts or invented waitlists/inventory.
- Each stay carries a stable read-only Map place reference. The shell creates no place, pin, coordinates, route, presence, journey, or current-location inference.
- Focused Vitest passes 6 files / 86 tests and dedicated Playwright passes 8/8 across desktop Chromium and simulated Pixel 5 with day/night, zh/en, accessibility, stale-source fail-closed, reopen persistence, and zero horizontal overflow. Screenshots live under `output/e2e/travel-app-shell/`; no physical-device evidence is claimed.

The accepted S1 visible-shell portfolio is now complete, including follow-on VIA, CREDO, POSTA, and NEXT shells recorded in the portfolio matrix and roadmap. Each S2/S3 owner or EVE-5 step still requires separate roadmap promotion and acceptance. The next proposed Event slice is documented in `NEXT_EVENT_PRODUCTION_PLAN_AFTER_SHELL_PORTFOLIO.md`; it does not authorize booking, settlement, certification, shipment, application submission, or an event recipe by itself.

## 9. Documentation Ownership

- `EVENT_APP_SHELL_PRIORITY_MATRIX.md` owns the shell order and S0-S3 maturity classification.
- This document owns the accepted product decomposition and cross-App boundaries for these five slices.
- `TODO_ROADMAP.md` remains the only execution board.
- Event Runtime architecture documents change only when a shell receives a real S3 recipe.
- Calendar/Agenda/Map package documents change only when their owner Interfaces or behavior change.
