# Visual Entry Ownership Map

Updated: 2026-05-14

This document maps SchatPhone surfaces by **where the user enters from**, not only by route, file name, or data source.

Use it before visual redesign work. The goal is to preserve the immersive phone illusion: if the user is inside an installed app, cross-module data should appear through that app's visual language instead of suddenly switching to system styling.

Core rule:

```text
Entry path + parent context decide visual ownership.
Data source decides what is shown, not how the outer surface should feel.
```

## 1. Ownership Types

| Ownership Type | Meaning | Visual Direction |
| --- | --- | --- |
| Native System | Phone shell or OS-level management surface. | Default System Style v1, system tokens, grouped system surfaces, OS chrome. |
| Installed App | Full app entered from Home, Dock, or an in-app route. | App-owned identity, app-specific mood, still respecting phone shell constraints. |
| Host-App Embedded | A panel/card/picker/action sheet shown while still inside an installed app. | Host app owns the container; shared data is shown as app-local content. |
| System Shell With App Accent | OS surface that displays app-originated content. | System material owns the shell; app contributes icon/accent/label. |
| Ambiguous / Needs Decision | Entry context can reasonably point to more than one owner. | Pause and ask/decide before styling. |

## 2. Native System Entries

These are system-owned when reached directly from the phone shell or Settings.

| Entry Path | Route / Surface | Visual Owner | Notes |
| --- | --- | --- | --- |
| App launch -> `/lock` | `/lock` | Native System | Lock screen, notification stack, unlock affordance. |
| Unlock -> Home | `/home` | Native System | Wallpaper, widgets, app icons, dock, page dots. |
| Global shell | `src/App.vue` status bar, home indicator, foreground banner | Native System / System Shell With App Accent | App banner content may use app accent, but material remains system-owned. |
| Home/Dock -> Settings | `/settings` | Native System | OS settings hub. |
| Settings -> Appearance, Home -> Themes icon | `/appearance` | Native System | Even with a Home icon, this controls the phone visual system, so keep system customization language. |
| Home -> Widgets icon, Appearance -> Widget Center | `/widgets` | Native System | Widget Center is the library/import/create surface. It must not expose screen-number placement; placement belongs to Home widget edit mode through same-size slot replacement. Tap opens the library; long-press the Home Widgets icon enters Home widget edit mode. |
| Home -> system-controlled folder tile | Home folder overlay | Native System | The folder shell, blur, close behavior, icon grid, and spacing belong to Home/OS. Child entries may carry app icons and labels, but the folder container must not become Shopping, Food Delivery, or another app skin. |
| Settings -> Network, Home -> Network icon | `/network` | Native System | Provider/network configuration is system-level. If a future app-local network picker exists, reassess by context. |
| Settings -> Profile | `/profile` | Native System | System-owned user identity. |
| Settings -> WorldBook | `/worldbook` | Native System | Full world-kernel management page. In-app WorldBook summaries are not covered by this row. |
| System modal/dialog host | `AppDialogHost.vue` | Native System Mechanics + Host Context | Mechanics are system-owned; wording/accent may reflect the host app. |

Return controls in native-system pages must preserve the visible entry context. Use `from=home` or `from=settings` for system pages that can be launched from both places. Cross-module management links may use `source=chat|map|calendar` when the page should return to that app context.

If the entry started from Home, the route chain must also preserve `homePage=<index>`. A module moved from one Home page to another should not need new return configuration; the visible Home page is captured when the user launches the module. See `docs/process/NAVIGATION_RETURN_CONTRACT.md`.

## 3. Installed App Entries From Home / Dock

These routes should feel like apps when opened as full-screen destinations.

| Home / Dock Entry | Route | Default Visual Owner | Current Role |
| --- | --- | --- | --- |
| Chat icon / Dock Chat | `/chat`, `/chat/:id` | Installed App: Chat | Main conversation app; Kakao-like direction is allowed. |
| Contacts icon / Dock Contacts | `/contacts` | Installed App: Contacts / Role Archive | Contacts and role-profile archive. It may feel native-utility-like, but should not become Settings. |
| Gallery icon / Dock Gallery | `/gallery` | Installed App: Gallery | Photo/asset hub app. |
| Map icon | `/map` | Installed App: Map | Simulation/travel/exploration app. |
| Calendar icon | `/calendar` | Installed App: Calendar | Schedule/reminder app. |
| Phone icon | `/phone` | Installed App: Phone | Phone app placeholder/MVP. |
| Wallet icon | `/wallet` | Installed App: Wallet | Wallet app placeholder/MVP. |
| Stock icon | `/stock` | Installed App: Stock | Stock app placeholder/MVP. |
| Files icon | `/files` | Installed App / Utility App | File utility; system import/export pickers should be reassessed separately. |
| Shopping folder child app | `/shopping?service=...` | Installed App: selected Shopping platform | The Home folder is system-owned, but tapping a child opens a platform-like Shopping app identity such as Schat Mall, Style Cloud, Nova Digital, or Daily Fresh. |
| Food Delivery folder child | `/food-delivery?category=...` | Installed App: Food Delivery | Current children are category entry points inside the Food Delivery app. They are not editable OS folders and should not use Settings styling. |
| Assets icon | `/assets` | Installed App: Assets | Assets is a direct app entry, not a Home folder child. |
| App Store icon | `/app-store` | Native System App: App Store | Standalone app-entry manager for preinstalled apps and Home placement. |

