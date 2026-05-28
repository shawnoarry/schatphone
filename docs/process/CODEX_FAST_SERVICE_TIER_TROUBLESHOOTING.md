# Codex Fast Service Tier Troubleshooting

Updated: 2026-05-28

Purpose: document the repeatable investigation path for cases where Codex still appears to be billed as Fast / priority after `fast_mode = false` has already been set.

This is a machine-local tooling note. It does not define SchatPhone product behavior and should not be used as a roadmap or implementation source.

## 1. Problem Shape

Use this guide when:

- the user has disabled Codex Fast Mode;
- `codex features list` shows `fast_mode = false`;
- the upstream provider or supplier dashboard still reports Fast / priority billing;
- the current repo does not intentionally opt into a paid speed tier.

Important distinction:

- `fast_mode` is a Codex feature flag in user config.
- `default-service-tier` is an extension UI preference stored in VS Code / Codex persisted state.
- If `default-service-tier` is `fast` or `priority`, requests may still carry a Fast / priority service tier even when `fast_mode = false`.

## 2. Do Not Start With These Changes

Do not add this to `config.toml` as a fix:

```toml
service_tier = "priority"
```

`priority` is the Fast / higher-speed service tier in the model catalog, so this can force the unwanted billing path.

Do not rely on this setting unless current Codex documentation or source code confirms it exists:

```toml
[notice]
fast_default_opt_out = true
```

In the 2026-05-28 investigation, `fast_default_opt_out` was not present in the installed Codex extension code and should be treated as no-op or unsupported.

## 3. Step 1: Confirm User-Level Codex Config

Check the effective feature flag first:

```powershell
codex features list | Select-String -Pattern "fast_mode"
```

Expected safe result:

```text
fast_mode stable false
```

Then inspect the user config:

```powershell
Get-Content -LiteralPath "$env:USERPROFILE\.codex\config.toml"
```

Confirm:

```toml
[features]
fast_mode = false
```

Optional sanity check:

```powershell
codex doctor --json
```

Use this to confirm the config parses and the intended provider/model are loaded. Do not assume `doctor` exposes every runtime-only service-tier field.

## 4. Step 2: Confirm The Repo Is Not Overriding It

From the project root, search for service-tier or Fast-related settings:

```powershell
rg -n "fast_mode|service_tier|serviceTier|default-service-tier|priority|fast" . -S
```

Also inspect project-local Codex config if present:

```powershell
if (Test-Path -LiteralPath ".codex\config.toml") {
  Get-Content -LiteralPath ".codex\config.toml"
}
```

Safe SchatPhone finding on 2026-05-28:

- `.codex/config.toml` only controlled sandbox/approval defaults;
- no project-local `fast_mode`, `service_tier`, `serviceTier`, or `default-service-tier` override existed;
- app code hits for words like `fast` or `priority` were unrelated UI/runtime words.

If the repo has a real service-tier override, resolve that before editing machine-global state.

## 5. Step 3: Check Extension Persisted State

Codex inside VS Code / VS Code Insiders can store UI preferences in VS Code global storage, not in `~/.codex/config.toml`.

First confirm `sqlite3` is available:

```powershell
Get-Command sqlite3 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
```

Then check the active VS Code Insiders global state:

```powershell
$db = "$env:APPDATA\Code - Insiders\User\globalStorage\state.vscdb"
& sqlite3 $db "select json_extract(value, '$.""persisted-atom-state"".""default-service-tier""'), json_extract(value, '$.""persisted-atom-state"".""has-user-changed-service-tier""') from ItemTable where key='openai.chatgpt';"
```

Interpretation:

| Result | Meaning |
| --- | --- |
| `fast|1` | The extension has explicitly stored Fast as the default service tier. This is the likely billing cause. |
| `priority|1` | The extension has explicitly stored priority / Fast. This is also a likely billing cause. |
| `default|1` | The extension preference is set to default. This should map to no explicit service tier. |
| blank | No matching `openai.chatgpt` state in that database. Check other clients/profiles. |

