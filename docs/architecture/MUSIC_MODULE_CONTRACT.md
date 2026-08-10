# Music Module Contract

Updated: 2026-08-10

Status: `CHKSZ_RADIO_BROWSER_AND_LOCAL_INTAKE_INTEGRATED_LOCAL / CHAT_TRACK_SHARE_AND_MAP_JOURNEY_MEDIA_CALLERS_INTEGRATED_LOCAL / REAL_CREDENTIAL_AND_REMAINING_CALLER_PROOF_DEFERRED`

Authority note:

- `docs/roadmap/TODO_ROADMAP.md` owns live status and priority;
- this document owns the Music module boundary, provider contract, persistence classification, and Chat/Map integration seam;
- the visual and module-architecture package handoffs own their respective current-state summaries;
- a future provider-specific Adapter or Chat/Map caller must preserve this contract or explicitly version it.

## 1. Goal

Music is a first-class installed app, not a Settings dashboard. It provides a believable consumer listening experience while letting a user connect an authorized generic JSON API, use the no-key Radio Browser live-station preset, use the dedicated ChKSz multi-platform Adapter, add a stable HTTPS audio URL, or import audio files owned by Music on the current device.

The product model is:

```text
Music owns listening, library, queue, playback, imported audio, provider profiles, and integration policy.
The browser Audio runtime owns the active media session only while the app is open.
Provider APIs own catalog and stream availability under the user's own access rights.
Chat and Map may consume bounded Music references/projections through stable Interfaces.
Chat and Map never receive provider credentials, endpoints, request headers, or stream URLs.
```

## 2. Implemented Slice

The first slice includes:

- `/music` as a Home and App Store installed-app route;
- `Discover`, `Albums`, and `My Music` as the three primary listening spaces, with Search as a top utility rather than a fourth primary destination, plus favorites, recent tracks, playlists, queue, shuffle, repeat, seek, volume, mute, and expanded Now Playing;
- a Music-owned global floating player that preserves the in-memory playback session across unlocked routes and supports collapsed, expanded, and dismissed states; Chat routes constrain it to a right-edge dock that reveals controls only on request, while full browsing hands off to `/music`;
- browser `Audio` playback plus Media Session metadata and play/pause/previous/next/seek handlers where supported;
- built-in listening samples so the app remains usable before a provider is configured;
- configurable GET or POST JSON search APIs with result-path and field mapping;
- a focused Radio Browser preset that searches healthy HTTPS MP3 live stations without an API Key;
- a dedicated ChKSz source preset for NetEase, QQ, and Kugou search, with playback resolution deferred until the user presses Play;
- a Music Settings `Add Music` surface with separate URL and local-file modes, compact imported-track management, and no Gallery/image-resource dependency;
- validated direct HTTPS audio URLs with user-supplied title/artist/album/cover metadata;
- multiple local audio-file import into a Music-owned IndexedDB carrier, with runtime object-URL creation/revocation and explicit missing-file feedback;
- ChKSz quality selection, quota-header presentation, bounded status handling, NetEase lyrics, and explicit NetEase playlist import;
- none, Bearer, `X-API-Key`, or custom-header authentication;
- device-local API keys separated from public provider profiles and ordinary backup;
- connection tests that distinguish reachable results from results with a usable audio URL;
- stable Chat/Map route requests, track-share payloads, capability discovery, and now-playing projections;
- a Music-owned Track Details action that creates the normalized internal Chat share draft, requires recipient selection and explicit send, and returns a sent card to the same track detail without starting playback;
- an active-journey Map caller with a compact music/radio panel, quick Music-owned track controls, three deterministic library-backed journey stations, and a handoff to either the global Music floating player or the full Music app;
- Home live Music widget state, app icon/skin/scoped-style support, and notification presentation metadata.

This slice does not claim provider catalog licensing, unrestricted stream rights, a hosted music proxy, closed-app playback, offline download, DRM support, Chat search UI, or external Map queue-request UI.

## 3. Ownership

| Owner | Owns | Does not own |
| --- | --- | --- |
| Music | library, favorites, recent tracks, playlists, queue, playback preferences, provider profiles, active-provider choice, integration policy | Chat messages, Map records, provider catalog truth, provider licensing |
| Music playback runtime | active `Audio` element, current time, duration, buffering/error state, Media Session handlers | durable library truth, closed-app/background-service guarantees |
| Provider API | search results and playable media made available under the user's authorization | SchatPhone library, queue, cross-module records |
| Chat | confirmed `share_card` records and the user-facing recipient/send/quote/source-return workflow | Music credentials, provider configuration, playback control |
| Map | active-journey presentation, panel visibility, journey label, and navigation into Music | Music credentials, stream URL, queue construction, radio selection logic, audio runtime, or playback ownership |
| Settings/backup | packaging and restoring Music public state through the existing `system-settings` section | provider keys or a second Music settings UI |

