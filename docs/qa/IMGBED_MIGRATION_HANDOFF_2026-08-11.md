# SchatPhone Image Bed Migration Handoff

Updated: 2026-08-11

Status: `READY_TO_RESUME / MIGRATION_NOT_STARTED`

Purpose: let a new local Codex conversation resume the SchatPhone asset-governance and image-bed migration without relying on the original conversation. This is an operational handoff, not a second roadmap or a production-completion claim.

## 1. Goal

Move suitable repository-hosted image/media assets to the personal image bed, replace SchatPhone references in controlled batches, and reduce future repository growth without breaking current routes or rewriting Git history implicitly.

Important distinction:

- removing assets from the current tree reduces the checkout and future commit growth;
- it does not substantially shrink existing `.git` history when those bytes already exist in old commits;
- any history rewrite requires a separate inventory, backup, coordination, and explicit user approval.

## 2. Authoritative Endpoints And Repositories

- SchatPhone repository: `https://github.com/shawnoarry/schatphone.git`
- Image-bed source repository: `https://github.com/shawnoarry/CloudFlare-ImgBed.git`
- Production image bed: `https://cloudflare-imgbed-7z3.pages.dev/`
- Administrator login: `https://cloudflare-imgbed-7z3.pages.dev/adminLogin`
- Cloudflare Pages project name: `cloudflare-imgbed`
- Pages domain name: `cloudflare-imgbed-7z3.pages.dev`

Do not confuse the Pages project name with the domain name.

## 3. Completed On 2026-08-11

1. Image-bed source hardening was committed as `0030ddfd8b4b7291bf8ff71509682fef85a124ad` and pushed to `shawnoarry/CloudFlare-ImgBed` `main`.
2. Cloudflare production was redeployed from that same Git commit. Successful deployment ID: `392af5c9-be83-42e3-bca0-f3b6e9cd8e12`.
3. Production configuration now requires authentication:
   - administrator username is `Noarry`;
   - `BASIC_PASS` and `AUTH_CODE` are Cloudflare secrets and must never be written to Git or chat;
   - `AUTH_ALLOW_ANONYMOUS=false`;
   - `PROTECTED_FILE_PREFIXES=schatphone-source`.
4. The image bed is connected to Hugging Face storage `Noarry/ccd` through the new `SchatPhone-ImgBed` Hugging Face token. The token value is not recorded here.
5. Security smoke passed:
   - upload and download returned `200`;
   - downloaded SHA-256 matched the uploaded source;
   - duplicate upload returned `409`;
   - anonymous management and upload access returned `401`;
   - an invalid administrator login returned `401` after the production redeploy.
6. Smoke object retained for traceability: `schatphone-source/smoke/schatphone-imgbed-smoke-20260811.txt` (40 bytes).
7. A scoped image-bed API token named `SchatPhone-Migration` was created with only `upload` and `list` permissions. It has no `delete` or `manage` permission, expires after 7 days (around 2026-08-18), and is configured for automatic deletion after expiry.
8. The user saved `SchatPhone-Migration` in the synced Google/Chrome Password Manager. No token value exists in this repository.

## 4. Credential Rules For The New PC

1. Never ask the user to paste the token into chat.
2. Retrieve it from the synced password-manager entry named `SchatPhone-Migration`.
3. Put it only into a process environment variable or a local ignored secret file, for example `SCHATPHONE_IMGBED_TOKEN` in `.env.local`.
4. Before using `.env.local`, verify it is ignored with `git check-ignore -v .env.local`.
5. Never print the value, include it in command output, commit it, upload it as an artifact, or place it in a migration manifest.
6. A Windows user-encrypted backup exists on the original PC only. It cannot be decrypted on the home PC and is not a transfer mechanism.
7. The older account-level Hugging Face token named `Schat` has not been revoked. The current image bed no longer references it, but other unknown scripts may still do so. Audit before revocation.

## 5. Resume Checklist

1. Pull `shawnoarry/schatphone` `main` and confirm this handoff is present.
2. Pull `shawnoarry/CloudFlare-ImgBed` `main` and confirm `0030ddf` is reachable.
3. Confirm the 7-day migration token has not expired and configure it locally without exposing its value.
4. Inventory candidate assets before any upload or deletion. Record:
   - repository-relative path;
   - byte size and SHA-256;
   - MIME/type;
   - all code, CSS, JSON, and documentation references;
   - whether the file is runtime-critical, source/master-only, generated, duplicate, or already remote;
   - proposed remote key and final public URL.
5. Produce a size report for both the current tree and `.git` object history. Do not claim current-file migration will erase historical bytes.
6. Propose the first small migration batch. Prefer assets with clear ownership, stable references, and easy rollback. Keep source files until remote retrieval and application checks pass.
7. Upload under the protected `schatphone-source/` prefix with deterministic paths. Treat `409` as a duplicate/conflict signal to investigate, not permission to overwrite blindly.
8. Verify every uploaded object by status, content length, and SHA-256 before replacing references.
9. Replace references in a bounded batch, then run checks proportional to the affected surface: at minimum lint, tests, build, and targeted E2E for user-facing routes.
10. Commit the manifest/reference changes separately from any later source-file deletion. Preserve a direct rollback path.
11. Repeat in reviewed batches. Do not bulk-delete local assets merely because upload succeeded.
12. When migration is complete, verify production URLs, confirm no repository references remain, and revoke the temporary token if it has not already expired and auto-deleted.

## 6. Stop Conditions

Stop and ask the user before:

- rewriting Git history or force-pushing any branch;
- deleting original/master assets;
- changing image-bed authentication, Hugging Face storage, or Cloudflare secrets;
- granting `delete` or `manage` permission to a migration token;
- migrating user/private data rather than repository-owned public assets;
- continuing after the scoped token expires or an integrity check differs.

## 7. First Message For The New Conversation

Use this exact prompt after opening the home-PC SchatPhone workspace:

> Read `AGENTS.md` and `docs/qa/IMGBED_MIGRATION_HANDOFF_2026-08-11.md`. Resume at the inventory stage. The scoped token is in my synced password manager; provide a local secret-input method and never ask me to paste it into chat. Do not rewrite Git history or delete assets without a separate review and my explicit approval.
