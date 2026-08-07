# Figma And ImageGen Cross-PC Setup

Updated: 2026-08-07

Purpose: reproduce the Figma design-to-code connection and the ljqclub-backed image-generation CLI on another Windows PC used by the same owner.

This is a tooling companion to `docs/process/DEVELOPMENT_TOOLING.md`. It is not a roadmap, a product contract, or permission to change SchatPhone code. Follow `docs/process/AI_WORK_MODE.md` and the owning task package after the tools are working.

## 1. What This Guide Reproduces

The setup verified on 2026-07-25 provides two independent capabilities:

1. Figma plugin access from Codex:
   - plugin id: `figma@openai-curated`;
   - plugin MCP endpoint: `https://mcp.figma.com/mcp`;
   - authentication: Figma OAuth through the installed plugin/connector;
   - primary design-to-code operation: `get_design_context` against an exact node.
2. Raster image generation through the bundled ImageGen fallback CLI:
   - API base URL: `https://ljqclub.com/v1`;
   - proxy example used on the verified machine: `http://127.0.0.1:7890`;
   - proxy portability rule: detect and enter the HTTP/Mixed proxy URL for each machine; never assume the verified example applies elsewhere;
   - verified image models: `gpt-image-1`, `gpt-image-1.5`, and `gpt-image-2`;
   - bundled script: `%USERPROFILE%\.codex\skills\.system\imagegen\scripts\image_gen.py`.

The verified local runtime was:

| Tool | Verified version | Portability rule |
| --- | --- | --- |
| Python | 3.13.14 | Use a real Python installation, not the Microsoft Store alias. |
| uv | 0.11.32 | A newer compatible version is acceptable. |
| `openai` Python package | 2.48.0 | Install inside the dedicated ImageGen environment. |
| Pillow | 12.3.0 | Needed for image inspection, downscaling, and chroma-key cleanup. |
| Figma plugin | 2.0.13 | Install the current catalog version; do not copy a versioned cache folder. |

These versions document the successful baseline. They are not project dependency pins.

## 2. Security Rules

1. Never paste an API Key into Codex chat, an issue, a Markdown file, a screenshot, or a Git commit.
2. Do not copy `%USERPROFILE%\.codex` wholesale to another machine. It can contain credentials, machine-specific paths, caches, and session data.
3. Install the Figma plugin on the new machine and complete OAuth again. Do not copy Figma OAuth files or browser cookies.
4. The environment-variable method below stores the API Key as plaintext in the current Windows user's registry. Use it only on a trusted personal Windows account. Anyone who can read that account's environment can read the Key.
5. Revoke and replace the Key in ljqclub if a machine is lost, shared, or compromised.
6. Prompts, input images, and generated images sent through ljqclub pass through a third-party relay. Do not use private personal media or secrets unless that service's data handling is acceptable.
7. Keep preview-only outputs under `%USERPROFILE%\.codex\generated_images`. Copy only selected final assets into SchatPhone, and never leave a project-referenced asset only in the Codex user directory.

## 3. New-Machine Prerequisites

Before configuring the integrations:

1. Install Codex in the ChatGPT desktop app and sign in with the same Codex/ChatGPT account used for development.
2. Clone SchatPhone and complete the base setup in `docs/process/DEVELOPMENT_TOOLING.md`.
3. Confirm the Figma account can open the target design file in a normal browser.
4. Confirm the ljqclub account has an API Key assigned to a group that exposes image models.
5. Install and start Clash/Mihomo when the network requires it.
6. Open a new PowerShell window after installing command-line tools so the refreshed `PATH` is available.

Do not assume another PC has the same drive letter, Windows username, Codex cache version, Python folder, or SchatPhone worktree path.

## 4. Configure Figma

### 4.1 Install And Connect The Plugin

Use the graphical plugin directory rather than copying the current machine's plugin cache:

1. Open Codex in the ChatGPT desktop app.
2. Open **Plugins**.
3. Search for **Figma** in the OpenAI catalog.
4. Select the plus button to install it.
5. Connect the Figma integration when prompted.
6. Sign in to the same Figma account and approve access.
7. Start a new Codex task after installation.