## 4. Product And IA Rules

1. The default `/music` surface is listening-first. Provider configuration stays behind the Music-owned settings sheet.
2. Music Settings presents `Add Music` and `Music Sources` as separate top-level intentions. URL/local-file intake does not move into Library, Music local audio does not enter Gallery or use image-resource language, and Radio Browser is labeled as live radio rather than an on-demand song platform.
3. Music keeps its own installed-app visual identity under both built-in system themes. It must not inherit a system-settings or admin-dashboard composition.
4. Search must work against the local/demo library when no provider is configured or a provider is unavailable.
5. A generic result without `audioUrl` remains catalog-only. A dedicated-Adapter result with a valid `sourceRef` may expose Play because Music resolves its ephemeral stream URL at that user action. A local-file track may expose Play because Music resolves its `mediaId` at that same boundary.
6. Queue, playlist, favorite, destructive, empty, loading, connection-warning, missing-local-file, and playback-error states must remain explicit.
7. Playback controls remain icon-led with accessible names and stable control dimensions.
8. The primary information architecture is `Discover / Albums / My Music`. Search is a persistent top utility, while queue and Music Settings remain utility actions; none is duplicated as a primary tab. Discover leads with a full-width, cover-led weekly recommendation selected deterministically from playable library tracks, then exposes four explicit shortcuts for Favorites, Recent, Playlists, and Albums before the album shelf and bounded three-track Recently Played overview. `See All` hands the user to `My Music -> Recently Played` instead of expanding the overview in place. Albums uses a catalog-specific visual header and complete album grid; My Music owns personal collection summary, Favorites, Recent, Playlists, and the full track list. Phone-sized layouts preserve the same priority and use a three-item bottom navigation with safe clearance from the device gesture indicator. The recommendation stays independent from the current runtime track: activating it loads that recommendation into the Music-owned player, while playing something else changes only current-player surfaces. If the recommendation, album, or track represented by a visible control is current, that control must reflect playing versus paused state instead of always showing Play. Stop belongs to current-player controls, and the persistent in-app player renders only while the runtime owns a current track.
9. The global floating player must not render on Lock or `/music`; it supports collapsed, expanded, and dismissed states, clears Home/app-owned bottom controls, and stays beneath an open Map journey-media panel. On Chat routes it auto-collapses into a cover-sized right-edge handle, removes queue-browsing and skip controls, and reveals the track entry, play/pause, edge-collapse, and dismiss actions only after an explicit click. Wide Chat reserves a matching edge lane so the resting handle does not overlap interactive Chat content; play/pause returns the control to its edge state.
10. Route return context uses the shared navigation-return contract; Music must not invent an unrelated back stack.
11. Map journey media appears only while a journey is traveling or paused. Closing that focused Map panel does not close Music's floating player or stop playback.
12. Map radio labels are deterministic Music presets over playable library tracks. They do not embed or imply a third-party live-radio stream.

## 5. Track Contract

`normalizeMusicTrack` produces the canonical Music track shape:

```json
{
  "id": "provider:stable-track-id",
  "title": "Track title",
  "artist": "Artist name",
  "album": "Album title",
  "coverUrl": "https://...",
  "audioUrl": "https://...",
  "durationSec": 210,
  "providerId": "provider-id",
  "providerName": "Provider name",
  "year": 2026,
  "genre": "Genre",
  "addedAt": 0,
  "sourceRef": null
}
```

Rules:

- stable provider track IDs are preferred; a deterministic metadata fallback is used when the provider omits one;
- audio and cover URLs resolve relative to the configured provider base URL;
- only `http`, `https`, and local `blob:`/`data:audio/` playback sources are admitted;
- durations normalize seconds or millisecond-like values and are bounded to 24 hours;
- malformed URLs, years, and fields normalize to safe empty/default values rather than entering runtime unchecked.
- ChKSz tracks carry only a bounded `sourceRef` (`type`, platform, stable id/mid or result selection, and the original bounded query); it contains no API Key or stream URL.
- direct URL tracks carry `sourceRef.type = direct_url` and keep their stable HTTPS `audioUrl` in Music public state;
- local-file tracks carry only `sourceRef.type = local_file`, a Music-owned `mediaId`, bounded filename/MIME/size metadata, and an empty durable `audioUrl`;
- `blob:` URLs created for local playback are runtime-only and are removed from saved tracks, recent tracks, queues, and backup state.

