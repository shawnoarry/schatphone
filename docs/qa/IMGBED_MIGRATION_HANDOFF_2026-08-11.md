# SchatPhone Image-Bed Migration Handoff

Updated: 2026-08-12

Status: `MIGRATION_AND_LOCAL_ARCHIVE_COMPLETE / THREE-HOST_RELEASE_PENDING`

## 1. One Decision

SchatPhone uses one personal image bed for both development and production.

- Project-owned runtime assets use the public `schatphone-assets/` prefix.
- Development, preview, and production all read the same image-bed URL.
- Upload, listing, and management still require authentication.
- A migrated runtime image has one canonical image-bed copy. Do not also upload it to `schatphone-source/`.
- Keep only PWA/install/offline bootstrap icons in the repository.

`schatphone-source/` remains protected. It is outside the current migration and is optional for source files that genuinely need private archival. It is not a required second copy of a runtime image.

## 2. Personal Use In SchatPhone

The same image bed is also the future remote store for the owner's Gallery images.

- Personal uploads use `schatphone-user/` and stable, non-guessable object names.
- The app keeps the upload token only in device-local credential storage and excludes it from ordinary backup and source control.
- After upload, Gallery stores the returned HTTPS URL as the asset source instead of retaining a second local binary.
- Existing Gallery URL assets already render directly and can be used as AI references.
- Personal image-bed upload is a separate application Adapter slice; it must preserve explicit `Keep in Gallery`, deletion guards, and local-first failure reporting.
- Until a private authenticated-media flow is implemented, personal image-bed URLs are link-accessible. Do not silently upload private user media.

The temporary migration token is not the permanent in-app user token.

The repository publisher token is also separate. It is a long-lived development credential with `upload + list` only, while the future Gallery token belongs to the application/device boundary.

## 3. Current Inventory

Inventory generated at:

- `.imgbed-migration/IMGBED_INVENTORY_2026-08-11.json` (local and Git-ignored)

Measured tree:

- 1,155 tracked media files, 1,272,777,207 bytes total;
- 399 runtime files under `public/`, 384,151,788 bytes;
- 377 files under `public/images/ui-assets/`, 381,333,929 bytes;
- 2 Food Delivery runtime files outside that tree, 651,343 bytes;
- 20 PWA/install icons, 2,166,516 bytes, retained locally;
- 593 generated working files under `output/imagegen/`, deferred rather than copied to the runtime image bed;
- 190 `output/` files, 194,907,311 bytes, are byte-identical to 177 public runtime files and must not be uploaded a second time;
- current packed Git objects: 1,092,435,968 bytes.

Removing current files reduces checkout size and future Git growth. It does not remove bytes already present in Git history. History rewriting remains a separate explicit decision.

Generated-output cleanup follows one-copy rules:

- when an `output/` file is byte-identical to a migrated runtime asset, keep the public image-bed object and place the local generated duplicate on the later deletion list;
- keep a unique generated master only when it has real editing or regeneration value; if it needs private archival, upload that master once under `schatphone-source/`;
- rejected drafts, temporary exports, and QA evidence do not belong in the runtime image bed;
- no generated-output deletion happens until the matching runtime image and repository references have passed review.

## 4. Completed Migration

The approved complete plan and its credential-free results remain local and Git-ignored under `.imgbed-migration/`.

- 771 unique objects are verified by remote key, byte length, and SHA-256: 377 public runtime assets and 394 protected unique sources.
- The committed registry contains those objects plus the three-object project-brief smoke batch: 774 unique remote keys and 774 unique digests.
- Image-bed commit `75bde8f62c930c01881a3700b0e5c94d08c6bdbd` deployed the authenticated `/upload/batch` endpoint; its production workflow and anonymous `401` check passed.
- `SchatPhone-Project-Publisher` is the long-lived upload/list-only credential. It has no expiry and no delete/manage permission, and exists only in ignored `.env.local` until the owner adds it to a password manager.
- The project-brief smoke published one protected master plus public poster and thumbnail in a single batch, then re-downloaded and verified all three objects.
- Browser runtime construction now goes through `src/lib/project-assets.js`; `schatphone-source/` is never used as a runtime origin.
- The migration archive at `I:\Schatphone-Asset-Archive\masters\2026-08-11` verified and removed 972 planned source/alias files totaling 1,219,569,601 bytes. The separate project-brief archive verified and removed 3 files totaling 1,907,552 bytes.
- PWA/install/offline bootstrap resources and every file outside the approved plans remain in place. Git history was not rewritten.

