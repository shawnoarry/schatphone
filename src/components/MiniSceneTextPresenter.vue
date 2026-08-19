<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useMiniSceneStore } from '../stores/miniScene'

const router = useRouter()
const { t } = useI18n()
const miniSceneStore = useMiniSceneStore()
const { activeArtifact } = storeToRefs(miniSceneStore)
const panelRef = ref(null)
const closeButtonRef = ref(null)
const copyStatus = ref('')
let previouslyFocusedElement = null
let previousBodyOverflow = ''
let copyStatusTimer = null

const clearCopyStatus = () => {
  if (copyStatusTimer) clearTimeout(copyStatusTimer)
  copyStatusTimer = null
  copyStatus.value = ''
}

const closePresenter = () => {
  clearCopyStatus()
  miniSceneStore.closeActiveArtifact()
}

const onDocumentKeydown = (event) => {
  if (!activeArtifact.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closePresenter()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = panelRef.value?.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable?.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const copyArtifactText = async () => {
  const artifact = activeArtifact.value
  if (!artifact) return
  const text = `${artifact.content.title}\n\n${artifact.content.textFallback}`
  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = t('已复制', 'Copied')
  } catch {
    copyStatus.value = t('复制失败', 'Copy failed')
  }
  if (copyStatusTimer) clearTimeout(copyStatusTimer)
  copyStatusTimer = setTimeout(() => {
    copyStatus.value = ''
    copyStatusTimer = null
  }, 1600)
}

const choose = (choiceId) => {
  miniSceneStore.chooseActiveArtifact(choiceId)
}

const returnToSource = async () => {
  const artifact = activeArtifact.value
  if (!artifact) return
  const sourceRoute = miniSceneStore.getArtifactSourceRoute(artifact)
  if (!sourceRoute) return
  const query = {
    miniSceneArtifactId: artifact.artifactId,
    eventId: artifact.source.eventId || artifact.source.recordId,
  }
  miniSceneStore.markActiveArtifactReturnToSource()
  await router.push({ path: sourceRoute, query })
}

watch(
  activeArtifact,
  async (artifact, previous) => {
    if (artifact && !previous) {
      previouslyFocusedElement = document.activeElement
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onDocumentKeydown)
      await nextTick()
      closeButtonRef.value?.focus()
      return
    }
    if (!artifact && previous) {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', onDocumentKeydown)
      previouslyFocusedElement?.focus?.()
      previouslyFocusedElement = null
    }
  },
)

