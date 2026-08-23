<template>
  <div
    class="jari-visual"
    :class="[`tone-${media.tone || 'linen'}`, { 'is-empty': media.kind === 'none' }]"
    role="img"
    :aria-label="media.kind === 'none' ? noImageLabel : planLabel"
  >
    <template v-if="media.kind !== 'none'">
      <span class="jari-visual__sun"></span>
      <span class="jari-visual__wall is-a"></span>
      <span class="jari-visual__wall is-b"></span>
      <span class="jari-visual__wall is-c"></span>
      <span class="jari-visual__room is-one"></span>
      <span v-if="media.rooms > 1" class="jari-visual__room is-two"></span>
      <span v-if="media.rooms > 2" class="jari-visual__room is-three"></span>
      <span class="jari-visual__door"></span>
      <small>{{ planCaption }}</small>
    </template>
    <template v-else>
      <span class="jari-visual__empty-mark" aria-hidden="true"><i class="fas fa-image"></i></span>
      <small>{{ noImageCaption }}</small>
    </template>
  </div>
</template>

<script setup>
defineProps({
  media: { type: Object, required: true },
  planLabel: { type: String, required: true },
  planCaption: { type: String, required: true },
  noImageLabel: { type: String, required: true },
  noImageCaption: { type: String, required: true },
})
</script>

<style scoped>
.jari-visual {
  --plan-ground: #d9dfd2;
  --plan-ink: #506052;
  position: relative;
  min-height: 152px;
  overflow: hidden;
  border-radius: 22px 22px 8px 22px;
  background:
    linear-gradient(90deg, transparent 19px, color-mix(in srgb, var(--plan-ink) 10%, transparent) 20px, transparent 21px) 0 0 / 32px 32px,
    linear-gradient(transparent 19px, color-mix(in srgb, var(--plan-ink) 10%, transparent) 20px, transparent 21px) 0 0 / 32px 32px,
    var(--plan-ground);
  isolation: isolate;
}
.jari-visual.tone-clay { --plan-ground: #dfc9b9; --plan-ink: #6f4d40; }
.jari-visual.tone-river { --plan-ground: #cbdde2; --plan-ink: #3f6470; }
.jari-visual.tone-sand { --plan-ground: #ddd2b7; --plan-ink: #625842; }
.jari-visual.tone-charcoal { --plan-ground: #3f4545; --plan-ink: #d8cfbd; }
.jari-visual.tone-linen { --plan-ground: #dedbd2; --plan-ink: #625f58; }
.jari-visual__sun { position: absolute; top: 18px; right: 18px; width: 28px; height: 28px; border: 1px solid var(--plan-ink); border-radius: 50%; opacity: .5; }
.jari-visual__wall { position: absolute; z-index: 2; display: block; border: 2px solid var(--plan-ink); border-radius: 2px; }
.jari-visual__wall.is-a { inset: 28px 52px 32px 24px; }
.jari-visual__wall.is-b { top: 28px; bottom: 32px; left: 48%; border-width: 0 0 0 2px; }
.jari-visual__wall.is-c { right: 52px; bottom: 65px; left: 48%; border-width: 2px 0 0; }
.jari-visual__room { position: absolute; z-index: 1; display: block; border-radius: 50%; background: color-mix(in srgb, var(--plan-ink) 12%, transparent); }
.jari-visual__room.is-one { left: 38px; bottom: 46px; width: 52px; height: 34px; }
.jari-visual__room.is-two { top: 42px; right: 68px; width: 37px; height: 37px; }
.jari-visual__room.is-three { right: 66px; bottom: 41px; width: 42px; height: 22px; }
.jari-visual__door { position: absolute; z-index: 3; left: calc(48% - 12px); bottom: 31px; width: 23px; height: 23px; border: 2px solid var(--plan-ink); border-width: 2px 0 0 2px; border-radius: 24px 0 0; transform: rotate(90deg); }
.jari-visual small { position: absolute; z-index: 4; right: 11px; bottom: 9px; padding: 4px 7px; border-radius: 999px; color: var(--plan-ink); background: color-mix(in srgb, var(--plan-ground) 78%, white); font-size: 9px; font-weight: 850; letter-spacing: .05em; }
.jari-visual.is-empty { display: grid; place-items: center; align-content: center; gap: 8px; color: var(--plan-ink); background: repeating-linear-gradient(135deg, var(--plan-ground), var(--plan-ground) 13px, color-mix(in srgb, var(--plan-ink) 7%, var(--plan-ground)) 13px, color-mix(in srgb, var(--plan-ink) 7%, var(--plan-ground)) 14px); }
.jari-visual.is-empty small { position: static; max-width: 80%; text-align: center; background: transparent; }
.jari-visual__empty-mark { width: 46px; height: 46px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--plan-ink) 45%, transparent); border-radius: 50%; font-size: 17px; }
@media (prefers-reduced-motion: reduce) { .jari-visual * { transition: none !important; } }
</style>
