# Navigation Return Contract

Updated: 2026-05-16

This contract defines how SchatPhone preserves the user's visible entry context when moving between Home, installed apps, system pages, and shared management pages.

## Core Rule

When a route is opened from Home, it must remember the Home page where the user started.

```text
Home page N -> app/module -> Home
= return to Home page N
```

This must keep working when a future app entry is moved from one Home page to another. The app should not need per-module return configuration for that move.

## Required Query Context

Home-launched routes should carry:

```text
from=home
homePage=<zero-based page index>
```

Examples:

```text
/calendar?from=home&homePage=1
/shopping?service=style_cloud&category=fashion&from=home&homePage=1
/widgets?from=home&homePage=0
```

## Home -1 Today View Exception

Home may expose a native-system `-1` Today View to the left of page 1. This surface is not a user-editable Home page and is not stored in `homeWidgetPages`.

For now, routes launched from the `-1` Today View must normalize return context to `homePage=0`.

This keeps the current non-negative `homePage=<zero-based page index>` contract stable while still allowing locked or installed system shortcuts, such as World Hub, to live on the Today View.

System-launched routes that can return to Settings should carry:

```text
from=settings
```

If the user originally came from Home before entering Settings, system child routes should preserve the ancestor `homePage` too:

```text
/appearance?from=settings&homePage=1
```

## Required Helpers

Use the shared helper in:

```text
src/lib/navigation-return.js
```

Required patterns:

```js
import { pushReturnTarget } from '../lib/navigation-return'

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}
```

When opening a route from Home:

```js
router.push(buildRouteWithReturnSource(tile.route, 'home', { homePage: currentPage.value }))
```

When opening a Home folder child route:

```js
query: buildHomeSourceQuery(currentPage.value, existingQuery)
```

When forwarding from a system page to another system/shared page:

```js
query: buildReturnSourceQuery('settings', route, existingQuery)
```

## New Module Checklist

1. Add the Home entry through the Home registry/page system.
2. Do not hand-write `router.push('/home')` in the module header.
3. Use `pushReturnTarget(router, route, '/home')` for any module-level Home button.
4. If the module opens a shared/system route that may return to the source module, forward `homePage` when present.
5. Add or update tests for `from=home&homePage=N` if the module introduces a new navigation path.

## Cross-Module Pages

Shared pages such as WorldBook may be opened from Chat, Calendar, Map, Settings, or Home. They must preserve both:

- the immediate source context, such as `source=map` or `from=settings`
- the ancestor Home page context, if `homePage` exists

This lets the user return through the same visible path without suddenly landing on Home page 1.

## Allowed Exceptions

Hardcoded `/home` fallback is allowed only for true global/default paths:

- lock-screen unlock fallback
- global notification fallback when a notification has no target route
- external or developer-only routes that are not launched from Home

All other installed app pages, system subpages, app-owned management pages, and shared management routes should use the shared return helpers.

## Review Search

Before finishing navigation work, search for:

```text
router.push('/home')
router.push({ path: '/home'
```

Each occurrence must be either converted to the shared helper or documented as one of the allowed exceptions.
