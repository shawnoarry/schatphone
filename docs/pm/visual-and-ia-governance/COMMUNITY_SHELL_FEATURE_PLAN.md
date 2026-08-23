# Ripple Community Shell Feature Plan

Updated: 2026-08-23

Status: `S1_FIXTURE_SHELL_IMPLEMENTED / SHARED_ENTRY_INTEGRATED / UI_STRUCTURE_REVIEWED 2026-08-23`

## 1. Product Role

`Ripple / 涟漪` is the first fixture-backed Community Core shell. It presents public world echoes through accounts, official notices, media reports, personal posts, and clearly labelled claims. It is not Chat, World Hub, Narrative Timeline, an Event Home, or a production Community/Media owner.

The visual thesis is `editorial public signal`: a stable reading surface with newspaper-like hierarchy, a coral-vermilion publishing accent, and explicit provenance labels. It deliberately avoids chat bubbles and generic social-card decoration.

The accepted App Store/Home identity is `ripple-community-app-icon-v1.png`, the user-selected first-round Ripple mark. `fas fa-wave-square` remains the accessible and customization fallback glyph.

## 2. S1 Visible Scope

- `Following`: posts only from accounts the user explicitly follows;
- `Explore`: deterministic fixture curation, including moments, discussion, and long-form features;
- `News`: public institution, official-channel, and media publications;
- `Saved`: local bookmarks with an honest empty state;
- account/channel panel with identity type, verification, bio, post count, follow/unfollow;
- post detail with committed publication copy, linked fact summaries, claim truth status, correction state, and source-unavailable treatment;
- a compact feed-level status guide that makes `Verified / Account claim / Published post` legible before the user opens an individual post;
- device-local light state for follows, bookmarks, reads, and the last selected channel;
- local refresh feedback that does not call a provider, AI, Event Runtime, or network API.

Fixture data includes default-world Korean locations and organizations, while system UI and built-in copy follow the selected Chinese or English system language. Korean-world context is not used as a substitute for localization.

## 3. Fact / Claim / Post Fixture Contract

The fixture repository keeps three meanings separate:

1. `Fact`: a bounded owner-confirmed reference with owner, record ID, revision, public summary, and source availability;
2. `Claim`: an account assertion with `confirmed`, `partially_confirmed`, `unverified`, `contradicted`, or `unknown` truth status;
3. `Post`: a committed publication record with its own author, channel, body, time, state, and optional Fact/Claim references.

The shell follows these UI rules:

- an unverified claim is labelled `未经证实 / Unverified` and explicitly says it is not a confirmed fact;
- a contradicted claim remains visible as publication history and receives a correction label;
- a post with no Fact or Claim is labelled as published content, not as world truth;
- unavailable sources keep their already-published text, disclose the failed source, and do not reconstruct missing material;
- fixture integrity failure displays an error state instead of substituting plausible-looking content.

## 4. Local State And Refresh

Preview state is stored at `schatphone:community-shell:preview-state` and contains only:

- followed account fixture IDs;
- bookmarked post fixture IDs;
- read post fixture IDs;
- the active channel ID.

This state is an S1 preview seam, not a production Store, backup child, publication database, account relationship owner, or proof that another character knows the content. Refresh re-evaluates the same stable fixture set and displays explicit zero-AI feedback. It cannot create a post, claim, fact, reply, event, relationship change, reputation change, notification, or cross-module write.

## 5. Responsive And Accessibility Contract

- desktop: left channel rail, centered feed, and right editorial/account context;
- medium width: channel rail plus feed, with detail replacing the reading surface;
- simulated Pixel 5: fixed bottom channel navigation, single-column edge-to-edge feed, and full-screen post detail;
- `default` and `zen` use independent paper, panel, text, divider, semantic-status, focus, and action colors;
- conventional controls have accessible labels and at least 42–44 px hit areas;
- keyboard focus is visible, reduced motion removes decorative transitions, long handles/titles/bodies wrap or truncate intentionally;
- normal, empty, integrity failure, source unavailable, unverified, corrected, long-form, and no-media states are represented;
- the app root, feed, detail, and mobile navigation must retain zero horizontal overflow.

## 6. Explicit Exclusions

This S1 shell does not:

- allow user publication, replies, repost execution, likes, reports, moderation, or content authoring;
- create a production Community/Media Store, schema migration, backup section, search index, recommendation model, or AI drafting flow;
- copy Chat Me summaries, relationship truth, owner records, or Event Runtime logs;
- treat Post or Claim as Fact;
- write Chat, Contacts, Map, Calendar, Phone, Wallet, Notification, Relationship Runtime, World State, or Event Runtime;
- create fandom facades or artist-message subscription products;
- establish a Community publication Event chain.

## 7. Future S2 / S3 Seams

S2 requires a separately accepted Community/Media owner and package covering durable accounts, channels, publications, claims, replies, subscriptions, moderation, edit/tombstone history, pagination, search, backup/restore, migration, world isolation, stable deep links, and source-revision handling.

S3 may later accept a `publication request` that references an owner-confirmed fact or an explicitly modelled claim. Community validates author authority, channel, visibility, sources, revision, and body before committing a durable post, then returns a stable publication reference. A failed publication must not fabricate a post or roll back the source fact. Ordinary feed refresh remains zero-token.

The safest first production chain remains:

```text
owner-confirmed public schedule fact
-> Community publication request
-> committed official post
-> separate system notification
-> exact post deep link and return context
```

This future seam is documented only. It is not implemented or authorized by the S1 shell.

## 8. Owned Files

- `src/views/CommunityView.vue`
- `src/components/community/**`
- `src/lib/community-shell-data.js`
- `src/lib/community-shell-state.js`
- `tests/community-view.test.js`
- `e2e/community-app.spec.js`

Shared router, Home, App Store, icon, persistence-inventory, roadmap, and system integration are complete. Notification writing remains excluded. The 2026-08-23 lightweight structure review preserved the channel/feed/detail hierarchy and added only the user-facing content-status guide; it did not introduce posting, recommendation, or Community-owner behavior.
