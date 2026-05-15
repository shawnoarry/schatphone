# SchatPhone Development Tooling

Updated: 2026-05-14

This document records shared development tools outside the visual-workflow skill group. Its purpose is to keep different PCs and future handoffs on the same operating assumptions.

Visual-only tools and design skills are documented separately in:

```text
docs/process/VISUAL_WORKFLOW.md
```

## 1. Confirm Local Paths First

Before installing tools on another PC, ask the machine owner to confirm:

```text
1. SchatPhone project root:
2. Node.js installation path:
3. npm global prefix:
4. Preferred shell in VSCode:
5. Whether PowerShell should use npm/npx or npm.cmd/npx.cmd:
6. OpenCLI global install location:
7. Any local reference/tool directories outside the repo:
```

Current machine values:

```text
SchatPhone project root: D:\github\schatphone
Node.js path: D:\rabbitpro\node.exe
npm.cmd path: D:\rabbitpro\npm.cmd
npx.cmd path: D:\rabbitpro\npx.cmd
npm global prefix: C:\Users\Administrator\AppData\Roaming\npm
OpenCLI command: C:\Users\Administrator\AppData\Roaming\npm\opencli.cmd
VSCode shell: PowerShell
```

Do not assume another PC has the same `D:` drive, user name, npm prefix, or PowerShell policy.

## 2. Runtime Toolchain

Project runtime:

```text
Node.js: v22.13.0 on the current machine
npm: 10.9.2 on the current machine
```

Recommended checks:

```powershell
node --version
npm.cmd --version
npx.cmd --version
npm.cmd config get prefix
```

On this Windows machine, PowerShell blocks `.ps1` shims by policy. Prefer command shims ending in `.cmd`:

```powershell
npm.cmd
npx.cmd
opencli.cmd
```

Avoid assuming plain `npm`, `npx`, or `opencli` will work in PowerShell, because those names may resolve to blocked `.ps1` files.

## 3. Project Commands

Run from the confirmed SchatPhone project root:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

If a command fails because plain `npm` is blocked, retry with `npm.cmd`.

## 4. OpenCLI

OpenCLI is a general tool outside the visual专项 skill group.

Current installation:

```text
Package: @jackwener/opencli
Version: 1.7.19
Global command: C:\Users\Administrator\AppData\Roaming\npm\opencli.cmd
```

Install command:

```powershell
npm.cmd install -g @jackwener/opencli
```

Verification:

```powershell
opencli.cmd --version
opencli.cmd --help
opencli.cmd list
opencli.cmd doctor
```

PowerShell note:

- `opencli.cmd` is the recommended invocation on Windows.
- Plain `opencli` may resolve to `opencli.ps1`, which can fail if PowerShell script execution is restricted.

## 5. Skills CLI

The `skills` installer is used for project-local skills and may be invoked through `npx.cmd`.

Common pattern:

```powershell
npx.cmd skills add <source>
```

Run project-local skill installs from the confirmed SchatPhone project root so they land in:

```text
<SchatPhone project root>\.agents\skills
```

Current project-local visual skills are tracked in:

```text
skills-lock.json
.agents\skills
```

The visual skill list and installation commands live in:

```text
docs/process/VISUAL_WORKFLOW.md
```

## 6. VSCode Notes

Current environment:

```text
Editor detected: VSCode Insiders
Integrated shell: PowerShell
```

Recommended VSCode terminal checks:

```powershell
Get-Command node,npm.cmd,npx.cmd,opencli.cmd
node --version
npm.cmd --version
opencli.cmd --version
```

If a tool works in an external terminal but not in VSCode:

1. Restart VSCode so PATH changes are reloaded.
2. Check `Get-Command <tool>` to see which shim is being resolved.
3. Prefer `.cmd` shims if PowerShell blocks `.ps1`.
4. Confirm the npm global prefix is on PATH.

## 7. Cross-PC Setup Checklist

Use this checklist before another device takes over development:

1. Confirm local paths with the machine owner.
2. Install Node.js/npm or confirm the existing Node version is suitable.
3. Confirm PowerShell can run `npm.cmd` and `npx.cmd`.
4. Clone SchatPhone and run project install from the confirmed project root.
5. Install OpenCLI globally if that PC needs browser/app CLI tooling.
6. Install visual专项 skills by following `docs/process/VISUAL_WORKFLOW.md`.
7. Confirm `skills-lock.json` and `.agents\skills` are present after project-local skill installs.
8. Run verification commands:

```powershell
node --version
npm.cmd --version
npx.cmd --version
opencli.cmd --version
git status --short
```

## 8. Ownership Rule

This file is for shared development tooling only.

Keep visual design skills, visual workflow, design reference libraries, and visual专项 triggers in:

```text
docs/process/VISUAL_WORKFLOW.md
```

Keep product behavior rules and day-to-day app operation rules in:

```text
docs/process/OPERATION_GUIDE.md
```
