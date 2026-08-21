# Map Place Media Source Search Handoff

Date: 2026-08-21
Owner package: `map-calendar-reminders`
Handoff state: `READY_FOR_REMOTE_HANDOFF`

## Current Boundary

The user has finished the first visual screening for 22 Seoul places. The persisted
selection is 79 candidates: 22 primary-image candidates and 57 surrounding-area
candidates. This round only archives and verifies source candidates. It does not change
Map place records, runtime image URLs, `src/lib/map-place-media.js`, or
`config/project-assets.json`.

The intended product direction is unchanged:

- one verified primary image for the overview;
- additional verified images from the same place may become a detail-page swipe gallery;
- surrounding-area images remain explicitly labeled and cannot prove the exact storefront
  or building;
- no candidate enters runtime before identity, license, crop, and role review are complete.

## Source Review State

- 26/79 untouched originals are archived and their downloaded SHA-1 values match the
  recorded Commons source SHA-1 values.
- 52 candidates remain `pending_download`.
- 1 candidate is in `rate_limited` retry state after Wikimedia returned HTTP 429.
- 5 candidates are pre-flagged as identity mismatches and are ineligible for exact-place
  use: Incheon Airport Terminal 1 #01/#02, National Museum of Korea #07, and Modern Seoul
  #01/#02.
- Special license follow-up remains required for Gwanghwamun Square #08 (KOGL Type 1),
  Incheon Airport Terminal 1 #07 (CC BY-SA 3.0 de), and Gocheok Sky Dome #07 (KOGL Type 1).

## Artifacts And Git Boundary

The large untouched source originals and temporary review output are intentionally **not
pushed**. They remain under the Git-ignored batch directory:

`output/imagegen/map-place-media-search-20260821/`

Important files inside it:

- `review-zh.html`: first-pass Chinese visual screening board; local only;
- `user-selection.json` / `user-selection.md`: normalized user decisions. The JSON is now
  tracked for remote continuation; the Markdown board remains local;
- `source-review.json` / `source-review.md`: metadata pre-review and mismatch flags. The
  JSON is now tracked; the Markdown note remains local;
- `user-selected-source-candidates/download-manifest.json`: resumable download state; the
  JSON is now tracked;
- `user-selected-source-candidates/source-candidates/`: untouched downloaded originals;
- `download-selected-sources.mjs`: resumable source downloader; the script is now tracked.

The 26 files under `source-candidates/`, the first-pass HTML board, and temporary review
images are not in Git. They are optional for the first remote-PC continuation and can remain
on this PC until the second-pass visual review.

## Git Handoff

- Current branch: `main`.
- This round's next tracked commit will contain this handoff update plus the lightweight
  source queue JSON and downloader helper. Do not stage the unrelated `tmp/` artifacts or
  other user work.
- After the push, the remote PC should run `git pull --ff-only origin main` and verify the
  latest `origin/main`; no ignored original files need to be copied for the first download
  continuation.

## Resume Procedure

1. On the remote PC, update `main` from the pushed commit with fast-forward-only pull.
2. Run the tracked script with `--skip-archived`; no ignored files need to be copied:

   `node output/imagegen/map-place-media-search-20260821/download-selected-sources.mjs --skip-archived`

   The repository root may be on any drive or under any user directory; this command is
   relative to that checkout.

The script skips the 26 archived records when `--skip-archived` is supplied, strips
`utm_*` query parameters from Wikimedia original URLs, records bytes/SHA-256/SHA-1/license/
source page/user role, and stops at the first HTTP 429 so the source host is not hammered.
Do not replace originals with thumbnails or proxy-transformed images. When the original 26
files are later copied into the batch directory, rerun without `--skip-archived` to restore
exact local resume behavior.

## Next Safe Slice

1. Finish the untouched-original archive after the source rate limit clears.
2. Verify source identity, author, license, privacy/architecture concerns, and visual
   composition for each downloaded candidate.
3. Produce a second-pass Chinese review board using the actual originals. Classify each
   candidate as primary image, detail-gallery image, surrounding-area image, defer, or
   re-source/reject.
4. Only after that review, create overview/detail derivatives and update the runtime media
   registry in a separate approved slice.

## Validation And Protection

- `git diff --check` passed.
- `npm.cmd run governance:check` passed: 2 files, 14 tests.
- 26 archived files were independently rehashed against the manifest source SHA-1 values.
- No merge, rebase, reset, clean, or worktree deletion was performed.
- Unrelated tracked/untracked user work remains outside this commit, including `tmp/`
  visual artifacts.
