# Network API Connection Polish Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Network & API setup feel certain and reusable by improving model-fetch state, verified-connection state, effective request URL preview, and diagnostics handoff without making the page longer.

**Architecture:** Keep the existing URL-first transport layer in `src/lib/ai.js` as the only AI request seam. Build small provider-agnostic metadata helpers around the current `NetworkConnectionPanel` so URL/key/model/test/save stay in one compact connection panel, while saved configuration management and diagnostics remain secondary disclosures.

**Tech Stack:** Vue 3, Pinia, Vite, Tailwind v4, Vitest, Vue Test Utils, SchatPhone visual/IA governance workflow.

---

## Current State On 2026-06-18

This plan assumes the previous Network/API work is already present in the worktree:

1. `src/lib/ai.js` detects and dispatches:
   - OpenAI-compatible chat URLs;
   - Gemini native URLs;
   - Gemini OpenAI-compatible `/openai` URLs;
   - OpenAI Responses `/responses`;
   - Anthropic Messages `/v1/messages`;
   - Azure OpenAI deployment chat/responses URLs.
2. `NetworkView` no longer shows provider-brand choice buttons.
3. `src/components/network/NetworkConnectionPanel.vue` is the primary setup panel.
4. Old large panels were removed:
   - `src/components/network/NetworkSetupPresetPanel.vue`;
   - `src/components/network/NetworkSmokeControlsPanel.vue`;
   - `src/components/network/NetworkManualModelSavePanel.vue`.
5. URL, key, model input/selection, model-list refresh, connection test, and save-current-settings live in one compact panel.
6. Saved-configuration management and diagnostics are secondary disclosures.
7. Full validation passed on this machine:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Important: the worktree may contain unrelated Chat, Shopping, and shareable-object changes. Do not revert them while continuing this Network/API plan.

## Product Intent

The necessary functional surface is:

1. enter URL;
2. enter key if the detected endpoint needs one;
3. choose or type a model;
4. fetch available models when possible;
5. test the real Chat call path;
6. save current settings;
7. save/reuse named configurations;
8. inspect useful diagnostics when real use fails.

The page should not become one large block per capability. The primary path should remain compact and task-first.

## File Map

- Modify: `src/lib/ai.js`
  - Keep transport-specific URL builders internal unless a safe metadata helper is needed.
  - If adding effective URL preview, expose a read-only helper that does not perform network requests.
- Modify: `src/lib/network-guidance.js`
  - Add provider-agnostic status summaries and copy for model-fetch state, verified state, and request preview.
- Modify: `src/views/NetworkView.vue`
  - Own state transitions for model fetch, smoke test, stale verification, and diagnostics filters.
- Modify: `src/components/network/NetworkConnectionPanel.vue`
  - Render compact states only. Do not split back into multiple large panels.
- Modify: `src/components/network/NetworkDiagnosticsPanel.vue`
  - Keep embedded mode usable inside a disclosure.
- Test: `tests/network-view-smoke-controls.test.js`
  - Cover visible workflow and stale/verified state behavior.
- Test: `tests/network-guidance.test.js`
  - Cover pure guidance/status helpers.
- Test: `tests/ai-url-adapters.test.js`
  - Cover effective request URL preview if it is exported from `src/lib/ai.js`.
