<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  localUnderstanding: { type: Object, required: true },
  modelConfigured: { type: Boolean, default: false },
  modelLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  applying: { type: Boolean, default: false },
  notice: { type: String, default: '' },
  result: { type: Object, default: null },
  versionStatus: { type: Object, default: () => ({}) },
})

defineEmits([
  'check-world',
  'use-version',
  'rollback-version',
  'open-worldbook',
  'open-network',
  'clear-result',
])

const { t } = useI18n()

const statusLabel = computed(() => {
  if (props.versionStatus.sourceChanged) {
    return t('世界内容已更新', 'World content updated')
  }
  if (props.versionStatus.hasActiveVersion) {
    return t('当前规则正在使用', 'Current rules in use')
  }
  if (props.localUnderstanding.status === 'empty') {
    return t('还没有世界内容', 'No world content yet')
  }
  if (props.localUnderstanding.status === 'attention') {
    return t('有内容需要检查', 'Some content needs review')
  }
  return t('基础内容已读取', 'Basic world content is ready')
})

const statusClass = computed(() => {
  if (props.versionStatus.sourceChanged) return 'world-setup-status--attention'
  if (props.versionStatus.hasActiveVersion) return 'world-setup-status--ready'
  if (props.localUnderstanding.status === 'empty') return 'world-setup-status--empty'
  if (props.localUnderstanding.status === 'attention') return 'world-setup-status--attention'
  return 'world-setup-status--ready'
})

const userIssues = computed(() => {
  const labels = {
    world_text_missing: t('先在世界书中添加当前世界的基本说明。', 'Add a basic description of the current world in World Book.'),
    world_sources_missing: t('有已选择的世界资料现在无法读取。', 'Some selected world material can no longer be read.'),
    world_sources_changed: t('有世界资料已经更新，建议重新检查一次。', 'Some world material changed; check the world again.'),
    knowledge_empty: t('还没有补充百科资料；需要时可以稍后添加。', 'No extra knowledge entries yet; you can add them later when needed.'),
    profile_templates_empty: t('还没有世界人物模板；创建角色时可以稍后补充。', 'No world character templates yet; you can add them later when creating roles.'),
  }
  return (props.localUnderstanding.issues || [])
    .filter((issue) => issue !== 'semantic_manifest_not_compiled')
    .map((issue) => labels[issue])
    .filter(Boolean)
})

const preview = computed(() => props.result?.preview || null)
const needsAttention = computed(() => [
  ...(preview.value?.unknowns || []),
  ...(preview.value?.conflicts || []),
])

const confidenceLabel = (value = '') => {
  if (value === 'low' || value === 'unknown') return t('不确定', 'Uncertain')
  return ''
}
</script>

