import { computed } from 'vue'

const defaultT = (zh, en) => en || zh

const readArray = (source) => {
  const value = source && typeof source === 'object' && 'value' in source ? source.value : source
  return Array.isArray(value) ? value : []
}

const countFields = (template = {}) => (Array.isArray(template.fields) ? template.fields.length : 0)

export function useWorldBookProfileTemplateModel({
  profileTemplatePresets,
  worldProfileTemplates,
  enabledWorldProfileTemplates,
  t = defaultT,
} = {}) {
  const profileTemplatePresetRows = computed(() =>
    readArray(profileTemplatePresets).map((preset) => ({
      ...preset,
      title: preset?.title || preset?.name || preset?.id || t('\u672a\u547d\u540d\u6a21\u677f', 'Untitled template'),
      fieldCount: countFields(preset),
      fieldCountLabel: t(`${countFields(preset)} \u5b57\u6bb5`, `${countFields(preset)} fields`),
      copyLabel: t('\u590d\u5236\u4e3a\u5f53\u524d\u4e16\u754c\u6a21\u677f', 'Copy as world template'),
    })),
  )

  const worldProfileTemplateRows = computed(() =>
    readArray(worldProfileTemplates).map((template) => {
      const enabled = template?.enabled !== false
      return {
        ...template,
        title: template?.title || template?.name || template?.id || t('\u672a\u547d\u540d\u6a21\u677f', 'Untitled template'),
        enabled,
        versionLabel: `v${template?.version || 1}`,
        fieldCount: countFields(template),
        fieldCountLabel: t(`${countFields(template)} \u5b57\u6bb5`, `${countFields(template)} fields`),
        stateLabel: enabled ? t('\u5df2\u542f\u7528', 'Enabled') : t('\u5df2\u505c\u7528', 'Disabled'),
        toggleLabel: enabled ? t('\u505c\u7528', 'Disable') : t('\u542f\u7528', 'Enable'),
      }
    }),
  )

  const profileTemplateStats = computed(() => ({
    presetCount: profileTemplatePresetRows.value.length,
    worldCount: worldProfileTemplateRows.value.length,
    enabledWorldCount: readArray(enabledWorldProfileTemplates).length,
  }))

  const profileTemplateHandoff = computed(() => ({
    eyebrow: t('\u4e0b\u4e00\u6b65', 'Next step'),
    title: t('Contacts \u586b\u5199\u89d2\u8272\u6863\u6848', 'Contacts fills role profiles'),
    detail: t(
      '\u901a\u7528\u6a21\u677f\u53ef\u4ee5\u76f4\u63a5\u5728 Contacts \u4f7f\u7528\u3002\u542f\u7528\u7684\u4e16\u754c\u6a21\u677f\u4f1a\u6210\u4e3a\u5f53\u524d\u4e16\u754c\u7684\u89d2\u8272\u548c NPC \u9009\u9879\uff1b\u5177\u4f53\u6570\u503c\u4ecd\u7136\u5728 Contacts \u586b\u5199\u3002',
      'Universal templates can be used directly in Contacts. Enabled world templates become current-world choices for roles and NPCs; concrete values are still filled in Contacts.',
    ),
    fromLabel: t('\u4e16\u754c\u4e66\uff1a\u542f\u7528\u4e16\u754c\u6a21\u677f', 'WorldBook: Enable templates'),
    toLabel: t('Contacts\uff1a\u586b\u5199\u6570\u503c', 'Contacts: Values'),
    actionLabel: t('\u6253\u5f00 Contacts', 'Open Contacts'),
  }))

  const universalTemplateSection = computed(() => ({
    title: t('\u901a\u7528\u6a21\u677f', 'Universal templates'),
    detail: t(
      '\u901a\u7528\u6a21\u677f\u4f1a\u76f4\u63a5\u51fa\u73b0\u5728\u901a\u8baf\u5f55\uff0c\u53ef\u5728\u4efb\u4f55\u4e16\u754c\u4e2d\u586b\u5199\u3002',
      'Universal templates are available directly in Contacts for any world.',
    ),
  }))

  const worldTemplateSection = computed(() => ({
    title: t('\u5f53\u524d\u4e16\u754c\u542f\u7528\u6a21\u677f', 'Current-world enabled templates'),
    detail: t(
      '\u53ea\u6709\u542f\u7528\u7684\u4e16\u754c\u6a21\u677f\u4f1a\u4f18\u5148\u51fa\u73b0\u5728\u901a\u8baf\u5f55\uff1b\u505c\u7528\u540e\uff0c\u901a\u8baf\u5f55\u4ecd\u53ef\u4f7f\u7528\u901a\u7528\u6a21\u677f\u3002',
      'Only enabled world templates are prioritized in Contacts; disabled templates fall back to universal templates.',
    ),
    emptyCopy: t('\u8fd8\u6ca1\u6709\u5f53\u524d\u4e16\u754c\u4e13\u7528\u6a21\u677f\u3002', 'No world-specific templates yet.'),
  }))

  return {
    profileTemplateHandoff,
    profileTemplatePresetRows,
    profileTemplateStats,
    universalTemplateSection,
    worldProfileTemplateRows,
    worldTemplateSection,
  }
}