## 5. Required Order

1. Run inventory and generate one small public-runtime plan.
2. Review and explicitly approve that plan.
3. Upload with the scoped token.
4. Download every uploaded file anonymously and verify its byte length and SHA-256.
5. Replace only that batch's application references with `https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/...` URLs.
6. Run lint, tests, build, and the affected route checks.
7. Verify the deployed pages.
8. Remove the matching repository files only after a separate explicit approval.
9. Repeat in small batches.

Never replace a runtime reference with a `schatphone-source/` URL.

## 6. Credentials

- Production image bed: `https://cloudflare-imgbed-7z3.pages.dev/`
- Administrator login: `https://cloudflare-imgbed-7z3.pages.dev/adminLogin`
- Image-bed repository: `H:\SchatPhone\CloudFlare-ImgBed`
- Required hardening commit: `0030ddfd8b4b7291bf8ff71509682fef85a124ad`
- Temporary token entry: `SchatPhone-Migration` in the synced password manager.

Never paste the token into chat or commit it. Store it only as `SCHATPHONE_IMGBED_TOKEN` in ignored `.env.local` or a process environment variable. The temporary token has `upload` and `list` permissions, expires around 2026-08-18, and has no delete permission.

The completed migration uses a separate long-lived project publisher token:

- local variable: `SCHATPHONE_IMGBED_PROJECT_TOKEN`;
- permissions: `upload + list`;
- denied permissions: `delete + manage`;
- expiry: none, by the owner's explicit decision;
- storage: ignored `.env.local` and the owner's password manager only.

The future in-app Gallery token is not this project token. It remains device-local and belongs to the separately approved `schatphone-user/` Adapter slice.

## 7. Commands

- `npm.cmd run imgbed:inventory`
- `npm.cmd run imgbed:plan`
- `npm.cmd run imgbed:preflight -- --require-token`
- `npm.cmd run imgbed:upload -- --plan <approved-plan> --execute`
- `npm.cmd run assets:prepare -- --batch <id> [--runtime <local>=<remote>] [--source <local>=<remote>] --approve --approval-source <decision>`
- `npm.cmd run assets:publish -- --plan .imgbed-publish/<id>.plan.json --execute`
- `npm.cmd run assets:check`
- `npm.cmd run imgbed:registry-sync -- --plan <path> --results <path> --batch <id> --execute`
- `npm.cmd run imgbed:archive -- --plan <path> --results <path> --destination I:\Schatphone-Asset-Archive\masters\2026-08-11 --execute`
- `npm.cmd run imgbed:archive-remove -- --manifest <path> --plan <path> --results <path> --references-migrated --execute`

The upload command does not delete local files. It rejects remote conflicts and verifies public anonymous download integrity after upload.

The project publisher batches at most 10 files and 40 MiB per request, verifies public and protected downloads by size and SHA-256, and records verified objects in `config/project-assets.json`. The shared pre-commit hook and CI only perform offline checks; they block unpublished local media but never receive a token or upload during commit.

Migration archive and removal are separate operations. Removal rechecks the archive against the approved plan and complete result document, verifies archive and source hashes again, and cannot expand beyond plan `path` and `aliasPaths`. `--manifest-name <file.json>` keeps independently approved follow-up batches in the same dated archive without overwriting the main migration manifest.

## 8. Stop Conditions

Stop before:

- uploading an unapproved plan;
- deleting local runtime assets;
- rewriting Git history or force-pushing;
- putting a token in frontend source or a public URL;
- silently uploading personal/private Gallery media;
- continuing after a digest mismatch or an expired token.