<template>
  <div class="world-setup-stack" data-testid="settings-world-setup">
    <section class="world-setup-card world-setup-overview">
      <div class="world-setup-heading">
        <div>
          <h2>{{ t('准备当前世界', 'Prepare the current world') }}</h2>
          <p>
            {{
              t(
                '让对话、人物和事件使用同一套世界设定。平时只需要在这里确认一次。',
                'Keep conversations, characters, and events grounded in the same world. Normally, you only need to check it here once.',
              )
            }}
          </p>
        </div>
        <span class="world-setup-status" :class="statusClass" data-testid="settings-world-status">
          {{ statusLabel }}
        </span>
      </div>

      <div class="world-setup-world">
        <span>{{ t('当前世界', 'Current world') }}</span>
        <strong>{{ localUnderstanding.worldTitle || t('我的世界', 'My world') }}</strong>
      </div>

      <div class="world-setup-counts">
        <div>
          <strong>{{ localUnderstanding.counts.activeSources }}</strong>
          <span>{{ t('世界资料', 'World sources') }}</span>
        </div>
        <div>
          <strong>{{ localUnderstanding.counts.knowledgeEntries }}</strong>
          <span>{{ t('百科补充', 'Knowledge entries') }}</span>
        </div>
        <div>
          <strong>{{ localUnderstanding.counts.profileTemplates }}</strong>
          <span>{{ t('人物模板', 'Character templates') }}</span>
        </div>
      </div>

      <ul v-if="userIssues.length" class="world-setup-notes" data-testid="settings-world-notes">
        <li v-for="item in userIssues" :key="item">{{ item }}</li>
      </ul>

      <button
        type="button"
        class="world-setup-secondary"
        data-testid="settings-world-open-worldbook"
        @click="$emit('open-worldbook')"
      >
        <i class="fas fa-book-open" aria-hidden="true"></i>
        {{ t('编辑世界内容', 'Edit world content') }}
      </button>
    </section>

    <section
      v-if="versionStatus.hasActiveVersion"
      class="world-setup-card"
      data-testid="settings-world-version"
    >
      <div class="world-setup-heading">
        <div>
          <h2>{{ t('正在使用的世界规则', 'World rules in use') }}</h2>
          <p v-if="versionStatus.sourceChanged">
            {{
              t(
                '世界书已经调整。当前游玩仍保持原来的规则，检查并确认后才会用于之后的新内容。',
                'World Book has changed. Current play keeps the existing rules until you check and confirm the update for future content.',
              )
            }}
          </p>
          <p v-else>
            {{
              t(
                '世界书与当前规则一致。之后开始的内容会继续使用这套规则。',
                'World Book matches the current rules. Newly started content will continue to use them.',
              )
            }}
          </p>
        </div>
      </div>
      <button
        v-if="versionStatus.rollbackAvailable"
        type="button"
        class="world-setup-secondary"
        :disabled="applying"
        data-testid="settings-world-rollback"
        @click="$emit('rollback-version')"
      >
        <i class="fas fa-rotate-left" aria-hidden="true"></i>
        {{ t('恢复上一版本', 'Restore previous version') }}
      </button>
    </section>

    <section class="world-setup-card">
      <div class="world-setup-heading">
        <div>
          <h2>{{ t('让模型检查一次', 'Let the model check once') }}</h2>
          <p>
            {{
              t(
                '检查模型是否理解你自定义的称呼、规则和互动方式。只有点击时才会调用，检查不会改动世界。',
                'Check whether the model understands your custom terms, rules, and ways to interact. It is called only when you tap, and the check does not change the world.',
              )
            }}
          </p>
        </div>
      </div>

      <div v-if="modelConfigured" class="world-setup-model-row">
        <span>{{ t('当前模型', 'Current model') }}</span>
        <strong>{{ modelLabel }}</strong>
      </div>

      <button
        v-if="modelConfigured"
        type="button"
        class="world-setup-primary"
        :disabled="loading"
        data-testid="settings-world-check"
        @click="$emit('check-world')"
      >
        <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
        {{ loading ? t('正在检查...', 'Checking...') : t('检查当前世界', 'Check current world') }}
      </button>
      <button
        v-else
        type="button"
        class="world-setup-primary"
        data-testid="settings-world-open-network"
        @click="$emit('open-network')"
      >
        <i class="fas fa-link" aria-hidden="true"></i>
        {{ t('先配置模型', 'Set up a model first') }}
      </button>

      <p v-if="notice" class="world-setup-feedback" data-testid="settings-world-notice">
        {{ notice }}
      </p>

      <div v-if="preview" class="world-setup-result" data-testid="settings-world-result">
        <div class="world-setup-result-heading">
          <span>{{ t('检查完成', 'Check complete') }}</span>
          <button type="button" data-testid="settings-world-clear" @click="$emit('clear-result')">
            {{ t('清除结果', 'Clear result') }}
          </button>
        </div>
        <p class="world-setup-summary">{{ preview.summary }}</p>

        <div v-if="preview.concepts.length" class="world-setup-result-section">
          <h3>{{ t('模型这样理解', 'How the model understands it') }}</h3>
          <div class="world-setup-item-list">
            <article v-for="item in preview.concepts" :key="item.id">
              <div>
                <strong>{{ item.label }}</strong>
                <span v-if="confidenceLabel(item.confidence)">{{ confidenceLabel(item.confidence) }}</span>
              </div>
              <p>{{ item.meaning }}</p>
            </article>
          </div>
        </div>

        <div v-if="preview.capabilities.length" class="world-setup-result-section">
          <h3>{{ t('可以支持的互动', 'Interactions it can support') }}</h3>
          <div class="world-setup-item-list">
            <article v-for="item in preview.capabilities" :key="item.id">
              <div>
                <strong>{{ item.label }}</strong>
                <span v-if="confidenceLabel(item.confidence)">{{ confidenceLabel(item.confidence) }}</span>
              </div>
              <p>{{ item.description }}</p>
            </article>
          </div>
        </div>

        <div v-if="preview.boundaries.length" class="world-setup-result-section">
          <h3>{{ t('明确的世界规则', 'Clear world rules') }}</h3>
          <ul>
            <li v-for="item in preview.boundaries" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="needsAttention.length" class="world-setup-result-section world-setup-attention">
          <h3>{{ t('建议补充或确认', 'Worth adding or confirming') }}</h3>
          <ul>
            <li v-for="item in needsAttention" :key="item">{{ item }}</li>
          </ul>
        </div>

        <p class="world-setup-result-note">
          {{
            t(
              '这次结果只是帮助你检查理解是否正确，没有更改任何设定。',
              'This result only helps you check the interpretation. It has not changed any setting.',
            )
          }}
        </p>

        <div v-if="result.proposal" class="world-setup-result-actions">
          <button
            type="button"
            class="world-setup-primary"
            :disabled="applying"
            data-testid="settings-world-use-version"
            @click="$emit('use-version')"
          >
            <i class="fas fa-check" aria-hidden="true"></i>
            {{ applying ? t('正在启用...', 'Applying...') : t('使用这个版本', 'Use this version') }}
          </button>
          <button
            type="button"
            class="world-setup-secondary"
            :disabled="applying"
            data-testid="settings-world-keep-current"
            @click="$emit('clear-result')"
          >
            {{
              versionStatus.hasActiveVersion
                ? t('继续使用当前版本', 'Keep current version')
                : t('暂不使用', 'Not now')
            }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.world-setup-stack {
  display: grid;
  gap: 16px;
}

.world-setup-card {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  color: var(--system-text);
  box-shadow: var(--system-shadow-card);
}

.world-setup-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.world-setup-heading > div {
  min-width: 0;
}

.world-setup-heading h2,
.world-setup-result-section h3 {
  color: var(--system-text);
  font-weight: 700;
  letter-spacing: 0;
}

.world-setup-heading h2 {
  font-size: 14px;
  line-height: 1.4;
}

.world-setup-heading p,
.world-setup-summary,
.world-setup-item-list p,
.world-setup-result-section li,
.world-setup-result-note,
.world-setup-feedback,
.world-setup-notes {
  overflow-wrap: anywhere;
  line-height: 1.55;
}

.world-setup-heading p {
  margin-top: 4px;
  color: var(--system-text-muted);
  font-size: 11px;
}

.world-setup-status {
  flex: none;
  max-width: 44%;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}

.world-setup-status--ready {
  background: color-mix(in srgb, var(--system-success) 15%, transparent);
  color: var(--system-success);
}

.world-setup-status--attention {
  background: color-mix(in srgb, var(--system-warning) 15%, transparent);
  color: var(--system-warning);
}

.world-setup-status--empty {
  background: color-mix(in srgb, var(--system-danger) 12%, transparent);
  color: var(--system-danger);
}

.world-setup-world,
.world-setup-model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.world-setup-world span,
.world-setup-model-row span {
  color: var(--system-text-muted);
  font-size: 11px;
}

.world-setup-world strong,
.world-setup-model-row strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 12px;
  text-align: right;
  overflow-wrap: anywhere;
}

