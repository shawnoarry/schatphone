<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  backupCopyTone: {
    type: String,
    required: true,
  },
  backupIncludeAssetPackage: {
    type: Boolean,
    default: false,
  },
  backupExporting: {
    type: Boolean,
    default: false,
  },
  backupImporting: {
    type: Boolean,
    default: false,
  },
  backupExportModeLabel: {
    type: String,
    required: true,
  },
  backupExportModeHint: {
    type: String,
    required: true,
  },
  backupPackageLimitHint: {
    type: String,
    required: true,
  },
  backupFeedbackType: {
    type: String,
    default: '',
  },
  backupFeedbackMessage: {
    type: String,
    default: '',
  },
  resolveBackupCopy: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'export-data',
  'open-about',
  'trigger-import-data',
  'update-backup-copy-tone',
  'update-include-asset-package',
])

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
    <div class="px-3.5 py-3 border-b border-gray-100 space-y-2.5">
      <p class="text-sm font-medium">{{ t('备份提示风格', 'Backup copy style') }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="py-2 rounded-lg text-xs font-medium border transition"
          :class="
            backupCopyTone === 'direct'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          "
          @click="$emit('update-backup-copy-tone', 'direct')"
        >
          {{ t('直白说明', 'Direct') }}
        </button>
        <button
          class="py-2 rounded-lg text-xs font-medium border transition"
          :class="
            backupCopyTone === 'immersive'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          "
          @click="$emit('update-backup-copy-tone', 'immersive')"
        >
          {{ t('沉浸叙事', 'Immersive') }}
        </button>
      </div>
      <p class="text-[11px] text-gray-500">
        {{
          t(
            '仅影响系统提示文案，不影响 AI 回复内容。',
            'Only affects system copy, not AI-generated replies.',
          )
        }}
      </p>
    </div>

    <div class="px-3.5 py-3 border-b border-gray-100">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium">{{ resolveBackupCopy('导出包含素材包（可选）', 'Include asset package in export (optional)', '导出时附带素材行李（可选）', 'Include asset luggage in export (optional)') }}</p>
          <p class="text-[11px] text-gray-500">
            {{
              resolveBackupCopy(
                '默认仅导出元数据。开启后会尝试打包本地素材二进制，文件体积会明显增大。',
                'Metadata-only is default. When enabled, local binary assets are packaged and backup size grows significantly.',
                '默认轻装模式仅导出元数据。开启后会尽量装入本地素材，备份体积会明显变大。',
                'Travel-light (metadata-only) is default. Enabling this packs local assets when possible and increases backup size.',
              )
            }}
          </p>
        </div>
        <input
          :checked="backupIncludeAssetPackage"
          type="checkbox"
          class="w-5 h-5 shrink-0"
          :disabled="backupExporting || backupImporting"
          @change="$emit('update-include-asset-package', $event.target.checked)"
        />
      </div>
    </div>

    <div class="px-3.5 py-2.5 border-b border-gray-100 bg-gray-50 space-y-1">
      <p class="text-[11px] font-medium text-gray-700">{{ backupExportModeLabel }}</p>
      <p class="text-[10px] text-gray-500">{{ backupExportModeHint }}</p>
      <p class="text-[10px] text-gray-400">{{ backupPackageLimitHint }}</p>
    </div>

    <button
      class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
      @click="$emit('export-data')"
      :disabled="backupExporting || backupImporting"
    >
      <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
        <i class="fas fa-file-export"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm">
          {{
            backupExporting
              ? t('正在导出...', 'Exporting...')
              : resolveBackupCopy('备份与导出（JSON）', 'Backup & Export (JSON)', '打包并导出（JSON）', 'Pack & Export (JSON)')
          }}
        </p>
        <p class="text-[11px] text-gray-500">
          {{
            backupIncludeAssetPackage
              ? resolveBackupCopy(
                  '将尝试附带素材包导出（体积更大）',
                  'Will try to include asset package (larger file size)',
                  '将尝试附带素材行李导出（文件更大）',
                  'Will try to include asset luggage (larger file size)',
                )
              : resolveBackupCopy(
                  '导出当前本地数据快照（元数据模式）',
                  'Export current local snapshot (metadata mode)',
                  '导出当前本地快照（轻装模式）',
                  'Export current local snapshot (travel-light mode)',
                )
          }}
        </p>
      </div>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
    </button>

    <button
      class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
      @click="$emit('trigger-import-data')"
      :disabled="backupImporting || backupExporting"
    >
      <div class="w-7 h-7 rounded bg-green-500 flex items-center justify-center text-white text-xs">
        <i class="fas fa-file-import"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm">
          {{ backupImporting ? t('正在导入...', 'Importing...') : t('恢复导入（JSON）', 'Restore Import (JSON)') }}
        </p>
        <p class="text-[11px] text-gray-500">{{ t('导入失败会自动回滚', 'Auto rollback will run if import fails') }}</p>
      </div>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
    </button>

    <button
      class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
      @click="$emit('open-about')"
    >
      <div class="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
        <i class="fas fa-circle-info"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm">{{ t('关于 SchatPhone', 'About SchatPhone') }}</p>
        <p class="text-[11px] text-gray-500">{{ t('版本与框架信息', 'Version and stack information') }}</p>
      </div>
      <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
    </button>
  </div>

  <p
    v-if="backupFeedbackMessage"
    class="px-1 text-[11px]"
    :class="backupFeedbackType === 'error' ? 'text-red-600' : backupFeedbackType === 'warn' ? 'text-amber-600' : 'text-emerald-600'"
  >
    {{ backupFeedbackMessage }}
  </p>
</template>