The installed plugin is expected to expose both a connector and the official Figma MCP server. The current plugin manifest points to:

```text
https://mcp.figma.com/mcp
```

Do not manually duplicate this MCP entry when the catalog plugin is installed. The plugin owns its MCP and OAuth wiring.

### 4.2 Verify The Plugin Is Enabled

Run this read-only check in PowerShell:

```powershell
$configPath = Join-Path $HOME ".codex\config.toml"
Get-Content -Encoding UTF8 $configPath |
  Select-String -Pattern 'figma@openai-curated' -Context 0,1
```

The relevant configuration should look like:

```toml
[plugins."figma@openai-curated"]
enabled = true
```

This confirms the plugin is enabled. It does not prove that Figma OAuth or file permissions are valid.

### 4.3 Verify Exact-Node Design Access

Use a Figma URL copied from a selected frame or component. A usable design URL contains `node-id`, for example:

```text
https://www.figma.com/design/zxbGCqZ6AR0E3QDF1bQaQK/Food-Delivery-App-UI-Kit-Food-App-Design-Food-Mobile-App-Delivery-UI--Community-?node-id=47-23
```

Figma URLs use `47-23`; the MCP node id may be represented as `47:23`.

Start a new task and use a verification prompt like:

```text
[@figma](plugin://figma@openai-curated)
只进行 Figma 连接验证，不修改代码或文件。
请加载 figma-design-to-code 工作流，并对 fileKey
zxbGCqZ6AR0E3QDF1bQaQK 的精确节点 47:23 调用 get_design_context。
只报告连接、授权、节点读取是否成功。
```

Successful verification requires all of the following:

1. the `figma-design-to-code` workflow is loaded before the tool call;
2. `get_design_context` is called for the exact `fileKey` and `nodeId`;
3. the response contains design context for that node;
4. no screenshot-only guess is substituted for a failed context call.

For later implementation work, treat generated React/Tailwind code as reference output. Adapt it to SchatPhone's Vue 3, Vite, Pinia, components, tokens, assets, and route ownership.

### 4.4 Figma Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Figma plugin is installed but its skills/tools are absent | Codex task started before plugin installation | Restart Codex and start a new task. |
| OAuth or connector prompt repeats | The Figma connection is missing or expired | Open the Figma plugin and reconnect the connector. |
| File access is denied | The authenticated Figma account cannot access the file/team | Open the same URL in the browser with that account; reconnect with the correct account; use `whoami` when available to inspect the active Figma identity and plans. |
| URL has no `node-id` | A file link was copied instead of a selection link | Select the target frame/component in Figma and use **Copy link to selection**. |
| `get_design_context` times out | The selected node is too large or complex | Retry with a smaller exact frame or component node. |
| Context call fails but a screenshot is visible | MCP/authorization is still unresolved | Stop and report the actual connection error. Do not infer the design from the screenshot alone. |
| A prototype URL opens but the expected screen is not read | The prototype start node differs from the design node | Open the design file, select the real frame, and copy its design-node URL. |

## 5. Configure The ImageGen CLI

### 5.1 Choose Built-In Or CLI Mode

The general ImageGen default is Codex's built-in `image_gen` tool, which does not need an API Key. A listed `imagegen` skill does not prove that the built-in generation tool is callable in the current task.

For SchatPhone, the project owner explicitly selected the bundled CLI on 2026-08-07 as the standing default for later raster-asset generation rounds. Treat that as project-specific CLI opt-in until the owner changes it. Use `gpt-image-2` by default, keep the exact request record with project-bound assets, and do not silently switch to another model. Transparent-output requests still require their own model/background decision; never silently downgrade to `gpt-image-1.5`.

Outside that standing SchatPhone preference, use this CLI setup only when:

1. the built-in tool is unavailable; and
2. the user explicitly chooses the API/CLI fallback.

The bundled CLI must not be edited. It expects OpenAI-compatible image endpoints and accepts only `gpt-image-*` model names.

### 5.2 Install Python And uv

Check the machine first:

```powershell
Get-Command python -ErrorAction SilentlyContinue
Get-Command py -ErrorAction SilentlyContinue
Get-Command uv -ErrorAction SilentlyContinue
```