- Docs: update only if product meaning changes:
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - `docs/pm/visual-and-ia-governance/README.md`
  - `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

## Task 1: Model Fetch State Is Explicit But Compact

**Files:**
- Modify: `src/lib/network-guidance.js`
- Modify: `src/components/network/NetworkConnectionPanel.vue`
- Test: `tests/network-guidance.test.js`
- Test: `tests/network-view-smoke-controls.test.js`

- [ ] **Step 1: Add failing pure guidance tests**

Add tests for a new helper, for example `buildNetworkModelFetchState`, in `tests/network-guidance.test.js`:

```js
test('summarizes model fetch states for the compact connection panel', () => {
  const idle = buildNetworkModelFetchState({
    loading: false,
    error: '',
    modelOptions: [],
    modelValue: '',
  })
  expect(idle.tone).toBe('neutral')
  expect(idle.canUseManualModel).toBe(true)
  expect(idle.detailEn).toContain('Fetch models')

  const loaded = buildNetworkModelFetchState({
    loading: false,
    error: '',
    modelOptions: ['gpt-4o-mini', 'gpt-4.1-mini'],
    modelValue: 'gpt-4o-mini',
  })
  expect(loaded.tone).toBe('success')
  expect(loaded.detailEn).toContain('2')
  expect(loaded.modelSourceEn).toBe('From fetched list')

  const manual = buildNetworkModelFetchState({
    loading: false,
    error: '',
    modelOptions: ['gpt-4o-mini'],
    modelValue: 'custom-gateway-model',
  })
  expect(manual.tone).toBe('info')
  expect(manual.modelSourceEn).toBe('Manual entry')

  const failed = buildNetworkModelFetchState({
    loading: false,
    error: 'CORS blocked',
    modelOptions: [],
    modelValue: 'manual-model',
  })
  expect(failed.tone).toBe('warn')
  expect(failed.canUseManualModel).toBe(true)
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- tests/network-guidance.test.js
```

Expected: fail because `buildNetworkModelFetchState` does not exist or is not exported.

- [ ] **Step 3: Implement the helper**

In `src/lib/network-guidance.js`, export:

```js
export const buildNetworkModelFetchState = ({
  loading = false,
  error = '',
  modelOptions = [],
  modelValue = '',
} = {}) => {
  const options = Array.isArray(modelOptions) ? modelOptions.filter(Boolean) : []
  const model = typeof modelValue === 'string' ? modelValue.trim() : ''
  const inFetchedList = Boolean(model) && options.includes(model)

  if (loading) {
    return {
      tone: 'info',
      canUseManualModel: Boolean(model),
      modelSourceEn: model ? 'Current model kept' : 'Waiting for models',
      modelSourceZh: model ? '保留当前模型' : '等待模型列表',
      detailEn: 'Fetching available models from this endpoint.',
      detailZh: '正在从当前接口拉取可用模型。',
    }
  }

  if (error) {
    return {
      tone: 'warn',
      canUseManualModel: true,
      modelSourceEn: model ? 'Manual entry' : 'No model selected',
      modelSourceZh: model ? '手动填写' : '未选择模型',
      detailEn: 'Model list could not be loaded. You can still enter a model manually.',
      detailZh: '模型列表未能拉取。仍可手动填写模型名。',
    }
  }

  if (options.length > 0) {
    return {
      tone: inFetchedList ? 'success' : 'info',
      canUseManualModel: true,
      modelSourceEn: inFetchedList ? 'From fetched list' : model ? 'Manual entry' : 'Choose a model',
      modelSourceZh: inFetchedList ? '来自拉取列表' : model ? '手动填写' : '选择模型',
      detailEn: `${options.length} available model(s) loaded.`,
      detailZh: `已拉取 ${options.length} 个可用模型。`,
    }
  }

  return {
    tone: 'neutral',
    canUseManualModel: true,
    modelSourceEn: model ? 'Manual entry' : 'Model not set',
    modelSourceZh: model ? '手动填写' : '未设置模型',
    detailEn: 'Fetch models after URL and key are set, or enter a model manually.',
    detailZh: '填好 URL 和 Key 后可拉取模型，也可以直接手动填写模型名。',
  }
}
```

- [ ] **Step 4: Use the helper in `NetworkView` and panel**

In `src/views/NetworkView.vue`, import and compute:

```js
const modelFetchState = computed(() =>
  buildNetworkModelFetchState({
    loading: modelsLoading.value,
    error: modelsError.value,
    modelOptions: modelOptions.value,
    modelValue: settings.value.api.model,
  }),
)
```

Pass it into `NetworkConnectionPanel`:

```vue
:model-fetch-state="modelFetchState"
```

In `NetworkConnectionPanel.vue`, add a required/default prop and render only one compact line near the model input:

```vue
<p class="mt-1 text-[10px]" data-testid="network-model-fetch-state">
  {{ t(modelFetchState.detailZh, modelFetchState.detailEn) }}
  <span v-if="modelValue"> · {{ t(modelFetchState.modelSourceZh, modelFetchState.modelSourceEn) }}</span>
</p>
```

Do not add a separate card.

- [ ] **Step 5: Add component regression test**

In `tests/network-view-smoke-controls.test.js`, after model fetch:

```js
expect(wrapper.get('[data-testid="network-model-fetch-state"]').text()).toContain('2')
```

For manual fallback:

```js
await wrapper.get('[data-testid="network-manual-model-input"]').setValue('custom-model')
await flushUi()
expect(wrapper.get('[data-testid="network-model-fetch-state"]').text()).toMatch(/手动|Manual/)
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/network-guidance.test.js tests/network-view-smoke-controls.test.js
```

Expected: pass.

## Task 2: Connection Verification Becomes Stale When Inputs Change

**Files:**
- Modify: `src/views/NetworkView.vue`
- Modify: `src/components/network/NetworkConnectionPanel.vue`
- Test: `tests/network-view-smoke-controls.test.js`

- [ ] **Step 1: Add failing test for verified and stale states**

Add to `tests/network-view-smoke-controls.test.js`:

```js
test('marks a passed connection test stale after URL key or model changes', async () => {
  const store = useSystemStore()
  configureReadyApi(store)
  aiMockState.nextResult = 'OK from mocked provider'

  const { wrapper } = await mountNetworkView()

  await wrapper.get('[data-testid="network-chat-smoke-run"]').trigger('click')
  await flushUi()

  expect(wrapper.get('[data-testid="network-verification-state"]').text()).toMatch(/已验证|Verified/)

  await wrapper.get('[data-testid="network-manual-model-input"]').setValue('gpt-4.1-mini')
  await flushUi()

  expect(wrapper.get('[data-testid="network-verification-state"]').text()).toMatch(/需要重新测试|Retest/)

  wrapper.unmount()
})
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm.cmd test -- tests/network-view-smoke-controls.test.js -t "marks a passed connection test stale"
```

Expected: fail because no verification state is rendered.

- [ ] **Step 3: Add verification state in `NetworkView`**

Add refs:

```js
const verifiedConnection = ref(null)
```

Add helpers:

```js
const currentConnectionSignature = computed(() =>
  [
    settings.value.api.url?.trim() || '',
    settings.value.api.key?.trim() || '',
    settings.value.api.model?.trim() || '',
  ].join('\n'),
)

const connectionVerificationState = computed(() => {
  if (!verifiedConnection.value) {
    return {
      tone: 'neutral',
      titleZh: '尚未验证',
      titleEn: 'Not verified',
      detailZh: '测试连接后会确认当前 URL、Key 和模型是否可用。',
      detailEn: 'Run a connection test to verify the current URL, key, and model.',
    }
  }

  if (verifiedConnection.value.signature !== currentConnectionSignature.value) {
    return {
      tone: 'warn',
      titleZh: '需要重新测试',
      titleEn: 'Retest needed',
      detailZh: 'URL、Key 或模型已变化，之前的验证结果不再代表当前设置。',
      detailEn: 'URL, key, or model changed, so the previous result no longer verifies this setup.',
    }
  }

  return {
    tone: 'success',
    titleZh: '已验证',
    titleEn: 'Verified',
    detailZh: '当前 URL、Key 和模型已通过真实 Chat 调用测试。',
    detailEn: 'Current URL, key, and model passed a real Chat call test.',
  }
})
```

In `runChatSmokeTest`, after success:

```js
verifiedConnection.value = {
  signature: currentConnectionSignature.value,
  checkedAt: Date.now(),
  provider: smokeTestResult.value.provider,
  model: smokeTestResult.value.model,
}
```

Do not clear the record on every input change; the computed state should show it as stale.

- [ ] **Step 4: Render compact verification state**

In `NetworkConnectionPanel.vue`, add a `connectionVerificationState` prop and render below the primary action row:

```vue
<div
  class="network-verification-strip"
  data-testid="network-verification-state"
  :class="`network-verification-${connectionVerificationState.tone}`"
>
  <p class="text-xs font-semibold">
    {{ t(connectionVerificationState.titleZh, connectionVerificationState.titleEn) }}
  </p>
  <p class="mt-1 text-[11px]">
    {{ t(connectionVerificationState.detailZh, connectionVerificationState.detailEn) }}
  </p>
</div>
```

Keep this as a strip, not a new card.

- [ ] **Step 5: Pass the state from `NetworkView`**

```vue
:connection-verification-state="connectionVerificationState"
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/network-view-smoke-controls.test.js
```

Expected: pass.

## Task 3: Effective Request URL Preview

**Files:**
- Modify: `src/lib/ai.js`
- Modify: `src/lib/network-guidance.js`
- Modify: `src/components/network/NetworkConnectionPanel.vue`
- Test: `tests/ai-url-adapters.test.js`
- Test: `tests/network-view-smoke-controls.test.js`

- [ ] **Step 1: Add failing URL preview tests**

In `tests/ai-url-adapters.test.js`, add:

```js
test('previews effective model and chat URLs without making requests', () => {
  expect(
    getApiRequestPreview({
      url: 'http://localhost:11434/v1',
      model: 'llama3',
    }),
  ).toMatchObject({
    kind: 'openai_compatible',
    modelsUrl: 'http://localhost:11434/v1/models',
    chatUrl: 'http://localhost:11434/v1/chat/completions',
  })

  expect(
    getApiRequestPreview({
      url: 'https://api.anthropic.com/v1',
      model: 'claude-test',
    }),
  ).toMatchObject({
    kind: 'anthropic',
    modelsUrl: 'https://api.anthropic.com/v1/models',
    chatUrl: 'https://api.anthropic.com/v1/messages',
  })

  expect(
    getApiRequestPreview({
      url: 'https://demo.openai.azure.com/openai/deployments/main/responses?api-version=preview',
      model: 'main',
    }),
  ).toMatchObject({
    kind: 'azure_openai_responses',
    modelsUrl: 'https://demo.openai.azure.com/openai/deployments?api-version=preview',
    chatUrl: 'https://demo.openai.azure.com/openai/deployments/main/responses?api-version=preview',
  })
})
```

- [ ] **Step 2: Export read-only preview helper**

In `src/lib/ai.js`, export:

```js
export const getApiRequestPreview = ({ url = '', model = '' } = {}) => {
  const kind = detectApiKindFromUrl(url)
  try {
    if (kind === 'gemini') {
      return {
        kind,
        modelsUrl: `${toGeminiVersionBaseUrl(url)}/models`,
        chatUrl: toGeminiGenerateUrl(url, model || GEMINI_DEFAULT_MODEL),
      }
    }
    if (kind === 'anthropic') {
      return {
        kind,
        modelsUrl: toAnthropicModelsUrl(url),
        chatUrl: toAnthropicMessagesUrl(url),
      }
    }
    if (kind === 'azure_openai' || kind === 'azure_openai_responses') {
      return {
        kind,
        modelsUrl: toAzureOpenAIModelsUrl(url),
        chatUrl: kind === 'azure_openai_responses'
          ? toAzureOpenAIResponsesUrl(url)
          : toAzureOpenAIChatUrl(url),
      }
    }
    if (kind === 'openai_responses') {
      return {
        kind,
        modelsUrl: toOpenAIModelsUrl(url),
        chatUrl: toOpenAIResponsesUrl(url),
      }
    }
    return {
      kind,
      modelsUrl: toOpenAIModelsUrl(url),
      chatUrl: toOpenAIChatUrl(url),
    }
  } catch {
    return {
      kind,
      modelsUrl: '',
      chatUrl: '',
    }
  }
}
```

This helper must not call `fetch`.

- [ ] **Step 3: Render preview behind a small disclosure**

In `NetworkView.vue`, compute:

```js
const apiRequestPreview = computed(() =>
  getApiRequestPreview({
    url: settings.value.api.url,
    model: settings.value.api.model,
  }),
)
```

Pass it to `NetworkConnectionPanel`.

In `NetworkConnectionPanel.vue`, add:

```vue
<details v-if="apiRequestPreview.modelsUrl || apiRequestPreview.chatUrl" class="network-inline-details mt-2">
  <summary>{{ t('查看实际请求地址', 'Show effective request URLs') }}</summary>
  <div class="mt-2 space-y-1">
    <p class="break-all text-[10px] text-gray-500" data-testid="network-preview-models-url">
      Models: {{ apiRequestPreview.modelsUrl || '-' }}
    </p>
    <p class="break-all text-[10px] text-gray-500" data-testid="network-preview-chat-url">
      Chat: {{ apiRequestPreview.chatUrl || '-' }}
    </p>
  </div>
</details>
```

This belongs behind details so the main panel stays compact.

- [ ] **Step 4: Add component test**

In `tests/network-view-smoke-controls.test.js`:

```js
test('shows effective request URL preview for compatible base URLs', async () => {
  const store = useSystemStore()
  store.settings.api.url = 'http://localhost:11434/v1'
  store.settings.api.key = ''
  store.settings.api.model = 'llama3'

  const { wrapper } = await mountNetworkView()

  expect(wrapper.get('[data-testid="network-preview-models-url"]').text()).toContain('/v1/models')
  expect(wrapper.get('[data-testid="network-preview-chat-url"]').text()).toContain('/v1/chat/completions')

  wrapper.unmount()
})
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/ai-url-adapters.test.js tests/network-view-smoke-controls.test.js
```

Expected: pass.

## Task 4: Saved Configuration Summary Includes Verification Signal

**Files:**
- Modify: `src/views/NetworkView.vue`
- Modify: `src/components/network/NetworkConnectionPanel.vue`
- Test: `tests/network-view-smoke-controls.test.js`

- [ ] **Step 1: Decide the small data shape**

When saving a preset, keep existing fields and add optional metadata:

```js
{
  verifiedAt: 0,
  verifiedProvider: '',
  verifiedModel: '',
}
```

Only set `verifiedAt` when the current connection signature matches the latest verified connection.

- [ ] **Step 2: Add failing test**

```js
test('saved configuration options show model key and verification summary', async () => {
  const store = useSystemStore()
  configureReadyApi(store)
  aiMockState.nextResult = 'OK'

  const { wrapper } = await mountNetworkView()

  await wrapper.get('[data-testid="network-chat-smoke-run"]').trigger('click')
  await flushUi()
  await wrapper.get('[data-testid="network-preset-name-input"]').setValue('Primary gateway')
  await wrapper.get('[data-testid="network-preset-save"]').trigger('click')
  await flushUi()

  const optionText = wrapper.get('[data-testid="network-active-preset-select"]').text()
  expect(optionText).toContain('Primary gateway')
  expect(optionText).toContain('gpt-4o-mini')
  expect(optionText).toMatch(/已验证|Verified/)

  wrapper.unmount()
})
```

- [ ] **Step 3: Update `savePreset`**

In `NetworkView.vue`, inside the new/updated preset assignment:

```js
const verifiedForCurrentSettings =
  verifiedConnection.value?.signature === currentConnectionSignature.value

const verificationFields = {
  verifiedAt: verifiedForCurrentSettings ? verifiedConnection.value.checkedAt : 0,
  verifiedProvider: verifiedForCurrentSettings ? verifiedConnection.value.provider : '',
  verifiedModel: verifiedForCurrentSettings ? verifiedConnection.value.model : '',
}
```

Add `...verificationFields` when creating or updating a preset.

- [ ] **Step 4: Update option text**

In `NetworkConnectionPanel.vue`, option copy should include:

```vue
{{ preset.verifiedAt ? t('已验证', 'Verified') : t('未验证', 'Untested') }}
```

Keep option text compact.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/network-view-smoke-controls.test.js
```

Expected: pass.

## Task 5: Diagnostics Handoff From Real AI Failures

**Files:**
- Modify: `src/views/NetworkView.vue`
- Modify: `src/components/network/NetworkDiagnosticsPanel.vue`
- Test: `tests/network-view-smoke-controls.test.js`

- [ ] **Step 1: Add a route-query/filter behavior test**

There is already support for report module/level query parsing. Add a focused test:

```js
test('opens diagnostics filtered to Network errors from route query', async () => {
  const store = useSystemStore()
  store.addApiReport({
    level: 'error',
    module: 'network',
    action: 'chat_smoke_test',
    code: 'AUTH',
    message: 'Auth failed',
  })
  store.addApiReport({
    level: 'info',
    module: 'chat',
    action: 'call_ai',
    code: 'CHAT_OK',
    message: 'Chat ok',
  })

  const router = createTestRouter()
  await router.push('/network?reportModule=network&reportLevel=error&diagnostics=1')
  await router.isReady()

  const wrapper = mount(NetworkView, { global: { plugins: [router] } })
  await flushUi()

  expect(wrapper.get('[data-testid="network-report-module-filter"]').element.value).toBe('network')
  expect(wrapper.get('[data-testid="network-report-level-filter"]').element.value).toBe('error')
  expect(wrapper.findAll('[data-testid="network-diagnostic-report"]')).toHaveLength(1)

  wrapper.unmount()
})
```

- [ ] **Step 2: Keep diagnostics disclosure open when query asks for it**

In `NetworkView.vue`, add:

```js
const diagnosticsOpen = computed(() => route.query?.diagnostics === '1' || reportSummary.value.errorCount > 0)
```

Then bind:

```vue
<details class="network-diagnostics-disclosure bg-white rounded-xl p-4" :open="diagnosticsOpen">
```

If `reportSummary` is a computed/ref from `useSystemApiReports`, use the correct `.value` shape in script.

- [ ] **Step 3: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/network-view-smoke-controls.test.js
```

Expected: pass.

## Task 6: Documentation Sync

**Files:**
- Modify only when product meaning changes:
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - `docs/pm/visual-and-ia-governance/README.md`
  - `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Update product-facing docs**

Add one concise sentence that Network/API now shows:

```text
model-list status, connection verification freshness, effective request URL previews, and saved-configuration verification summaries while keeping the setup path compact.
```

- [ ] **Step 2: Avoid touching unrelated package docs**

Do not update Chat, Commerce, Shopping, or shareable-object docs for this Network/API work unless the implementation directly changes those modules.

- [ ] **Step 3: Run doc quality guard**

Run:

```powershell
npm.cmd test -- tests/mojibake-guard.test.js
git diff --check
```

Expected: pass.

## Task 7: Final Validation

**Files:**
- No code changes unless validation exposes failures.

- [ ] **Step 1: Run focused Network tests**

```powershell
npm.cmd test -- tests/ai-url-adapters.test.js tests/network-guidance.test.js tests/network-view-smoke-controls.test.js
```

Expected: all pass.

- [ ] **Step 2: Run lint**

```powershell
npm.cmd run lint
```

Expected: pass.

- [ ] **Step 3: Run build**

```powershell
npm.cmd run build
```

Expected: pass.

- [ ] **Step 4: Run full test suite**

```powershell
npm.cmd test
```

Expected: all tests pass. If unrelated dirty Chat/Shopping/shareable-object work causes a failure, verify with a focused Network test run and do not revert unrelated files without user approval.

- [ ] **Step 5: Check whitespace**

```powershell
git diff --check
```

Expected: no output.

## Self-Review Notes

- Spec coverage: this plan covers model-fetch clarity, verified/stale connection state, effective request URL preview, saved-configuration verification summary, diagnostics handoff, docs sync, and validation.
- Scope control: no new provider transport should be added in this plan unless a test shows the preview helper cannot represent an already-supported transport.
- UI constraint: do not reintroduce one large card per capability. Keep the page centered on the compact connection panel.
- Safety: do not bypass `src/lib/ai.js` for AI calls. Do not store new secrets outside existing local API settings/preset fields.