## 3A. System-Controlled Home Folders

Home folders are system-controlled launch containers. They simulate phone folders for grouped entry points, but users do not currently create arbitrary folders or freely move icons into them.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home -> Shopping folder tile | Folder overlay | Native System | Shopping platform entries | Use neutral Home folder material. Show platform entries as app-like icons and labels, but do not make the folder panel look like a Shopping page. |
| Shopping folder -> Schat Mall / Style Cloud / Nova Digital / Daily Fresh | `/shopping?service=...&category=...` | Installed App: selected Shopping platform | Shared Shopping store, platform metadata | Ownership changes after navigation. The Shopping route should present the selected platform app shell, while cart, order, and product data remain shared. |
| Home -> Food Delivery folder tile | Folder overlay | Native System | Food Delivery category entries | Use the same neutral Home folder material. Current children are entry shortcuts into Food Delivery categories. |
| Food Delivery folder -> category child | `/food-delivery?category=...` | Installed App: Food Delivery | Food Delivery store, category metadata | Ownership changes after navigation. The destination should feel like Food Delivery, not a system category page. |
| Home -> Assets icon | `/assets` | Installed App: Assets | Assets store | Direct app launch. Do not treat it as part of the folder pattern. |

## 4. Chat-Owned Surfaces

If the user enters through Chat or remains inside a Chat thread, Chat owns the visual frame.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home/Dock -> Chat | Chat list | Chat | Contacts, conversations | Use Chat identity, not generic system list. |
| Chat list -> Thread | Chat thread | Chat | Messages, role profile, WorldBook context | Keep messaging-app immersion. |
| Chat thread -> Thread menu / context area | Current WorldBook context summary | Host-App Embedded: Chat | WorldBook, role bindings | Should feel like thread info/context, not WorldBook management. |
| Chat thread -> Gallery picker / rich send assets | Attachment asset picker | Host-App Embedded: Chat | Gallery assets/folders | Should feel like Chat attachment selection, not full Gallery app. |
| Chat thread -> Location block or location validation | Location send / Map dependency notice | Host-App Embedded: Chat | Map current location | Use Chat message/action language; do not restyle as Map page. |
| Chat message block -> Wallet route | Wallet action link | Chat until navigation; Wallet after route opens | Wallet route/action metadata | Inline block stays Chat. Full `/wallet` route becomes Wallet. |
| Chat -> `/chat-contacts` | Chat directory / service accounts / role binding | Installed App: Chat | Contacts, role profiles, Gallery previews | This is Chat-owned management, not main system Contacts. |
| Settings -> Chat contacts quick entry | `/chat-contacts` | Ambiguous / Prefer Chat once opened | Settings entry leads into Chat management | Entry button is system; destination should feel Chat-owned. |

## 5. Contacts-Owned Surfaces

Contacts is a role archive and contact utility. It may read shared data, but its app-local editors should stay Contacts-owned.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home/Dock -> Contacts | Contacts list and my card | Installed App: Contacts | User profile, role profiles | Native utility app feeling is acceptable; avoid pure Settings styling. |
| Contacts -> Create/Edit Role Profile | Profile modal/subpage | Host-App Embedded: Contacts | Role profile | Keep role archive/editor identity. |
| Contacts profile editor -> Knowledge binding | Knowledge point selector | Host-App Embedded: Contacts | WorldBook knowledge points | Show as role-profile binding, not WorldBook management. |
| Contacts profile editor -> Asset pack binding | Asset pack selector | Host-App Embedded: Contacts | Gallery assets | Show as role asset binding, not Gallery app. |
| Contacts profile editor -> Folder binding -> Open Gallery | Full Gallery route | Installed App: Gallery after navigation | Gallery | The inline binding stays Contacts; clicking "Open Gallery" changes owner to Gallery. |

Open question:

- Contacts currently sits between "installed utility app" and "role archive system tool." Until a stronger product decision exists, treat full `/contacts` as an installed utility app, not a Settings page.

## 6. Gallery-Owned Surfaces

Gallery owns the full asset hub. Embedded thumbnails elsewhere do not automatically inherit Gallery styling.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home/Dock -> Gallery | Full Gallery app | Installed App: Gallery | Gallery assets/folders | Photo-library or asset-hub identity. |
| Chat -> asset picker | Chat attachment picker | Host-App Embedded: Chat | Gallery assets | Chat owns the container. |
| Contacts -> asset/folder binding | Role asset binding panel | Host-App Embedded: Contacts | Gallery assets/folders | Contacts owns the editor. |
| Map -> map visual thumbnail picker | Map visual setting panel | Host-App Embedded: Map | Gallery assets | Map owns the visual setting; thumbnails can look gallery-like. |
| System Appearance -> wallpaper/gallery asset use | Appearance controls | Native System | Gallery assets | Appearance owns system customization frame. |

