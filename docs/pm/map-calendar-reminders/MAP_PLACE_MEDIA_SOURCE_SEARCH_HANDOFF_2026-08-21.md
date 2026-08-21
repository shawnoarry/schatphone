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

## Local Artifacts

The following directory is Git-ignored and must be copied separately when moving to another
PC. Do not add the original files to the repository:

`output/imagegen/map-place-media-search-20260821/`

Important files inside it:

- `review-zh.html`: first-pass Chinese visual screening board;
- `user-selection.json` / `user-selection.md`: normalized user decisions;
- `source-review.json` / `source-review.md`: metadata pre-review and mismatch flags;
- `user-selected-source-candidates/download-manifest.json`: resumable download state;
- `user-selected-source-candidates/source-candidates/`: untouched downloaded originals;
- `download-selected-sources.mjs`: resumable source downloader.

The ignored archive is not included in the Git commit. If it is unavailable on the remote
PC, copy the whole directory before resuming; otherwise the downloader can be recreated
from the tracked selection and source-review records only after those records are also
copied.

## Git Handoff

- Current branch: `main`.
- This round's tracked commit contains only this handoff file and the Map package status
  update. Do not stage the unrelated `tmp/` artifacts or other user work.
- After the push, the remote PC should run `git pull --ff-only origin main` and verify the
  latest `origin/main` before copying the ignored artifact directory.

## Resume Procedure

1. On the remote PC, update `main` from the pushed commit with fast-forward-only pull.
2. Copy `output/imagegen/map-place-media-search-20260821/` into the same relative path.
3. From the repository root, run:

   `node output/imagegen/map-place-media-search-20260821/download-selected-sources.mjs`

The script skips verified files, strips `utm_*` query parameters from Wikimedia original
URLs, records bytes/SHA-256/SHA-1/license/source page/user role, and stops at the first
HTTP 429 so the source host is not hammered. Do not replace originals with thumbnails or
proxy-transformed images.

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