## 6. Provider Profile And Search Contract

Public provider profiles are versioned Music configuration. A profile includes:

- stable id, user-facing name, enabled state, and base URL;
- search path and GET/POST method;
- query and limit field names;
- result-array dot path;
- auth mode, custom auth header name/prefix, and non-secret static headers;
- dot-path mappings for id, title, artist, album, cover, audio URL, duration, year, and genre.

GET sends the configured query and limit as URL parameters. POST sends them as a JSON object. Responses must be JSON. The configured result path is tried first, followed by common array shapes such as `data.tracks`, `tracks`, `songs`, `items`, and `results`.

Public static headers cannot persist `Authorization`, `Proxy-Authorization`, `X-API-Key`, or `API-Key`. Authentication values are injected at request time from the device credential carrier.

The generic Adapter intentionally supports common JSON APIs; it does not guess proprietary signing, DRM, cookie, OAuth refresh, encrypted-manifest, or provider-specific playback protocols. Such a provider requires a separately reviewed Adapter behind the same normalized result boundary.

### 6.1 ChKSz Adapter

`src/lib/chksz-music-adapter.js` is the dedicated ChKSz transport boundary. Its public provider profile stores only Adapter kind, platform, quality, display name, and the official `https://api.chksz.com` base. Users do not configure endpoint paths or field maps for this Adapter.

Rules:

1. the device-local API Key is added only as the required `apikey` query parameter on an outgoing ChKSz request;
2. search normalizes NetEase, QQ, and Kugou results without resolving or persisting audio URLs; common nested artist/album fields, `picUrl`/`picurl` cover variants, duration, and publish-date variants may enrich the normalized track;
3. Play resolves a selected track through the platform endpoint and gives the returned URL only to the active audio runtime. Same-track resolution is single-flight and may reuse one memory-only result for 24 hours; the Store retains at most the 50 most recently used resolutions. An immediate or asynchronous cached-stream playback failure invalidates that entry and retries provider resolution at most once;
4. NetEase lyrics and playlist details are runtime/import operations owned by Music; playlist tracks remain unresolved until played. Lyrics and normalized provider metadata may use the separate rebuildable device cache described in section 8;
5. `401`, `402`, `403`, `429`, and `503` preserve the API's bounded message after Key redaction, quota headers are runtime-only, and `429` retries at most once after `Retry-After`;
6. QQ member Cookie input is not supported by this slice because it is a separate, more sensitive credential contract.

### 6.2 Radio Browser Preset

Radio Browser uses the existing generic JSON request and normalization boundary with a fixed public preset:

- base URL `https://all.api.radio-browser.info`;
- station search through `/json/stations/search` with `name` and `limit`;
- `hidebroken=true`, `is_https=true`, and `codec=MP3` to reduce broken, mixed-content, and unsupported-stream results;
- `stationuuid`, `name`, `country`, `codec`, `favicon`, `url_resolved`, and `tags` mapped into the normalized Music track projection;
- no API Key, credential carrier entry, custom header, or project-hosted proxy.

The provider directory and station streams remain third-party live services. A returned station can stop broadcasting or change its stream URL independently of SchatPhone. This preset does not change the separately owned Map journey-radio catalog, which remains deterministic and library-backed.

## 7. Playback Runtime

`src/lib/music-playback-runtime.js` is the sole browser-audio runtime for this slice.

It owns:

- load, play, pause, stop, seek, volume, and mute;
- playing, paused, buffering, ended, and error states;
- active track/current time/duration snapshots;
- Media Session metadata and supported action handlers.

The Pinia store owns queue order, repeat/shuffle policy, recent history, journey-radio queues, floating-player state, which normalized track should load next, dedicated-Adapter resolution, request single-flight state, and Music-local binary resolution before runtime load. A local blob becomes an object URL only for the active playback session; the prior URL is revoked on track change, stop, removal, or Store disposal. Dismissing the floating player survives automatic ended-to-next transitions, while a later explicit user playback action may reveal it again. Direct external playback is never authorized by a Chat/Map request. Browser autoplay restrictions remain authoritative, so play requests must originate from a user gesture.

The runtime persists no `Audio` object, signed media request, or closed-app worker. Navigating inside the live app preserves playback; terminating or suspending the browser/PWA may stop it.

## 8. Persistence And Backup