If `python` resolves only to `WindowsApps\python.exe`, install a real runtime:

```powershell
winget install --exact --id Python.Python.3.13 `
  --scope user `
  --accept-package-agreements `
  --accept-source-agreements

winget install --exact --id astral-sh.uv `
  --scope user `
  --accept-package-agreements `
  --accept-source-agreements
```

Close and reopen PowerShell, then verify:

```powershell
$pythonExe = Get-ChildItem `
  "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe" `
  -ErrorAction Stop |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName

$uvExe = (Get-Command uv -ErrorAction Stop).Source

& $pythonExe --version
& $uvExe --version
```

### 5.3 Create A Dedicated Environment

Keep ImageGen packages outside the SchatPhone dependency graph:

```powershell
$codexRoot = if ($env:CODEX_HOME) {
  $env:CODEX_HOME
} else {
  Join-Path $HOME ".codex"
}

$venvRoot = Join-Path $codexRoot "venvs\imagegen"
$venvPython = Join-Path $venvRoot "Scripts\python.exe"

& $uvExe venv $venvRoot --python $pythonExe
& $uvExe pip install --python $venvPython openai pillow

& $venvPython -c "import openai, PIL; print(openai.__version__); print(PIL.__version__)"
```

Verify that the bundled script exists:

```powershell
$imageGenScript = Join-Path $codexRoot `
  "skills\.system\imagegen\scripts\image_gen.py"

Test-Path $imageGenScript
```

If this returns `False`, update/reinstall Codex or confirm that the system ImageGen skill is installed. Do not download an arbitrary replacement script and do not modify the bundled script.

### 5.4 Confirm Clash/Mihomo

The verified machine used this proxy address:

```text
http://127.0.0.1:7890
```

This is an example, not a required cross-PC value. Another machine may use a different loopback port, a LAN proxy address, Clash TUN mode, or direct access.

First inspect the Windows proxy state:

```powershell
$internetSettings = Get-ItemProperty `
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"

$internetSettings |
  Select-Object ProxyEnable, ProxyServer, AutoConfigURL
```

Then open Clash/Mihomo and read the machine's current **HTTP Port** or **Mixed Port**. Convert the displayed host and port into a URL such as:

```text
http://127.0.0.1:<this-machine-port>
```

Confirm the selected port rather than checking a hard-coded list:

```powershell
$proxyInput = Read-Host `
  "HTTP/Mixed proxy URL for this machine, or leave blank for direct/TUN access"