## 7. Map-Owned Surfaces

Map should keep a simulation/travel/exploration identity. It can surface Calendar and WorldBook data without losing Map ownership.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home -> Map | Full Map app | Installed App: Map | Map state, Gallery visuals, automation settings | Map app identity. |
| Map -> Map visual panel | Background/visual controls | Host-App Embedded: Map | Gallery assets, uploaded images, AI visual state | Keep Map visual language; "Open Gallery" navigates away to Gallery. |
| Map -> Related WorldBook chips | Knowledge references on area/route/trip cards | Host-App Embedded: Map | WorldBook knowledge points | Show as Map clue/context chips, not WorldBook management. |
| Map -> WorldBook button | Full `/worldbook` route with query | Native System after navigation | WorldBook with scoped query | Once full WorldBook opens, system management style is acceptable. Consider future app-local preview if jump feels disruptive. |
| Map -> Settings automation | `/settings?menu=automation` | Native System after navigation | System automation settings | Navigation intentionally leaves Map. |
| Map -> Calendar reminder cue | Reminder suggestion inside Map | Host-App Embedded: Map | Map-derived calendar reminder | Looks like Map follow-up cue until Calendar opens. |

## 8. Calendar-Owned Surfaces

Calendar owns schedule and reminder presentation when the user is in the Calendar app, even if events came from Map.

| User Path | Surface / Data | Visual Owner | Data Sources | Styling Guidance |
| --- | --- | --- | --- | --- |
| Home -> Calendar | Full Calendar app | Installed App: Calendar | Calendar events, Map reminders | Calendar schedule identity. |
| Calendar -> Map reminders section | Map-derived reminder cards | Host-App Embedded: Calendar | Map reminders/feedback | Calendar owns layout; source attribution can use Map label/icon. |
| Calendar -> Event card related knowledge | WorldBook chips on event/reminder cards | Host-App Embedded: Calendar | WorldBook knowledge points | Treat as calendar event context, not WorldBook page. |
| Calendar -> Open Map | Full `/map` route | Installed App: Map after navigation | Map state | Ownership changes to Map. |
| Calendar -> WorldBook button | Full `/worldbook` route with query | Native System after navigation | WorldBook with scoped query | Full management route can use system style. |

## 9. Settings-Owned Cross-Entries

Settings may provide shortcuts into app or system destinations. The entry button is system-owned; the destination may switch ownership.

| Settings Entry | Destination | Visual Owner After Navigation | Notes |
| --- | --- | --- | --- |
| Profile row | `/profile` | Native System | System identity. |
| WorldBook row | `/worldbook` | Native System | World kernel management. |
| Network row / diagnostics | `/network` | Native System | Provider/network system utility. |
| Appearance row | `/appearance` | Native System | System visual customization. |
| Chat contacts/settings shortcut | `/chat-contacts` | Installed App: Chat | Destination should not look like Settings just because it was launched from Settings. |
| Automation subpage -> Map reserved toggle/copy | Settings subpage | Native System | Mentions Map but stays Settings. |

## 10. Notifications And Dialogs

| Surface | Visual Owner | Data Sources | Guidance |
| --- | --- | --- | --- |
| Lock-screen notification | System Shell With App Accent | Notifications from apps/modules | System notification card owns material; app owns icon/accent/title source. |
| Foreground notification banner | System Shell With App Accent | Notifications from apps/modules | System banner owns placement and material. |
| App-triggered confirm dialog | Native System Mechanics + Host Context | Any module | Use consistent dialog mechanics; preserve host wording/accent when helpful. |
| In-app action sheet / drawer | Host-App Embedded | Host app + shared data | App owns the container unless it is a global OS sheet. |

## 11. Current Risk List

These areas need care in upcoming visual work:

1. **ChatDirectoryView**: It uses Contacts/Gallery data, but should feel Chat-owned.
2. **Chat thread WorldBook summary**: It should not become a small Settings/WorldBook page inside Chat.
3. **Chat asset picker**: It should be a Chat attachment picker, not full Gallery.
4. **Contacts editor**: It is at risk of looking like a settings admin form; keep it as role archive/editor.
5. **Map visual panel**: It reads Gallery assets and AI settings, but should remain Map-owned.
6. **Calendar Map reminders**: They should feel like Calendar cards with Map source marks, not Map cards copied into Calendar.
7. **Full WorldBook deep links from apps**: Current behavior opens the system-owned WorldBook route. This is acceptable, but future UX may need app-local previews to reduce immersion breaks.

## 12. Pre-Redesign Checklist

Before editing any visual surface, answer:

```text
1. What exact clicks lead the user here?
2. At the moment this UI appears, does the user feel inside the OS shell or inside an app?
3. Is this a full route, an embedded panel, a modal, a picker, a card, or a notification?
4. Which data stores does it read/write?
5. Which owner controls the container style?
6. Which source apps may contribute icons, labels, accent, or attribution?
7. What style must it avoid jumping into?
8. If the route changes, does visual ownership change too?
```

If answers are unclear, mark the surface as **Ambiguous / Needs Decision** before implementing.
