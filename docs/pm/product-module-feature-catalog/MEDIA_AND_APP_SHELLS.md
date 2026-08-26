# Media And Installed App Shell Catalog

Updated: 2026-08-26

Integrated baseline: `f06a575`

Use this file for Camera, Music, Weather, and the installed S1 App preview portfolio.

## 1. Status Language

- `Integrated App`: owns a real product/runtime slice at the current baseline.
- `Installed S1 App`: a route-backed, locally usable preview with honest fixture/draft/fail-closed behavior.
- S1 completion does not mean the App has an S2 canonical owner Store, a real external transaction/provider, or an S3 Event Runtime chain.

## 2. Integrated Media And Life Apps

| Chinese | English | Route | App id | Current product role |
| --- | --- | --- | --- | --- |
| 相机 | Camera | `/camera` | `app_camera` | shared image-generation capture, task review, provider/default/routing settings, diagnostics, and explicit Gallery retention |
| 音乐 | Music | `/music` | `app_music` | library, provider search, playback, playlists/queue/radio, floating player, Chat track sharing, and active-journey Map controls |
| 天气 | Weather | `/weather` | `app_weather` | world/location-aware current conditions, forecast, and Home widget source |

Camera subroutes:

- `/camera/tasks`
- `/camera/settings`
- `/camera/settings/providers`
- `/camera/settings/providers/:profileId`
- `/camera/settings/defaults`
- `/camera/settings/app-routing`
- `/camera/settings/diagnostics`

Important boundaries:

- Camera owns the visible image-generation workflow; the shared Image Generation Module owns provider contracts, configuration, tasks, and candidate normalization.
- Gallery owns retained reusable media. A generated candidate is not durable Gallery material until the user explicitly keeps it.
- Music owns playback, provider credentials, queue/radio state, stream resolution, and local media. Chat and Map consume bounded projections and commands only.
- Weather owns weather state/projection and does not become Map place truth or Calendar schedule truth.

## 3. Installed S1 App Portfolio

| Chinese | English | Route | App id | Honest S1 role |
| --- | --- | --- | --- | --- |
| Daon 邮件 | Daon Mail | `/mail` | `app_daon_mail` | local mail folders, drafts/sent state, and the portfolio's sole explicit AI Receive exception |
| 折光浏览器 | Prism Browser | `/browser` | `app_browser` | Help/current-world/local search, history/bookmarks, and honest Web-unavailable state |
| 涟漪 | Ripple | `/community` | `app_community` | local following/explore/news/saved feed preview |
| 温谈健康 | Ondam Care | `/healthcare` | `app_healthcare` | local care discovery and appointment-intent drafts |
| 住处 | Jari | `/housing` | `app_jari_housing` | local housing discovery and viewing drafts |
| 工作台 | Work Hub | `/workplace` | `app_workplace` | local workplace/team/schedule preview with bounded Calendar proposal handoff |
| 星集 | Aster | `/fandom` | `app_fandom` | local artist/fandom preview linked to Community fixture identities |
| 入场 | GATE | `/tickets` | `app_tickets` | local ticket/event discovery and intent drafts |
| 漫泊 | ROAM | `/travel` | `app_travel` | local lodging discovery and trip-intent drafts |
| 联程 | VIA | `/intercity` | `app_intercity` | local rail/flight/coach/ferry comparison and trip-intent drafts |
| 谱权 | CREDO | `/creator-rights` | `app_creator_rights` | local works, rights-share, statement, and annual-declaration previews |
| 递送 | POSTA | `/parcel` | `app_parcel` | local parcel lookup, delivery inbox, pinning, and send drafts |
| 机会 | NEXT | `/career` | `app_career` | local jobs, auditions, invitations, saved opportunities, and application/profile drafts |

## 4. Shared S1 Boundary

Every S1 App must preserve these claims:

1. fixture, cached, unavailable, stale, and user-draft states are visibly distinct;
2. saving a local draft does not claim an external booking, application, purchase, shipment, rights registration, appointment, or message succeeded;
3. another owner changes only through an explicit accepted handoff, such as the current Mail/Work Hub schedule proposal path;
4. promotion to S2 or S3 requires one exact roadmap/user-authorized slice and the canonical owner's package contract;
5. package-level completion evidence remains in `visual-and-ia-governance` and any future canonical owner handoff, not in this catalog.
