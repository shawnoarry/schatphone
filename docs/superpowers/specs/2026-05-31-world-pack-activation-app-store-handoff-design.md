# World Pack Activation And App Store Handoff Design

Date: 2026-05-31

## Goal

Make the World Pack flow easier to understand from a user point of view.

WorldBook should behave like the Book source-reference flow: it manages world material and activation, but it should not become the launch surface for every world-specific app. After a World Pack is activated, users should be directed to App Store / Home App Library to find enabled world-specific entries.

## Product Principles

- WorldBook owns world material, source references, and World Pack activation.
- App Store owns app discovery and launch entry management.
- Target apps own their own records and workflows.
- World Pack entries change labels, context, accents, and safe defaults only.
- WorldBook should not become a launcher grid for Shopping, Food Delivery, Map, Calendar, Chat, or future apps.
- Advanced AI/template proposal review should be available without crowding the normal activation path.
- Ambiguous archetypes such as black market must not be silently mapped to Shopping.

## Current Problems

1. Entering `Settings -> World Book` lands users on `Sources`, so users looking for World Pack activation must discover the `Pack` tab themselves.
2. The Pack panel mixes the currently active pack with a selected-but-not-yet-active pack. This makes it look like the selected pack has no app entries until activation.
3. The Pack panel currently includes direct "open world app" actions. This turns WorldBook into a launcher, which conflicts with the intended App Store/Home ownership model.
4. Nonstandard app proposal review is visible in the main Pack flow and exposes implementation-shaped concepts such as JSON payloads and `black_market -> shopping`.
5. Service account generation is colocated with activation and app-entry review, which makes the Pack panel feel like an engineering console rather than an activation flow.

## Target User Flow

1. User opens `Settings -> World Book`.
2. The top overview shows the currently active world and a clear `Manage World Pack` action.
3. User opens the `Pack` tab.
4. The Pack tab shows two clearly separated areas:
   - `Current active pack`
   - `Prepare another pack`
5. User selects a pack to preview.
6. The preview shows activation review and summarizes what activation will enable:
   - world context text
   - knowledge/profile-template counts
   - world app entry count
   - service account template count
7. User activates the pack.
8. WorldBook shows a success result:
   - the pack is now active
   - enabled world app entries can be found in `App Store -> World Apps`
   - available service accounts can be added from Chat when the Chat-side UI is ready
   - optional CTA: `Open App Store`
9. User goes to App Store to open or place world-specific app entries.

## WorldBook Pack Tab IA

### Current Active Pack

Shows only the active pack:

- active pack name
- activation state
- short description of global effects
- counts for active world app entries and service templates
- CTA to open App Store world-app section

This area should not include per-app launch buttons.

### Prepare Another Pack

Shows selected candidate pack:

- select control
- activation review
- blocker details
- summary of what activation will make available
- activate button

This area should not show active-pack app-entry lists until the pack is actually activated.

### Activation Success

After activation, show a compact confirmation:

`<Pack name> is now active. World-specific apps are available in App Store -> World Apps.`

If the pack includes service account templates, also show a count-only notice:

`<N> world service account(s) are available. Add them from Chat when you need them.`

Primary action:

- `Open App Store`

Secondary action:

- `Stay in WorldBook`

## App Store Handoff

App Store should become the main discovery and launch surface for world-specific app entries.

Add or clarify a `World Apps` section/filter that contains enabled active-pack entries.

Each world app entry should show:

- world app title
- active pack name
- target app label, as supporting metadata
- short ownership boundary copy
- open action
- Home placement action if available

The route should preserve context with query values such as:

- `worldPack=<active pack id>`
- `worldApp=<binding id>`

WorldBook's `Open App Store` CTA should route to App Store with a section/filter query, for example:

- `/app-store?section=world`

The exact query name may follow existing App Store conventions if a better local pattern exists.

## Nonstandard App Proposal Review

Move this out of the main activation path.

Recommended placement:

- collapsed advanced area inside Pack tab, titled `Advanced: Extract World App Proposals`

Default state:

- collapsed

User-facing copy:

- explain that AI can suggest whitelisted world-app entries from active world context
- confirmation adds an app binding to the current pack only
- no modules, stores, event rules, products, orders, schedules, or messages are created

Developer/import controls:

- pasted JSON review should be behind a `Manual import` affordance inside the advanced area
- loading, empty, parse/API error, and rejected states should remain explicit

## Ambiguous Archetype Rule

`black_market` should not be treated as a normal Shopping marketplace by default.

For this design slice, ambiguous archetypes should be handled as one of:

- hidden from confirmable proposal output
- rejected with a reason such as `needs_dedicated_app`
- shown only as a future/template-not-supported candidate

The implementation should not add or harden a `black_market -> Shopping` launch path until PM explicitly approves that semantic mapping or a dedicated app/archetype exists.

## Service Account Templates

Service account handling should follow the same handoff principle as app entries: WorldBook announces availability, but it should not be the primary place where users create or manage Chat service accounts.

Preferred behavior:

- After Pack activation, WorldBook shows how many service account templates are available for the current world.
- The copy tells users that these can be added inside the Chat app.
- Direct Chat creation UI is deferred until the parallel Chat feature shell is stable.
- The current slice may add/prepare the WorldBook notice UI only; the service-account data chain and Chat-side add flow are explicitly later work.
- Existing Chat Directory generation code should not be broadened from WorldBook during this redesign.

This keeps the mental model clear:

- WorldBook activates the world and reports what became available.
- Chat owns adding, viewing, and using world service accounts.
- World Pack stores the template origin and availability metadata.

## Out Of Scope

- Creating new real app modules from World Pack.
- Enabling high-risk event/runtime automation.
- Implementing a full Cheats override surface.
- Moving source-module ownership into WorldBook.
- Redesigning Book source management.
- Completing a dedicated black market app.

## Acceptance Criteria

- WorldBook no longer presents direct world-app launch buttons as the primary path.
- Pack tab separates active pack state from selected preview state.
- Activating a pack clearly tells users where enabled world apps can be found.
- App Store exposes a clear world-app discovery route or section.
- Pack activation shows service account availability as a count and points users to Chat, without creating the Chat-side data flow in this slice.
- Nonstandard app proposal review is advanced/collapsed rather than part of the default activation path.
- `black_market` is not silently confirmable as a Shopping entry.
- Existing source ownership remains intact: Shopping, Food Delivery, Calendar, Map, Chat, Wallet, Assets, and relationship runtime keep their records and workflows.

## Suggested Implementation Order

1. Adjust WorldBook Pack IA: active state vs candidate preview, and remove primary direct launch actions.
2. Add App Store world-app section/filter and route target.
3. Change WorldBook activation success to hand off to the App Store world-app section.
4. Collapse nonstandard proposal review under an advanced area.
5. Guard `black_market` as unsupported/needs dedicated app.
6. Sync roadmap and package docs.
