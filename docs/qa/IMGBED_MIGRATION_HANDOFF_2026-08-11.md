# SchatPhone Image-Bed Migration Handoff

Updated: 2026-08-12

Status: `MIGRATION_ARCHIVE_AND_THREE_HOST_RELEASE_COMPLETE`

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

The confirmed complete migration list and its credential-free results remain local and Git-ignored under `.imgbed-migration/`.

- 771 unique objects are verified by remote key, byte length, and SHA-256: 377 public runtime assets and 394 protected unique sources.
- The project registry now contains 843 unique remote keys and 843 unique digests: 415 public runtime objects and 428 protected source objects. This includes the 771-object migration, the three-object project-brief smoke, later runtime/source updates, and the 23-object visual-source follow-up completed on 2026-08-12.
- Image-bed commit `75bde8f62c930c01881a3700b0e5c94d08c6bdbd` deployed the authenticated `/upload/batch` endpoint; its production workflow and anonymous `401` check passed.
- `SchatPhone-Project-Publisher` is the long-lived upload/list-only credential. It has no expiry and no delete/manage permission, is saved in the owner's synchronized password manager, and is copied only into each publishing workstation's ignored `.env.local`.
- The project-brief smoke published one protected master plus public poster and thumbnail in a single batch, then re-downloaded and verified all three objects.
- Browser runtime construction now goes through `src/lib/project-assets.js`; `schatphone-source/` is never used as a runtime origin.
- The device-local migration archive verified and removed 972 planned source/alias files totaling 1,219,569,601 bytes. The separate project-brief archive verified and removed 3 files totaling 1,907,552 bytes. Its home-PC path is deliberately not tracked because it is backup storage, not project configuration.
- The 23-object visual-source follow-up was batch-uploaded, re-downloaded, and verified by byte length and SHA-256, then copied and verified again under the device-local archive using `workspace-visual-assets-2026-08-12-archive-manifest.json`; it added 30,128,708 bytes of protected masters, generation sources, and candidates without treating them as final artwork.
- PWA/install/offline bootstrap resources and every file outside confirmed migration/upload lists remain in place. Git history was not rewritten.
- SchatPhone commits `f654b81` and `ffae433` are pushed to `origin/main`. GitHub Pages Run `31537206567` passed the full release gate and deploy job; Vercel and Cloudflare Workers Builds both reported success for the final commit.
- Production browser smoke passed at `https://shawnoarry.github.io/schatphone/`, `https://schatphone.vercel.app`, and `https://schatphone.noarry.workers.dev`: each host returned `200`, unlocked to Food Delivery, loaded all 18 observed image-bed images, and reported no page errors, console errors, or failed requests.
- A public runtime object returned `200 image/png` with its registered byte length, while an anonymous `schatphone-source/` request returned `401` as required.
- The temporary `SchatPhone-Migration` token was revoked after release proof. The long-lived `SchatPhone-Project-Publisher` token remains active with upload/list only and no expiry.

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
- Revoked temporary token entry: `SchatPhone-Migration`; it was removed from the image bed after the three-host release proof.

Never paste a token into chat or commit it. Any future migration token must stay in ignored `.env.local` or a process environment variable, use only the permissions required by that migration, and be revoked after its verified release.

The completed migration uses a separate long-lived project publisher token:

- local variable: `SCHATPHONE_IMGBED_PROJECT_TOKEN`;
- permissions: `upload + list`;
- denied permissions: `delete + manage`;
- expiry: none, by the owner's explicit decision;
- storage: the owner's synchronized password manager plus each publishing workstation's ignored `.env.local` only; the repository never records the value or a workstation-specific path.

The future in-app Gallery token is not this project token. It remains device-local and belongs to the separately approved `schatphone-user/` Adapter slice.

## 7. Commands

- `npm.cmd run imgbed:inventory`
- `npm.cmd run imgbed:plan`
- `npm.cmd run imgbed:preflight -- --require-token`
- `npm.cmd run imgbed:upload -- --plan <approved-plan> --execute`
- `npm.cmd run assets:prepare -- --batch <id> [--runtime <local>=<remote>] [--source <local>=<remote>] --confirm --confirmation-source <reason>`
- `npm.cmd run assets:publish-pending -- --stage-registry --cleanup-local --fallback-to-git`
- `npm.cmd run assets:publish -- --plan .imgbed-publish/<id>.plan.json --execute`
- `npm.cmd run assets:check`
- `npm.cmd run imgbed:registry-sync -- --plan <path> --results <path> --batch <id> --execute`
- `npm.cmd run imgbed:archive -- --plan <path> --results <path> --destination <device-local-archive-root> --execute`
- `npm.cmd run imgbed:archive-remove -- --manifest <path> --plan <path> --results <path> --references-migrated --execute`

The upload command does not delete local files. It rejects remote conflicts and verifies public anonymous download integrity after upload.

The project publisher batches at most 10 files and 40 MiB per request, verifies public and protected downloads by size and SHA-256, and records verified objects in `config/project-assets.json`. This credential-free work item is an **asset upload list** (`素材上传清单`), not artwork approval: runtime artwork is listed for `schatphone-assets/`; masters, generation sources, and candidates are listed for `schatphone-source/`; audit screenshots, Playwright reports, contact sheets, prompts, and JSON/JSONL evidence are excluded. Uploading does not make an image final, and later image revisions are registered as new SHA-256 content. The shared pre-commit hook automatically publishes confirmed pending lists, stages the registry, and cleans verified generated files. With no pending list it stays offline. A temporary credential/network/transport failure stages only the credential-free list and its exact generated files so another PC can continue; the next commit retries and removes that fallback after success. CI remains offline and receives no token. Version-1 list JSON retains `approved`/`approvalSource` only for compatibility with existing cross-PC files.

Migration archive and removal are separate operations. Removal rechecks the archive against the approved plan and complete result document, verifies archive and source hashes again, and cannot expand beyond plan `path` and `aliasPaths`. `--manifest-name <file.json>` keeps independently approved follow-up batches in the same dated archive without overwriting the main migration manifest.

## 8. Stop Conditions

Stop before:

- uploading a list that has not been explicitly confirmed;
- deleting local runtime assets;
- rewriting Git history or force-pushing;
- putting a token in frontend source or a public URL;
- silently uploading personal/private Gallery media;
- continuing after a digest mismatch or an expired token.