.world-setup-counts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.world-setup-counts > div {
  min-width: 0;
  padding: 10px;
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.world-setup-counts strong,
.world-setup-counts span {
  display: block;
}

.world-setup-counts strong {
  font-size: 16px;
}

.world-setup-counts span {
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 10px;
}

.world-setup-notes,
.world-setup-result-section ul {
  display: grid;
  gap: 5px;
  padding-left: 17px;
  color: var(--system-text-muted);
  font-size: 11px;
  list-style: disc;
}

.world-setup-primary,
.world-setup-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border-radius: var(--system-radius-md);
  font-size: 13px;
  font-weight: 700;
}

.world-setup-primary {
  width: 100%;
  background: var(--system-accent);
  color: var(--system-accent-contrast);
}

.world-setup-primary:disabled {
  opacity: 0.58;
}

.world-setup-secondary:disabled {
  opacity: 0.58;
}

.world-setup-secondary {
  justify-self: start;
  padding: 0 13px;
  border: 1px solid var(--system-control-border);
  background: var(--system-control-bg);
  color: var(--system-accent);
}

.world-setup-primary:focus-visible,
.world-setup-secondary:focus-visible,
.world-setup-result-heading button:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

.world-setup-feedback {
  padding: 10px 12px;
  border-radius: var(--system-radius-md);
  background: color-mix(in srgb, var(--system-warning) 12%, transparent);
  color: var(--system-warning);
  font-size: 11px;
}

.world-setup-result {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding-top: 14px;
  border-top: 1px solid var(--system-subtle-border);
}

.world-setup-result-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.world-setup-result-heading span {
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--system-success) 14%, transparent);
  color: var(--system-success);
  font-size: 10px;
  font-weight: 700;
}

.world-setup-result-heading button {
  min-height: 36px;
  color: var(--system-text-muted);
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.world-setup-summary {
  color: var(--system-text);
  font-size: 13px;
}

.world-setup-result-section {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--system-subtle-border);
}

.world-setup-result-section h3 {
  font-size: 12px;
}

.world-setup-item-list {
  display: grid;
  gap: 8px;
}

.world-setup-item-list article {
  min-width: 0;
  padding: 10px 11px;
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.world-setup-item-list article > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.world-setup-item-list strong {
  min-width: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.world-setup-item-list span {
  flex: none;
  color: var(--system-warning);
  font-size: 9px;
}

.world-setup-item-list p,
.world-setup-result-section li,
.world-setup-result-note {
  color: var(--system-text-muted);
  font-size: 11px;
}

.world-setup-result-actions {
  display: grid;
  gap: 9px;
  padding-top: 12px;
  border-top: 1px solid var(--system-subtle-border);
}

.world-setup-result-actions .world-setup-secondary {
  justify-self: stretch;
}

.world-setup-item-list p {
  margin-top: 3px;
}

.world-setup-attention {
  padding: 12px;
  border: 0;
  border-radius: var(--system-radius-md);
  background: color-mix(in srgb, var(--system-warning) 10%, transparent);
}

.world-setup-result-note {
  padding-top: 12px;
  border-top: 1px solid var(--system-subtle-border);
}

@media (max-width: 420px) {
  .world-setup-heading {
    flex-direction: column;
  }

  .world-setup-status {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world-setup-primary,
  .world-setup-secondary {
    transition: none;
  }
}
</style>
