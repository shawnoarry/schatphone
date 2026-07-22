import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import SettingsBackupSection from '../src/components/settings/SettingsBackupSection.vue'
import { useSystemStore } from '../src/stores/system'

const mountBackupSection = ({
  language = 'en-US',
  tone = 'direct',
  exporting = false,
  importing = false,
} = {}) => {
  const systemStore = useSystemStore()
  systemStore.settings.system.language = language
  const useChinese = language.startsWith('zh')
  const resolveBackupCopy = vi.fn((directZh, directEn, immersiveZh, immersiveEn) => {
    if (tone === 'immersive') return useChinese ? immersiveZh : immersiveEn
    return useChinese ? directZh : directEn
  })
  const wrapper = mount(SettingsBackupSection, {
    props: {
      backupCopyTone: tone,
      backupIncludeAssetPackage: false,
      backupExporting: exporting,
      backupImporting: importing,
      backupExportModeLabel: useChinese ? '完整备份模式' : 'Complete backup mode',
      backupExportModeHint: useChinese ? '导出当前本地数据' : 'Export current local data',
      backupPackageLimitHint: useChinese ? '素材包可选' : 'Asset package optional',
      backupFeedbackType: '',
      backupFeedbackMessage: '',
      resolveBackupCopy,
    },
  })

  return { resolveBackupCopy, wrapper }
}

const getButtonByText = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text().includes(text))

describe('SettingsBackupSection safety presentation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps the complete-backup warning explicit in Chinese and English across copy tones', () => {
    const enDirect = mountBackupSection({ language: 'en-US', tone: 'direct' }).wrapper
    const enDirectNote = enDirect.get('[data-testid="settings-backup-sensitive-notice"]').text()
    const enDirectBody = enDirect.get('[data-testid="settings-backup-sensitive-body"]').text()

    expect(enDirect.get('[data-testid="settings-backup-sensitive-title"]').text()).toBe(
      'Complete backups contain sensitive data',
    )
    expect(enDirectBody).toContain('configured API keys and other credentials')
    expect(enDirectBody).toContain('chats, characters, and worlds')
    expect(enDirectBody).toContain('trusted location')
    expect(enDirectBody).toContain('do not share the backup file directly')
    enDirect.unmount()

    const enImmersive = mountBackupSection({ language: 'en-US', tone: 'immersive' }).wrapper
    expect(enImmersive.get('[data-testid="settings-backup-sensitive-notice"]').text()).toBe(
      enDirectNote,
    )
    enImmersive.unmount()

    const zhDirect = mountBackupSection({ language: 'zh-CN', tone: 'direct' }).wrapper
    const zhDirectNote = zhDirect.get('[data-testid="settings-backup-sensitive-notice"]').text()
    const zhDirectBody = zhDirect.get('[data-testid="settings-backup-sensitive-body"]').text()

    expect(zhDirect.get('[data-testid="settings-backup-sensitive-title"]').text()).toBe(
      '完整备份包含敏感数据',
    )
    expect(zhDirectBody).toContain('已配置的 API 密钥和其他凭据')
    expect(zhDirectBody).toContain('聊天、角色、世界')
    expect(zhDirectBody).toContain('可信位置')
    expect(zhDirectBody).toContain('不要直接分享备份文件')
    zhDirect.unmount()

    const zhImmersive = mountBackupSection({ language: 'zh-CN', tone: 'immersive' }).wrapper
    expect(zhImmersive.get('[data-testid="settings-backup-sensitive-notice"]').text()).toBe(
      zhDirectNote,
    )
    zhImmersive.unmount()
  })

  test('uses a static note semantic and hides the decorative icon', () => {
    const { wrapper } = mountBackupSection()
    const note = wrapper.get('[data-testid="settings-backup-sensitive-notice"]')
    const title = wrapper.get('[data-testid="settings-backup-sensitive-title"]')

    expect(note.attributes('role')).toBe('note')
    expect(note.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(note.get('i').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('preserves tone, asset, export, and import events plus busy disabled states', async () => {
    const { wrapper } = mountBackupSection()
    const directButton = getButtonByText(wrapper, 'Direct')
    const immersiveButton = getButtonByText(wrapper, 'Immersive')
    const exportButton = getButtonByText(wrapper, 'Backup & Export')
    const importButton = getButtonByText(wrapper, 'Restore Import')
    const assetToggle = wrapper.get('input[type="checkbox"]')

    await directButton.trigger('click')
    await immersiveButton.trigger('click')
    await assetToggle.setValue(true)
    await exportButton.trigger('click')
    await importButton.trigger('click')

    expect(wrapper.emitted('update-backup-copy-tone')).toEqual([['direct'], ['immersive']])
    expect(wrapper.emitted('update-include-asset-package')).toEqual([[true]])
    expect(wrapper.emitted('export-data')).toHaveLength(1)
    expect(wrapper.emitted('trigger-import-data')).toHaveLength(1)
    expect(exportButton.classes()).toContain('p-3.5')
    expect(importButton.classes()).toContain('p-3.5')
    wrapper.unmount()

    const exporting = mountBackupSection({ exporting: true }).wrapper
    expect(getButtonByText(exporting, 'Exporting...').attributes('disabled')).toBeDefined()
    expect(getButtonByText(exporting, 'Restore Import').attributes('disabled')).toBeDefined()
    expect(exporting.get('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    exporting.unmount()

    const importing = mountBackupSection({ importing: true }).wrapper
    expect(getButtonByText(importing, 'Backup & Export').attributes('disabled')).toBeDefined()
    expect(getButtonByText(importing, 'Importing...').attributes('disabled')).toBeDefined()
    expect(importing.get('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    importing.unmount()
  })
})