Public Music state is nested at `systemStore.settings.music` and normalized at version 3. The logical data class is `music.library-and-provider-settings`, physically carried by `store:system` and required through backup section `system-settings`.

It includes:

- public provider profiles and active profile id;
- saved tracks, favorites, recent tracks, playlists, and queue;
- last-played track reference;
- volume, mute, shuffle, and repeat preferences;
- Chat/Map integration policy.
- direct URL and local-file track metadata admitted through Music Settings.

Bounded limits are 6 profiles, 300 saved tracks, 40 recent tracks, 120 queued tracks, 100 search results, and 40 playlists.

Provider API keys use the separate `schatphone:music:credentials` device-local carrier. The logical class `music.credentials` is:

- durable only for the current isolated device/container;
- keyed by Music provider profile id;
- excluded from ordinary plaintext backup and cross-module payloads;
- removed when its provider profile is deleted;
- re-entered by the user on another device.

Search-result presentation, resolved ChKSz stream URLs, quota/status data, active `Audio` state, current time, raw responses, and request diagnostics are runtime projections and do not enter backup. Saved ChKSz tracks, recent tracks, and queue entries retain their bounded `sourceRef` but always persist with an empty `audioUrl`.

Normalized provider metadata and lyrics use the separate `schatphone-music-provider-cache` IndexedDB version-1 database and `entries` object store. The logical class `music.provider-cache` is Music-owned, device-local, expiring, rebuildable, and excluded from ordinary backup. Entries are keyed by cache kind, provider profile, platform, and stable source track reference; current TTL is 30 days. The cache contains no API Key, raw response, resolved stream URL, audio bytes, or cross-module payload. Clearing browser data or cache expiry safely falls back to the provider. Resolved ChKSz playback URLs remain outside this database and may exist only in the Store's 24-hour, 50-track LRU memory cache.

Imported local audio uses the separate `schatphone-music-media` IndexedDB version-1 database and `audioBlobs` object store. The logical class `music.local-media-binaries` is Music-owned and current-device durable, follows the current-save writer boundary, and is excluded from the current ordinary backup slice. Public track metadata keeps only `mediaId`; Gallery does not own, index, or package these blobs. A restore or storage loss that leaves metadata without the binary returns `LOCAL_MEDIA_MISSING` and asks the user to import the source file again rather than substituting another resource. Same-track relink and optional binary backup packaging are later contracts.

## 9. Chat And Map Interfaces

The public seam lives in `src/lib/music-module-interface.js`.

Supported sources are `chat` and `map`. Supported actions are `open`, `search`, `play`, and `enqueue`. `buildMusicIntegrationRoute` produces `/music` query parameters from a normalized request.

Rules:

1. `open` and `search` may deep-link directly into Music.
2. `play` always requires an explicit user gesture inside Music.
3. `enqueue` requires Music's `externalQueueRequestsEnabled` policy plus user confirmation/presentation at the Music boundary.
4. Capability discovery reports cross-module direct playback as false for both callers. The active Map panel may invoke Music-owned play actions only from an explicit user click; it never supplies a stream URL or mutates the queue directly.
5. Chat track-share payloads contain only a stable track/provider reference and bounded display metadata.
6. Map now-playing and journey-track projections contain stable references, display metadata, playback state, current time, and duration.
7. Neither projection includes `audioUrl`, local `mediaId`, endpoint URL, API key, auth header, static headers, provider response, or queue contents.
8. Chat's first promoted caller uses `createMusicTrackSharePayload` and a source-owned `music_track_share` card. The draft is temporary, send is explicit, quote stays in Chat, and `/music?source=chat&track=...` opens Track Details without auto-play.
9. Map's active-journey caller consumes only the bounded now-playing, quick-track, and station catalog projections. Music resolves the selected stable reference, owns the resulting queue, and loops a selected station without changing the user's durable repeat preference.
10. The Map media button is absent outside traveling/paused journeys. Its focused panel may coexist with the lower Music floating layer, and both provide an explicit route into `/music?source=map` with Home return context preserved.
11. Chat search and external Map queue-request flows do not yet call these Interfaces; each requires its own promoted UX and record-ownership slice.

## 10. Security And Provider Constraints

