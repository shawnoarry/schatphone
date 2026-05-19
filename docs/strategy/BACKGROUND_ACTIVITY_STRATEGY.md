# SchatPhone Background Activity Strategy

Updated: 2026-05-19

Purpose: define how SchatPhone should handle background-style activity, real-time rhythm, notifications, and AI autonomy under current platform constraints.

Core principle:

> identity can be fictional, but rhythm should still feel real.

This is a strategy reference, not a live execution board.

## 1. Key Conclusion

Pure web pages cannot behave like fully persistent native apps.

The practical solution is a layered model:

1. real-time scheduler
2. restore-time settlement
3. notification layer
4. PWA push delivery enhancement
5. future app-shell upgrade only if stronger background execution becomes necessary

## 2. What Pure Web Can And Cannot Do

### Can do

- read current system time
- store next-trigger timestamps locally
- run timers while the page is open and active
- recalculate elapsed time when the user returns
- show in-app lock-screen style notifications

### Cannot reliably do

- keep precise timers alive after the tab is hidden or the page is closed
- guarantee exact background timing such as "reply every 60 seconds"
- provide true persistent background logic like a native mobile app

Product implication:

in pure web mode, a 60-second interval is a target rhythm, not a guaranteed hard timer while the page is fully inactive.

## 3. Recommended Layered Architecture

### Layer A: Real-Time Scheduler

This is the current baseline.

Responsibilities:

- use real system time as the only time source
- store `lastActiveAt`, `nextTriggerAt`, intervals, quiet hours, and deadlines
- check whether roles or modules should act while the page is active

Best-fit use cases:

- proactive AI messages
- shopping/order completion checks
- itinerary reminders
- delayed event completion
- silence follow-up in relationship systems

### Layer B: Restore-Time Settlement

This is the core illusion layer that makes the phone feel alive even when the page was not literally running.

When the user returns, the system should compute:

- how much real time passed
- whether any role should have messaged
- whether any event should have completed
- whether missed timing should create consequences
- whether notifications should be reconstructed

This gives a strong pseudo-background effect without promising true persistent execution.

### Layer C: Notification Layer

This turns timing logic into visible immersion.

Must-have behaviors:

- timestamps
- unread accumulation
- lock-screen entry hints
- stacked notification display
- a summary of what happened while the user was away

### Layer D: PWA Push Delivery

This layer is already part of the project baseline.

Needed ingredients:

- HTTPS
- notification permission
- service worker
- backend push relay

Current landed scope:

- manifest plus service-worker registration
- Settings-based permission and subscription flow
- lightweight Node push relay server
- real system-notification delivery for events that are generated while the web app is active and can be relayed

Important limitation:

true delivery exists, but fully closed-page event generation still requires future server-side scheduling/orchestration.

### Layer E: Future App-Shell Upgrade

If the product later needs stronger persistence, better scheduling guarantees, or deeper native capability, the HTML app should eventually be wrapped in an app shell.

Possible directions:

- stronger PWA-first enhancement
- Capacitor
- Tauri or Electron for desktop packaging

## 4. Required User Controls

These controls should remain user-configurable rather than hard-coded:

- global autonomous AI switch
- per-role autonomous switch
- per-feature autonomous switch
- reply interval in 60-second steps
- quiet hours
- notify-only mode
- whether offline time is settled on return
- how many auto messages may be generated per restore
- whether background-style activity may consume API quota

## 5. Prompt Context Requirements

Every AI call should carry more than just current chat text.

Recommended time-related context:

- current real system time
- elapsed time since last interaction
- whether the app just resumed from inactivity
- recent background-style events
- quiet-hour status
- relationship timing signals such as prolonged silence or recent warmth

Without this, AI replies lose temporal continuity.

## 6. Recommended Implementation Order

1. build the real-time scheduler baseline
2. add restore-time settlement
3. connect lock-screen and notification presentation
4. add per-role and per-feature user controls
5. extend server-side event generation later if full off-page autonomy is truly needed

## 7. Practical Product Rule

The project should never promise stronger background behavior than the platform can actually guarantee.

The goal is not "true background keep-alive at all costs."

The goal is:

- real-time rhythm
- believable restore behavior
- strong notification immersion
- controllable autonomous activity
