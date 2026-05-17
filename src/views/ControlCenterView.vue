<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)
const { t } = useI18n()

const enabled = computed(() => systemStore.isMoreFeatureToggleEnabled('control_center'))
const eventEngineEnabled = computed(
  () => settings.value.more?.featureToggles?.control_center === true,
)

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openMore = () => {
  router.push('/more')
}
</script>

<template>
  <div class="w-full h-full bg-slate-950 text-white flex flex-col">
    <header class="pt-12 pb-4 px-4 border-b border-white/10 flex items-center gap-3">
      <button
        class="text-sm text-slate-300 flex items-center gap-1"
        type="button"
        @click="goHome"
      >
        <i class="fas fa-chevron-left"></i>
        {{ t('主页', 'Home') }}
      </button>
      <div>
        <p class="text-[11px] uppercase tracking-[0.22em] text-cyan-200">
          {{ t('可选玩法层', 'Optional Play Layer') }}
        </p>
        <h1 class="text-lg font-bold">{{ t('导演台', 'Director') }}</h1>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
      <section
        class="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 shadow-2xl shadow-cyan-950/30"
        data-testid="control-center-status"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">
              {{ enabled ? t('运行控制已开启', 'Runtime Control Enabled') : t('运行控制未开启', 'Runtime Control Disabled') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-slate-300">
              {{
                enabled
                  ? t(
                    '这里会作为事件、解锁、资金、好感度等玩法数值的统一控制入口；当前先保留安全占位。',
                    'This will become the shared control entry for events, unlocks, money, affinity, and other play values; it is currently a safe placeholder.',
                  )
                  : t(
                    '关闭时主屏不显示导演台入口，聊天、地图、购物、外卖等常规模块不受影响。',
                    'When disabled, Home hides the Director entry and regular Chat, Map, Shopping, Food Delivery, and other modules remain unaffected.',
                  )
              }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-[11px] font-semibold"
            :class="enabled ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-300'"
          >
            {{ enabled ? t('开启', 'On') : t('关闭', 'Off') }}
          </span>
        </div>
        <button
          v-if="!enabled"
          class="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950"
          type="button"
          @click="openMore"
        >
          {{ t('前往更多页开启', 'Enable in More') }}
        </button>
      </section>

      <section class="grid gap-3">
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('事件控制', 'Event Control') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('后续接入世界观事件包、随机触发频率、模块适配器开关与事件日志检索。', 'Later this connects world event packs, random trigger frequency, module adapter toggles, and event log review.') }}
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('数值控制', 'Value Control') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('后续可承载好感度、持有资金、资产状态、任务解锁等可选游戏化数据。', 'Later this can host optional game-like data such as affinity, funds, asset states, and quest unlocks.') }}
          </p>
        </article>
        <article class="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p class="text-sm font-semibold">{{ t('沉浸边界', 'Immersion Boundary') }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-400">
            {{ t('资料导入仍保留在各业务模块内；导演台只做统一编排、查看与改写。', 'Data intake stays inside each immersive module; Director only coordinates, reviews, and overrides runtime behavior.') }}
          </p>
        </article>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <p class="text-xs font-semibold text-slate-200">{{ t('当前接入状态', 'Current Wiring') }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('主屏入口：可选', 'Home entry: optional') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">
            {{ eventEngineEnabled ? t('设置开关：开启', 'Settings toggle: on') : t('设置开关：关闭', 'Settings toggle: off') }}
          </span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('事件引擎：待接入', 'Event engine: pending') }}</span>
          <span class="rounded-xl bg-white/8 px-3 py-2">{{ t('数值面板：待接入', 'Values panel: pending') }}</span>
        </div>
      </section>
    </main>
  </div>
</template>