The installed extension code observed on 2026-05-28 mapped `default-service-tier = "default"` to `null`, while non-default values could be passed as `serviceTier`.

## 6. Step 4: Scan Other VS Code / Cursor State Databases

The active client may not be VS Code Insiders. Scan common VS Code-family state stores:

```powershell
$roots = @(
  "$env:APPDATA\Code - Insiders\User",
  "$env:APPDATA\Code\User",
  "$env:APPDATA\Cursor\User"
)

foreach ($root in $roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  $dbs = Get-ChildItem -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue -Filter "state.vscdb"
  foreach ($item in $dbs) {
    $db = $item.FullName
    $result = & sqlite3 $db "select json_extract(value, '$.""persisted-atom-state"".""default-service-tier""') || '|' || json_extract(value, '$.""persisted-atom-state"".""has-user-changed-service-tier""') from ItemTable where key='openai.chatgpt';" 2>$null
    if ($LASTEXITCODE -eq 0 -and $result) {
      Write-Output "$result`t$db"
    }
  }
}
```

If multiple databases show `fast|1` or `priority|1`, fix the one used by the active client. In VS Code Insiders, also check whether `state.vscdb.backup` contains the old value.

## 7. Step 5: Back Up And Change To Default

Only edit a state database after confirming it contains the unwanted value.

Back up first:

```powershell
$db = "$env:APPDATA\Code - Insiders\User\globalStorage\state.vscdb"
$backup = "$db.before-service-tier-default-$(Get-Date -Format yyyyMMddHHmmss).bak"
Copy-Item -LiteralPath $db -Destination $backup -Force
```

Set the extension preference to `default`:

```powershell
$sql = "update ItemTable set value=json_set(value, '$.""persisted-atom-state"".""default-service-tier""', 'default') where key='openai.chatgpt';"
& sqlite3 $db $sql
```

Verify:

```powershell
& sqlite3 $db "select json_extract(value, '$.""persisted-atom-state"".""default-service-tier""'), json_extract(value, '$.""persisted-atom-state"".""has-user-changed-service-tier""') from ItemTable where key='openai.chatgpt';"
```

Expected result:

```text
default|1
```

If `state.vscdb.backup` also has the old value and the active client is closed, update it too or keep the timestamped backup as the authoritative rollback file.

## 8. Step 6: Restart The Active Client

Open VS Code / Codex processes can keep the old value in memory.

After changing the database:

1. close all VS Code Insiders / VS Code / Cursor windows that host Codex;
2. close the standalone Codex app if it is also open;
3. reopen the intended client;
4. start a new Codex port/session;
5. check the provider dashboard again on the new request.

Do not use an already-open session as the final verification source.

## 9. If It Still Bills As Fast

Continue in this order:

1. Re-run the database scan and confirm no active client state still shows `fast|1` or `priority|1`.
2. Check whether the standalone Codex app stores service-tier state outside VS Code:

```powershell
rg -a -n -F "default-service-tier" "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0" -S
rg -a -n -F "service-tier" "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0" -S
```

3. Confirm the provider/model catalog is not mapping the selected model to Fast by default.
4. Confirm the supplier dashboard is showing the new request, not a cached or previous session.
5. Confirm no proxy, wrapper, or upstream gateway is injecting `service_tier`, `serviceTier`, or `priority`.

## 10. Known Good State On 2026-05-28

For this machine, the root cause was:

```text
C:\Users\PC\AppData\Roaming\Code - Insiders\User\globalStorage\state.vscdb
openai.chatgpt.persisted-atom-state.default-service-tier = fast
```

The applied fix was:

```text
openai.chatgpt.persisted-atom-state.default-service-tier = default
```

Validation after the fix:

```text
codex fast_mode = false
VS Code Insiders default-service-tier = default|1
VS Code Insiders state.vscdb.backup default-service-tier = default|1
```

The SchatPhone repo itself did not contain a conflicting service-tier setting.
