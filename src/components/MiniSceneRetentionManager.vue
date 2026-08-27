<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { useMiniSceneStore } from '../stores/miniScene'

const { t } = useI18n()
const { confirmDialog } = useDialog()
const miniSceneStore = useMiniSceneStore()
const { artifacts } = storeToRefs(miniSceneStore)
const stateFilter = ref('all')
const page = ref(1)
const commandError = ref('')

const pageResult = computed(() =>
  miniSceneStore.listRetainedArtifacts({
    state: stateFilter.value,
    page: page.value,
    pageSize: 8,
  }),
)

const counts = computed(() => ({
  all: artifacts.value.length,
  retained: artifacts.value.filter((artifact) => artifact.retention.state === 'retained').length,
  archived: artifacts.value.filter((artifact) => artifact.retention.state === 'archived').length,
}))

watch(stateFilter, () => {
  page.value = 1
  commandError.value = ''
})

watch(
  () => pageResult.value.page,
  (nextPage) => {
    if (page.value !== nextPage) page.value = nextPage
  },
)

const formatTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return '-'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const runCommand = (command) => {
  commandError.value = ''
  const result = command()
  if (!result?.ok) {
    commandError.value = t(
      '操作没有保存成功，历史内容保持原样，请稍后重试。',
      'The change could not be saved. History was left unchanged; please retry.',
    )
  }
  return result
}

const toggleArchive = (artifact) => {
  if (artifact.retention.state === 'archived') {
    runCommand(() => miniSceneStore.restoreArtifact(artifact.artifactId))
    return
  }
  runCommand(() => miniSceneStore.archiveArtifact(artifact.artifactId))
}

const deleteArtifact = async (artifact) => {
  const confirmed = await confirmDialog({
    title: t('删除这段小剧场？', 'Delete this Mini Scene?'),
    message: t(
      '只会删除保存的小剧场全文，不会删除来源事件、角色记忆、生活记录或事件审计。',
      'Only the saved Mini Scene content will be removed. Its source event, role memory, life records, and event audit remain intact.',
    ),
    details: [artifact.content.title],
    confirmText: t('删除小剧场', 'Delete scene'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  runCommand(() => miniSceneStore.deleteArtifact(artifact.artifactId))
}
</script>

<template>
  <section
    class="rounded-2xl border border-white/10 bg-slate-900/80 p-4"
    data-testid="mini-scene-retention-manager"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-100">{{ t('小剧场回忆', 'Mini Scene Memories') }}</p>
        <p class="mt-1 max-w-2xl text-[11px] leading-4 text-slate-500">
          {{ t('这里只管理你明确保存的小剧场全文。它不是第二份事件记录，也不会改变来源事件。', 'This area manages only the full Mini Scenes you explicitly saved. It is not a second event record and cannot change the source event.') }}
        </p>
      </div>
      <span class="shrink-0 rounded-full bg-violet-200/10 px-2 py-1 text-[10px] font-semibold text-violet-100">
        {{ counts.all }} {{ t('段已保存', 'saved') }}
      </span>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2" role="group" :aria-label="t('小剧场筛选', 'Mini Scene filters')">
      <button
        v-for="option in [
          { value: 'all', label: t('全部', 'All'), count: counts.all },
          { value: 'retained', label: t('保留中', 'Saved'), count: counts.retained },
          { value: 'archived', label: t('已归档', 'Archived'), count: counts.archived },
        ]"
        :key="option.value"
        type="button"
        class="min-w-0 rounded-xl border px-2 py-2 text-[11px] font-semibold"
        :class="stateFilter === option.value ? 'border-violet-200/60 bg-violet-200/12 text-violet-50' : 'border-white/10 bg-white/8 text-slate-400'"
        :aria-pressed="stateFilter === option.value"
        :data-testid="`mini-scene-history-filter-${option.value}`"
        @click="stateFilter = option.value"
      >
        <strong class="block text-sm text-white">{{ option.count }}</strong>
        {{ option.label }}
      </button>
    </div>

    <p
      v-if="commandError"
      class="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[11px] leading-4 text-rose-100"
      role="alert"
      data-testid="mini-scene-history-error"
    >
      {{ commandError }}
    </p>

    <div v-if="pageResult.items.length" class="mt-3 space-y-2">
      <article
        v-for="artifact in pageResult.items"
        :key="artifact.artifactId"
        class="min-w-0 rounded-2xl border border-white/10 bg-white/8 p-3"
        data-testid="mini-scene-history-item"
      >
        <div class="flex min-w-0 items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="break-words text-xs font-semibold text-white">{{ artifact.content.title }}</p>
            <p class="mt-1 line-clamp-2 break-words text-[11px] leading-4 text-slate-400">
              {{ artifact.content.summary || artifact.content.textFallback }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
            :class="artifact.retention.state === 'archived' ? 'bg-white/10 text-slate-400' : 'bg-violet-200/12 text-violet-100'"
          >
            {{ artifact.retention.state === 'archived' ? t('已归档', 'Archived') : t('已保存', 'Saved') }}
          </span>
        </div>
        <p class="mt-2 break-all text-[10px] leading-4 text-slate-600">
          {{ formatTime(artifact.retention.retainedAt) }} · v{{ artifact.revision }} · {{ artifact.source.moduleKey }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="min-h-11 rounded-full bg-violet-200 px-3 py-2 text-[11px] font-semibold text-slate-950"
            :data-testid="`mini-scene-history-open-${artifact.artifactId}`"
            @click="miniSceneStore.openArtifact(artifact.artifactId)"
          >
            {{ t('打开', 'Open') }}
          </button>
          <button
            type="button"
            class="min-h-11 rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-slate-200"
            :data-testid="`mini-scene-history-archive-${artifact.artifactId}`"
            @click="toggleArchive(artifact)"
          >
            {{ artifact.retention.state === 'archived' ? t('恢复', 'Restore') : t('归档', 'Archive') }}
          </button>
          <button
            type="button"
            class="min-h-11 rounded-full bg-rose-300/12 px-3 py-2 text-[11px] font-semibold text-rose-100"
            :data-testid="`mini-scene-history-delete-${artifact.artifactId}`"
            @click="deleteArtifact(artifact)"
          >
            {{ t('删除', 'Delete') }}
          </button>
        </div>
      </article>
    </div>
    <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-4 text-xs leading-5 text-slate-400">
      {{ counts.all
        ? t('当前筛选下没有小剧场。', 'No Mini Scenes match this filter.')
        : t('你明确保存的小剧场会出现在这里。临时观看不会自动留下全文。', 'Mini Scenes you explicitly save will appear here. Temporary viewing does not keep the full text automatically.') }}
    </p>

    <nav
      v-if="pageResult.totalPages > 1"
      class="mt-3 flex items-center justify-between gap-3"
      :aria-label="t('小剧场历史分页', 'Mini Scene history pages')"
    >
      <button
        type="button"
        class="min-h-11 rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-40"
        :disabled="pageResult.page <= 1"
        data-testid="mini-scene-history-previous"
        @click="page -= 1"
      >
        {{ t('上一页', 'Previous') }}
      </button>
      <span class="text-[11px] text-slate-500">{{ pageResult.page }} / {{ pageResult.totalPages }}</span>
      <button
        type="button"
        class="min-h-11 rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-40"
        :disabled="pageResult.page >= pageResult.totalPages"
        data-testid="mini-scene-history-next"
        @click="page += 1"
      >
        {{ t('下一页', 'Next') }}
      </button>
    </nav>
  </section>
</template>