onBeforeUnmount(() => {
  clearCopyStatus()
  document.removeEventListener('keydown', onDocumentKeydown)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <transition name="mini-scene-presenter">
      <div
        v-if="activeArtifact"
        class="mini-scene-presenter"
        data-testid="mini-scene-text-presenter"
        @click.self="closePresenter"
      >
        <article
          ref="panelRef"
          class="mini-scene-presenter__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mini-scene-presenter-title"
        >
          <header class="mini-scene-presenter__header">
            <div>
              <p>{{ t('事件小剧场', 'Event Mini Scene') }}</p>
              <h2 id="mini-scene-presenter-title">{{ activeArtifact.content.title }}</h2>
            </div>
            <button
              ref="closeButtonRef"
              type="button"
              class="mini-scene-presenter__icon-button"
              :aria-label="t('关闭小剧场', 'Close Mini Scene')"
              data-testid="mini-scene-close"
              @click="closePresenter"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div class="mini-scene-presenter__body">
            <p v-if="activeArtifact.content.summary" class="mini-scene-presenter__summary">
              {{ activeArtifact.content.summary }}
            </p>

            <section aria-labelledby="mini-scene-fallback-title">
              <h3 id="mini-scene-fallback-title">{{ t('文字稿', 'Text fallback') }}</h3>
              <p class="mini-scene-presenter__fallback">{{ activeArtifact.content.textFallback }}</p>
            </section>

            <section v-if="activeArtifact.content.beats.length" aria-labelledby="mini-scene-beats-title">
              <h3 id="mini-scene-beats-title">{{ t('场景节拍', 'Scene beats') }}</h3>
              <ol class="mini-scene-presenter__beats">
                <li v-for="beat in activeArtifact.content.beats" :key="beat.id">{{ beat.text }}</li>
              </ol>
            </section>

            <fieldset v-if="activeArtifact.content.choices.length" class="mini-scene-presenter__choices">
              <legend>{{ t('你会怎么回应？', 'How do you respond?') }}</legend>
              <button
                v-for="choice in activeArtifact.content.choices"
                :key="choice.id"
                type="button"
                :class="{ 'is-selected': activeArtifact.interactionState.selectedChoiceId === choice.id }"
                :aria-pressed="activeArtifact.interactionState.selectedChoiceId === choice.id"
                :data-testid="`mini-scene-choice-${choice.id}`"
                @click="choose(choice.id)"
              >
                <i
                  :class="activeArtifact.interactionState.selectedChoiceId === choice.id ? 'fas fa-circle-check' : 'far fa-circle'"
                  aria-hidden="true"
                ></i>
                <span>{{ choice.label }}</span>
              </button>
              <p>{{ t('选择已记录；来源事件系统验证前，不会改变事件结果。', 'Your choice is recorded; it cannot change the event outcome until the source event system validates it.') }}</p>
            </fieldset>
          </div>

          <footer class="mini-scene-presenter__footer">
            <button type="button" class="mini-scene-presenter__command" data-testid="mini-scene-copy" @click="copyArtifactText">
              <i class="far fa-copy" aria-hidden="true"></i>
              <span>{{ copyStatus || t('复制文字', 'Copy text') }}</span>
            </button>
            <button type="button" class="mini-scene-presenter__command is-primary" data-testid="mini-scene-return-source" @click="returnToSource">
              <i class="fas fa-arrow-left" aria-hidden="true"></i>
              <span>{{ t('查看事件来源', 'View event source') }}</span>
            </button>
          </footer>
        </article>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.mini-scene-presenter {
  position: fixed;
  inset: 0;
  z-index: 980;
  display: grid;
  place-items: center;
  padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: rgba(12, 16, 24, 0.58);
  backdrop-filter: blur(12px);
}

.mini-scene-presenter__panel {
  width: min(620px, 100%);
  max-height: min(760px, 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  color: var(--system-text);
  background: var(--system-panel-bg);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
}

.mini-scene-presenter__header,
.mini-scene-presenter__footer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: var(--system-chrome-bg);
}

.mini-scene-presenter__header {
  justify-content: space-between;
  border-bottom: 1px solid var(--system-subtle-border);
}

.mini-scene-presenter__header div {
  min-width: 0;
}

.mini-scene-presenter__header p,
.mini-scene-presenter__header h2,
.mini-scene-presenter__body h3,
.mini-scene-presenter__body p {
  margin: 0;
}

.mini-scene-presenter__header p {
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 800;
}

.mini-scene-presenter__header h2 {
  margin-top: 3px;
  font-size: 20px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.mini-scene-presenter__icon-button {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--system-control-border);
  border-radius: 50%;
  color: var(--system-text);
  background: var(--system-control-bg);
  cursor: pointer;
}

.mini-scene-presenter__body {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
}

.mini-scene-presenter__body section + section,
.mini-scene-presenter__body section + fieldset,
.mini-scene-presenter__summary + section {
  margin-top: 20px;
}

.mini-scene-presenter__summary {
  color: var(--system-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.mini-scene-presenter__body h3,
.mini-scene-presenter__choices legend {
  margin-bottom: 9px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.mini-scene-presenter__fallback {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.75;
}

.mini-scene-presenter__beats {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 22px;
}

.mini-scene-presenter__beats li {
  padding-left: 4px;
  font-size: 13px;
  line-height: 1.65;
}

.mini-scene-presenter__choices {
  display: grid;
  gap: 9px;
  margin-inline: 0;
  padding: 0;
  border: 0;
}

.mini-scene-presenter__choices button {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.mini-scene-presenter__choices button.is-selected {
  border-color: var(--system-accent);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.mini-scene-presenter__choices p {
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.5;
}

.mini-scene-presenter__footer {
  justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid var(--system-subtle-border);
}

.mini-scene-presenter__command {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.mini-scene-presenter__command.is-primary {
  border-color: transparent;
  color: white;
  background: var(--system-accent);
}

.mini-scene-presenter-enter-active,
.mini-scene-presenter-leave-active {
  transition: opacity 160ms ease;
}

.mini-scene-presenter-enter-from,
.mini-scene-presenter-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .mini-scene-presenter {
    place-items: end center;
    padding: max(12px, env(safe-area-inset-top)) 0 0;
  }

  .mini-scene-presenter__panel {
    width: 100%;
    max-height: 92vh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: var(--system-radius-md) var(--system-radius-md) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mini-scene-presenter__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .mini-scene-presenter-enter-active,
  .mini-scene-presenter-leave-active {
    transition: none;
  }
}
</style>