if (-not [string]::IsNullOrWhiteSpace($proxyInput)) {
  $proxyUri = [Uri]$proxyInput.Trim()
  Test-NetConnection `
    -ComputerName $proxyUri.Host `
    -Port $proxyUri.Port
}
```

If direct/TUN access works, the explicit proxy value may be left blank. Windows **System Proxy** alone is not sufficient evidence that Python `httpx` will use it; when an explicit proxy is required, the standard `HTTP_PROXY` and `HTTPS_PROXY` environment variables below make the CLI behavior deterministic.

### 5.5 Store URL, Proxy, And Key Locally

Run this in an interactive PowerShell window. It hides input, writes only to the current user's environment registry, and never prints the Key:

```powershell
$secureKey = Read-Host "Paste ljqclub API Key (input hidden)" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
  if ([string]::IsNullOrWhiteSpace($plainKey)) {
    throw "No API Key was entered."
  }

  $baseUrl = "https://ljqclub.com/v1"
  $proxyInput = Read-Host `
    "HTTP/Mixed proxy URL for this machine, or leave blank for direct/TUN access"
  $proxyUrl = $proxyInput.Trim()
  $environmentPath = "HKCU:\Environment"

  if ($proxyUrl) {
    $proxyUri = [Uri]$proxyUrl
    if ($proxyUri.Scheme -notin "http", "https" -or $proxyUri.Port -le 0) {
      throw "Enter an HTTP/HTTPS proxy URL with an explicit port."
    }
  }

  $values = @{
    LJQCLUB_API_KEY   = $plainKey
    LJQCLUB_BASE_URL  = $baseUrl
    OPENAI_API_KEY    = $plainKey
    OPENAI_BASE_URL   = $baseUrl
    NO_PROXY          = "localhost,127.0.0.1,::1"
  }

  if ($proxyUrl) {
    $values.LJQCLUB_PROXY_URL = $proxyUrl
    $values.HTTP_PROXY = $proxyUrl
    $values.HTTPS_PROXY = $proxyUrl
  } else {
    @(
      "LJQCLUB_PROXY_URL",
      "HTTP_PROXY",
      "HTTPS_PROXY"
    ) | ForEach-Object {
      Remove-ItemProperty `
        -Path $environmentPath `
        -Name $_ `
        -ErrorAction SilentlyContinue
    }
  }

  foreach ($entry in $values.GetEnumerator()) {
    Set-ItemProperty `
      -Path $environmentPath `
      -Name $entry.Key `
      -Value $entry.Value `
      -Type String
  }

  Write-Host "ljqclub ImageGen settings saved. Restart Codex next."
}
finally {
  if ($keyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  }
  $plainKey = $null
}
```

Why both variable groups exist:

- `LJQCLUB_*` identifies the provider-specific configuration for diagnostics and rotation;
- `OPENAI_*` is the active compatibility configuration automatically consumed by the bundled OpenAI SDK/CLI;
- `HTTP_PROXY` and `HTTPS_PROXY` route API traffic through Clash;
- `NO_PROXY` prevents local SchatPhone and other localhost traffic from being sent to the proxy.

Restart Codex after saving. A running Codex process does not necessarily inherit newly written user environment variables.

### 5.6 Verify Configuration Without Printing The Key

After restarting Codex or opening a new PowerShell window:

```powershell
[pscustomobject]@{
  ApiKeyConfigured = [bool]$env:OPENAI_API_KEY
  BaseUrl = $env:OPENAI_BASE_URL
  HttpProxy = $env:HTTP_PROXY
  HttpsProxy = $env:HTTPS_PROXY
  NoProxy = $env:NO_PROXY
}
```

Expected non-secret values:

```text
BaseUrl: https://ljqclub.com/v1
HttpProxy: the URL entered for this machine, or blank for direct/TUN access
HttpsProxy: the URL entered for this machine, or blank for direct/TUN access
NoProxy: localhost,127.0.0.1,::1
```

Query the model list and print only model ids:

```powershell
& $venvPython -c @'
from openai import OpenAI

models = sorted(model.id for model in OpenAI().models.list().data)
image_models = [model for model in models if "image" in model.lower()]
print("model_count=", len(models))
print("image_models=", image_models)
'@
```

The 2026-07-25 verification returned 19 total models and these image models:

```text
gpt-image-1
gpt-image-1.5
gpt-image-2
```

An HTTP `200` model response proves URL, Key, authorization, proxy, and basic OpenAI compatibility. It does not prove that image bytes can be generated.

### 5.7 Run A No-Cost Dry Run

```powershell
$dryRunOut = Join-Path $env:TEMP "codex-imagegen-dry-run.png"

& $venvPython $imageGenScript generate `
  --prompt "Configuration test" `
  --out $dryRunOut `
  --dry-run
```

Expected result:

- endpoint: `/v1/images/generations`;
- model: `gpt-image-2`;
- no network call and no generated file;
- no warning that `OPENAI_API_KEY` is missing.

### 5.8 Run One Real Low-Cost Test

This consumes one image-generation request from the ljqclub package:

```powershell
$previewDir = Join-Path $codexRoot "generated_images"
New-Item -ItemType Directory -Path $previewDir -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$testOut = Join-Path $previewDir "ljqclub-connection-test-$stamp.png"

& $venvPython $imageGenScript generate `
  --model gpt-image-2 `
  --prompt "A clean studio product photograph of one pastel pink macaron on a small white ceramic plate, soft daylight, simple pale gray background, no text, no logo, no watermark" `
  --use-case product-mockup `
  --quality low `
  --size 1024x1024 `
  --out $testOut

Write-Host $testOut
```

The verified request completed in about 46 seconds and returned a valid PNG. Although `1024x1024` was requested, the provider returned `1536x1024`. Always inspect actual dimensions instead of assuming the requested size was honored:

```powershell
& $venvPython -c "from PIL import Image; import sys; im=Image.open(sys.argv[1]); print(im.format, im.mode, im.size)" $testOut
```

For SchatPhone assets, crop or downscale deliberately and verify the final aspect ratio before moving the image into `public/images/...`.

### 5.9 SchatPhone Batch Performance Default

Image API latency is paid per request and cannot be reduced by repeatedly inspecting the filesystem while a request is running. For an accepted asset contract, SchatPhone therefore uses one batch submission and one batch acceptance pass instead of a separate generate-and-review loop for every file.

Use these defaults:

1. Put two or more independent assets from one coherent visual family into one UTF-8 JSONL request file. Each job keeps its own semantic filename through the JSONL `out` field.
2. Run `generate-batch --dry-run` once for the complete JSONL file. Check every prompt, model, size, quality, and output path in that one result; do not repeat the same dry run per asset.
3. For a frozen production asset contract, submit `gpt-image-2` with `quality=high` directly. Use a low-quality exploratory request only when the visual direction itself is unresolved; do not automatically pay for both low and high generations for every asset.
4. Set concurrency to the smaller of the job count and `5`. If the provider returns rate limits or transport instability, reduce concurrency for the retry instead of serializing every normal batch in advance.
5. Let independent jobs continue when one job fails. After the batch finishes, inspect actual dimensions and file modes in one metadata pass, create one contact sheet, and perform one visual acceptance pass for the family.
6. Retry only rejected or failed jobs, with versioned candidate names when rejected evidence must be retained. Do not regenerate accepted siblings.
7. Keep generated files under the round's `output/imagegen/<round>/candidates/` directory until acceptance. Only accepted, deterministically exported assets may enter `public/images/...`.

Load missing user-level environment values once in the PowerShell session without printing them, then reuse that session for the dry run and real submission:

```powershell
@(
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY"
) | ForEach-Object {
  $currentValue = [Environment]::GetEnvironmentVariable($_, "Process")
  if (-not $currentValue) {
    $userValue = [Environment]::GetEnvironmentVariable($_, "User")
    if ($userValue) {
      [Environment]::SetEnvironmentVariable($_, $userValue, "Process")
    }
  }
}
```

Run one dry run and one real batch from that session:

```powershell
$batchFile = "tmp\imagegen\requests.jsonl"
$candidateDir = "output\imagegen\<round>\candidates"
$jobCount = @(
  Get-Content -Encoding UTF8 $batchFile |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
).Count
$concurrency = [Math]::Min(5, [Math]::Max(1, $jobCount))

& $venvPython $imageGenScript generate-batch `
  --input $batchFile `
  --out-dir $candidateDir `
  --model gpt-image-2 `
  --quality high `
  --concurrency $concurrency `
  --dry-run

# After reviewing the dry-run payload, repeat the same command without --dry-run.
& $venvPython $imageGenScript generate-batch `
  --input $batchFile `
  --out-dir $candidateDir `
  --model gpt-image-2 `
  --quality high `
  --concurrency $concurrency