- Users must connect only APIs and media they are authorized to access.
- ChKSz credentials are supplied by the user through Music's device-local password input; real user credentials are never embedded in source, fixtures, logs, screenshots, cross-module payloads, or backup.
- Radio Browser requires no credential and is restricted by its preset to healthy HTTPS MP3 station results; individual station uptime remains external.
- The provider must allow browser-origin requests through its CORS policy.
- HTTPS deployments cannot play blocked mixed-content HTTP streams.
- Expiring or signed media URLs may stop working after the provider's validity window; Music does not persist them or provider authorization material into another owner. A reused memory-only URL that fails immediately is invalidated and provider resolution is retried at most once.
- Provider rate limits, geographic restrictions, DRM, cookies, referrer policy, and byte-range support remain provider/browser concerns.
- The generic Adapter sends credentials directly from the browser to the configured endpoint. A future proxy must be explicit and separately reviewed for authentication, SSRF, allowlisting, rate limits, redaction, and abuse controls.
- User-supplied endpoint and media URLs must never be described as trusted SchatPhone content merely because normalization accepted their protocol.
- direct URL intake requires HTTPS and probes browser-readable audio metadata before admission; browser codec, CORS, redirect, range, and host availability remain external constraints.
- local-file intake accepts bounded audio MIME/extensions and a 512 MB per-file limit; the app does not upload imported bytes to a provider, Chat, Map, or Gallery.

## 11. Validation And Remaining Gates

The first slice requires:

- focused contract, store, view, registry, persistence-inventory, and integration tests;
- lint, full unit suite, production build, governance, and diff checks;
- desktop and simulated-mobile Music route tests for default and zen themes;
- route entry, provider setup, secret visibility, search, playback, queue, expanded player, Home/App Store, floating-player clearance, Chat edge-dock zero-action overlap, page errors, and horizontal overflow evidence;
- the existing project visual gate.

The internal Chat caller adds focused contract/View/Chat-card coverage plus `chat-internal-app-share.spec.js`: desktop and simulated Pixel 5 prove recipient selection, explicit send, refresh/lock recovery, quoting, card persistence, exact Track Details return, no auto-play, and no horizontal overflow. The Map caller adds focused contract/Store/View coverage plus `music-map-journey.spec.js`: desktop and simulated Pixel 5 prove journey-only entry, radio activation, Map-panel/floating-player coexistence, panel-close continuity, expand/dismiss behavior, Map-to-Music return context, layer order, page errors, and horizontal overflow. The broader current-tree validation totals are recorded in the roadmap and package handoffs.

The direct/local intake follow-up passes 33 focused contract/Store/View/persistence tests, the full 217-file / 1549-test Vitest suite, lint, production build, governance and diff checks, 8 Music Playwright cases across desktop and simulated mobile, the 12-case default/zen visual gate, and direct browser inspection at desktop and 393 x 852 with no document or settings-panel overflow.

The active-journey Map media follow-up passes the current full 217-file / 1556-test Vitest suite, lint, production build, governance and diff checks, plus 10 focused Music and Map/Music Playwright cases across desktop Chromium and simulated Pixel 5. The prior 12-case default/zen visual gate remains green.

The Radio Browser preset follow-up passes the current full 217-file / 1559-test Vitest suite, lint, production build, governance and diff checks, plus 12 focused Music and Map/Music Playwright cases across desktop Chromium and simulated Pixel 5. The two new Radio Browser cases prove no-key setup, fixed HTTPS/MP3 filtering, station normalization, search, and playback. Direct API inspection also returned HTTP 200 with wildcard CORS; individual live-station uptime remains external.

The 2026-08-10 provider-cache and favorite-state follow-up passes 44 focused Adapter/Store/View/persistence-inventory tests, full lint, governance, production build, the full 225-file / 1635-test Vitest suite, and all 12 `music-app.spec.js` desktop/simulated-Pixel-5 cases. Store coverage proves 24-hour reuse, expiry refresh, the 50-track LRU boundary, same-track single-flight, synchronous and asynchronous cached-stream retry, and lyrics reuse. The ChKSz case also proves the explicit favorite state, Library admission, and refresh persistence with mocked provider responses; manual default-desktop and 393 x 852 inspection confirms the selected-heart treatment and zero document/sheet horizontal overflow.

Still deferred:

- opt-in smoke against ChKSz with a real user-authorized device Key, including provider rights, browser CORS header exposure, quota, and playable URL behavior;
- true-device audio focus, interruption, headset/lock controls, safe-area, keyboard, and PWA relaunch proof;
- provider-specific OAuth, signed-stream, DRM, QQ Cookie, non-NetEase playlist/lyrics, offline-audio caching, cast, and download contracts;
- optional local-audio binary backup packaging and same-track relink after restore/device-storage loss;
- Chat search and external Map queue-request callers;
- any hosted music proxy or server-side catalog service.

These gaps do not reopen the implemented local app baseline, but they block claims that every third-party music platform will play successfully.
