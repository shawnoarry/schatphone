<script setup>
import { useRoute, useRouter } from 'vue-router'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const imageStore = useImageGenerationStore()

const formatTime = (value) => value ? new Date(value).toLocaleString() : '—'
const openCandidate = (candidateId) => router.push({
  path: '/camera',
  query: { ...route.query, candidate: candidateId },
})
</script>

<template>
  <CameraSettingsShell
    :title="t('任务与候选图', 'Tasks & Candidates')"
    :back-label="t('相机', 'Camera')"
    back-to="/camera"
  >
    <div class="camera-task-heading">
      <h2>{{ t('最近候选图', 'RECENT CANDIDATES') }}</h2>
      <button v-if="imageStore.recentCandidates.length" type="button" @click="imageStore.clearRecentCandidates">
        {{ t('清空', 'Clear') }}
      </button>
    </div>
    <section v-if="imageStore.recentCandidates.length" class="camera-candidate-grid">
      <article v-for="candidate in imageStore.recentCandidates" :key="candidate.id">
        <button type="button" class="camera-candidate-image" @click="openCandidate(candidate.id)">
          <img :src="candidate.imageUrl" :alt="candidate.prompt" />
          <span v-if="candidate.galleryAssetId"><i class="fas fa-check" aria-hidden="true"></i></span>
        </button>
        <div class="camera-candidate-copy">
          <p>{{ candidate.prompt }}</p>
          <small>{{ candidate.profileName }} · {{ formatTime(candidate.createdAt) }}</small>
          <button type="button" :aria-label="t('移除候选图', 'Remove candidate')" @click="imageStore.removeCandidate(candidate.id)">
            <i class="fas fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </article>
    </section>
    <div v-else class="camera-task-empty">
      <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
      <p>{{ t('还没有生成候选图', 'No generated candidates yet') }}</p>
    </div>

    <div class="camera-task-heading">
      <h2>{{ t('本次运行任务', 'CURRENT SESSION TASKS') }}</h2>
    </div>
    <section v-if="imageStore.activeTasks.length" class="camera-task-list">
      <article v-for="task in imageStore.activeTasks" :key="task.taskId">
        <span :class="`is-${task.status}`"><i class="fas fa-bolt" aria-hidden="true"></i></span>
        <div>
          <strong>{{ imageStore.getProfileById(task.profileId)?.name || task.modelId }}</strong>
          <small>{{ task.status }} · {{ formatTime(task.createdAt) }}</small>
        </div>
      </article>
    </section>
    <p v-else class="camera-task-session-note">
      {{ t('任务状态只用于当前运行会话；候选图按 7 天或 30 张上限清理。', 'Task status is session-only. Candidates are pruned after seven days or above 30 items.') }}
    </p>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-task-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 4px 7px;
}

.camera-task-heading:not(:first-child) { margin-top: 20px; }
.camera-task-heading h2 { margin: 0; color: #7a7e86; font-size: 8px; }
.camera-task-heading button { color: #c23a33; font-size: 9px; }

.camera-candidate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.camera-candidate-grid article {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 7px;
  background: #fff;
}

.camera-candidate-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #17191d;
}

.camera-candidate-image img { width: 100%; height: 100%; object-fit: cover; }
.camera-candidate-image span { position: absolute; right: 6px; bottom: 6px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: #22964e; font-size: 8px; }

.camera-candidate-copy {
  position: relative;
  min-height: 58px;
  padding: 8px 30px 8px 9px;
}

.camera-candidate-copy p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }
.camera-candidate-copy small { display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #8b8e95; font-size: 7px; }
.camera-candidate-copy button { position: absolute; top: 9px; right: 8px; width: 22px; height: 22px; color: #a9abb0; font-size: 9px; }

.camera-task-empty {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  color: #a0a3a9;
  background: #fff;
}

.camera-task-empty i { font-size: 22px; }
.camera-task-empty p { margin: 0; font-size: 10px; }

.camera-task-list {
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-task-list article {
  min-height: 54px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
}

.camera-task-list article + article { border-top: 1px solid rgba(17, 24, 39, 0.08); }
.camera-task-list article > span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: #1570ef; font-size: 10px; }
.camera-task-list article > span.is-failed { background: #cf4037; }
.camera-task-list article > span.is-done { background: #259a54; }
.camera-task-list strong,
.camera-task-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.camera-task-list strong { font-size: 10px; }
.camera-task-list small { margin-top: 3px; color: #85888f; font-size: 8px; }
.camera-task-session-note { margin: 0 4px; color: #7c7f87; font-size: 9px; line-height: 1.5; }
</style>