```

A single requested asset still uses one `generate` call and one post-return acceptance check. There is no useful intermediate visual inspection while the API call is active.

## 6. ImageGen Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `python` opens Microsoft Store or reports no runtime | Only the Windows app-execution alias exists | Install `Python.Python.3.13` with winget and use the explicit Python path. |
| `uv` is not recognized immediately after install | Current PowerShell has stale `PATH` | Close and reopen PowerShell, then run `Get-Command uv`. |
| `OPENAI_API_KEY is not set` | Codex/PowerShell started before the environment change | Restart Codex or open a new terminal; verify only the boolean presence of the variable. |
| `/v1/models` returns `401` | Key is missing, invalid, revoked, or assigned to the wrong group | Reissue/rotate the Key in ljqclub and repeat the hidden local setup. |
| Model list has no `gpt-image-*` entries | The selected ljqclub group/package does not expose image models | Change the Key's group or package before modifying any client code. |
| Browser can open ljqclub but Python times out | Windows System Proxy is active but standard proxy env variables are absent | Read this machine's HTTP/Mixed proxy URL from Clash/Mihomo, then set `HTTP_PROXY` and `HTTPS_PROXY` to that exact value. |
| Localhost requests behave strangely after proxy setup | Local addresses are being proxied | Set `NO_PROXY=localhost,127.0.0.1,::1`. |
| CLI rejects a provider model | Bundled CLI only accepts `gpt-image-*` names | Use a provider alias with a compatible model name, or design a separate adapter; never modify the bundled script. |
| Generation returns no usable image | Provider response is not compatible with `data[].b64_json`, or media permission is missing | Check provider docs/group permissions and report the exact response; do not treat model-list success as image success. |
| Requested dimensions differ from the PNG | Provider maps or ignores the requested size | Inspect with Pillow and post-process to the required project size. |
| Interactive child PowerShell window does not appear from Codex | Host policy blocks visible child-process launch | Run the secure PowerShell block directly in the user's own terminal. |
| A temporary localhost setup page returns inconsistent `404` responses | Multiple stale helper processes share the port, sometimes combined with proxy rewriting | Do not use the temporary web helper on another PC; use the direct secure PowerShell block. If needed, stop only processes whose command line names that helper. |
| Official Codex manual helper returns `403` behind the proxy | The docs fetch route is blocked or rewritten | This is not proof that ljqclub or Figma failed. Use the official OpenAI Docs MCP/fallback route and report the actual `403`. |

## 7. Protocol Compatibility Checklist

Before changing adapters, verify the service provides all of the following:

1. Base URL ending in `/v1`.
2. Bearer API Key authentication.
3. `GET /v1/models`.
4. `POST /v1/images/generations`.
5. A model id beginning with `gpt-image-`.
6. Image results in the response's `data[].b64_json` field.

The ljqclub configuration verified on 2026-07-25 satisfied this path, so no provider-specific ImageGen script change was necessary.

## 8. One-Page Handoff Checklist

Use this list when moving to another personal machine:

1. Clone SchatPhone and confirm Node/npm according to `DEVELOPMENT_TOOLING.md`.
2. Install the Figma plugin from the Codex plugin directory.
3. Connect Figma with the same Figma account.
4. Restart Codex and verify one exact node with `get_design_context`.
5. Install real Python and uv.
6. Create `%USERPROFILE%\.codex\venvs\imagegen` and install `openai` plus `pillow`.
7. Start Clash/Mihomo when needed and record this machine's actual HTTP/Mixed proxy URL; do not copy another machine's port.
8. Run the hidden-input PowerShell configuration block locally.
9. Restart Codex.
10. Verify environment state without printing the Key.
11. Verify `/v1/models` and the three `gpt-image-*` model ids.
12. Run the dry run.
13. Run one low-quality real image request and inspect the actual PNG size.
14. Keep generated previews outside the repo until a specific asset is accepted.

## 9. Rotation And Removal

Revoke the old Key in ljqclub first. Then remove local environment values if this machine should no longer generate images:

```powershell
$environmentPath = "HKCU:\Environment"

@(
  "LJQCLUB_API_KEY",
  "LJQCLUB_BASE_URL",
  "LJQCLUB_PROXY_URL",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY"
) | ForEach-Object {
  Remove-ItemProperty `
    -Path $environmentPath `
    -Name $_ `
    -ErrorAction SilentlyContinue
}
```

Restart Codex after removal.

To remove Figma access:

1. open the Figma plugin in Codex and disconnect/uninstall it;
2. revoke the corresponding integration from the Figma account when appropriate;
3. start a new Codex task and confirm Figma tools are no longer present.

## 10. Source And Evidence Notes

- OpenAI plugin installation and connector behavior: <https://learn.chatgpt.com/docs/plugins>
- Figma plugin MCP endpoint: <https://mcp.figma.com/mcp>
- ljqclub service: <https://ljqclub.com/>
- Sub2API public project used to identify the service family: <https://github.com/Wei-Shaw/sub2api>
- Project tooling authority: `docs/process/DEVELOPMENT_TOOLING.md`
- Visual implementation workflow: `docs/process/VISUAL_WORKFLOW.md`

The successful model-list and image-generation checks were live tests against the user's configured ljqclub account on 2026-07-25. The real Key is intentionally absent from this repository.
