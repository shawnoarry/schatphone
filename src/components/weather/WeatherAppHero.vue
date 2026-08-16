<script setup>
import { computed } from 'vue'
import { resolveWeatherSceneAsset } from '../../lib/weather-visual-assets'

const props = defineProps({
  state: { type: String, default: 'clear' },
})

const sceneAsset = computed(() => resolveWeatherSceneAsset(props.state))
</script>

<template>
  <div class="weather-app-hero-art" :class="`is-${state}`" aria-hidden="true">
    <span class="weather-app-halo"></span>
    <span class="weather-app-stars"></span>
    <span class="weather-app-cloud is-back"></span>
    <img class="weather-app-scene" :src="sceneAsset" alt="" decoding="async" draggable="false" />
    <span class="weather-app-rain"></span>
    <span class="weather-app-cloud is-front"></span>
    <span class="weather-app-glow"></span>
  </div>
</template>

<style scoped>
.weather-app-hero-art {
  --hero-shadow: rgba(21, 49, 57, .25);
  --hero-halo: rgba(255, 207, 117, .72);
  position: relative;
  width: min(292px, 52vw);
  aspect-ratio: 1;
  isolation: isolate;
  justify-self: end;
  filter: drop-shadow(0 28px 26px var(--hero-shadow));
}

.weather-app-hero-art.is-cloudy {
  --hero-shadow: rgba(30, 49, 55, .34);
  --hero-halo: rgba(223, 233, 235, .4);
}

.weather-app-hero-art.is-rain {
  --hero-shadow: rgba(8, 26, 39, .52);
  --hero-halo: rgba(111, 174, 205, .26);
}

.weather-app-hero-art.is-night {
  --hero-shadow: rgba(5, 10, 40, .52);
  --hero-halo: rgba(127, 156, 255, .38);
}

.weather-app-scene,
.weather-app-halo,
.weather-app-stars,
.weather-app-rain,
.weather-app-cloud,
.weather-app-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.weather-app-scene {
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 52% 68%;
  animation: weather-app-scene-float 6.4s ease-in-out infinite;
}

.weather-app-halo {
  z-index: 0;
  inset: 24% 17% 19% 20%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--hero-halo), transparent 68%);
  filter: blur(13px);
  animation: weather-app-halo 4.6s ease-in-out infinite;
}

.weather-app-stars {
  z-index: 1;
  opacity: 0;
  background:
    radial-gradient(circle at 28% 25%, rgba(255,255,255,.98) 0 1px, transparent 1.8px),
    radial-gradient(circle at 44% 14%, rgba(174,197,255,.9) 0 1.4px, transparent 2px),
    radial-gradient(circle at 62% 30%, rgba(255,255,255,.86) 0 1px, transparent 1.8px),
    radial-gradient(circle at 74% 20%, rgba(189,178,255,.88) 0 1.2px, transparent 2px),
    radial-gradient(circle at 37% 42%, rgba(255,255,255,.72) 0 1px, transparent 1.7px);
  filter: drop-shadow(0 0 5px rgba(147, 175, 255, .8));
  animation: weather-app-stars 3.2s ease-in-out infinite;
}

.is-night .weather-app-stars { opacity: .92; }

.weather-app-cloud {
  z-index: 1;
  inset: 27% 15% auto 17%;
  height: 25%;
  opacity: 0;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 23% 66%, rgba(219,230,234,.78) 0 22%, transparent 24%),
    radial-gradient(ellipse at 51% 42%, rgba(193,207,214,.82) 0 30%, transparent 32%),
    radial-gradient(ellipse at 78% 67%, rgba(166,184,193,.78) 0 24%, transparent 26%);
  filter: blur(2px) drop-shadow(0 8px 8px rgba(25,49,58,.2));
}

.weather-app-cloud.is-front {
  z-index: 4;
  inset: auto 8% 23% 24%;
  height: 18%;
  filter: blur(4px);
  animation: weather-app-cloud-front 7s ease-in-out infinite alternate;
}

.is-cloudy .weather-app-cloud,
.is-rain .weather-app-cloud { opacity: .74; }
.is-rain .weather-app-cloud { filter: brightness(.58) saturate(.72) blur(2px); }
.weather-app-cloud.is-back { animation: weather-app-cloud-back 9s ease-in-out infinite alternate; }

.weather-app-rain {
  z-index: 3;
  inset: 18% 17% 13% 17%;
  opacity: 0;
  clip-path: polygon(10% 0, 100% 0, 88% 100%, 0 100%);
  background-image:
    repeating-linear-gradient(104deg, transparent 0 13px, rgba(181,226,249,.62) 14px, transparent 16px 28px),
    repeating-linear-gradient(104deg, transparent 0 19px, rgba(116,190,228,.36) 20px, transparent 22px 39px);
  background-size: 45px 65px, 67px 84px;
  mix-blend-mode: screen;
  animation: weather-app-rain .78s linear infinite;
}

.is-rain .weather-app-rain { opacity: .88; }

.weather-app-glow {
  z-index: 5;
  inset: 22% 19% 16% 21%;
  border-radius: 48%;
  opacity: .44;
  background: linear-gradient(112deg, transparent 29%, rgba(240,252,255,.74) 48%, transparent 62%);
  mix-blend-mode: screen;
  transform: translateX(-45%);
  animation: weather-app-glow 5.2s ease-in-out infinite;
}

.is-cloudy .weather-app-glow { opacity: .2; }
.is-rain .weather-app-glow { opacity: .08; }
.is-night .weather-app-glow { opacity: .34; }

@keyframes weather-app-scene-float {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-.25deg); }
  50% { transform: translate3d(0, -6px, 0) rotate(.35deg); }
}

@keyframes weather-app-halo {
  0%, 100% { opacity: .52; transform: scale(.92); }
  50% { opacity: .86; transform: scale(1.08); }
}

@keyframes weather-app-stars {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(147,175,255,.5)); }
  50% { filter: drop-shadow(0 0 8px rgba(190,205,255,.92)); }
}

@keyframes weather-app-cloud-back {
  from { transform: translateX(-8px) scale(.97); }
  to { transform: translateX(8px) scale(1.03); }
}

@keyframes weather-app-cloud-front {
  from { transform: translateX(8px); }
  to { transform: translateX(-10px); }
}

@keyframes weather-app-rain {
  from { background-position: 0 -62px, 9px -41px; }
  to { background-position: 0 67px, 9px 91px; }
}

@keyframes weather-app-glow {
  0%, 20% { transform: translateX(-45%); opacity: 0; }
  38% { opacity: .48; }
  64%, 100% { transform: translateX(48%); opacity: 0; }
}

@media (max-width: 430px) {
  .weather-app-hero-art { width: min(218px, 51vw); }
}

@media (min-width: 760px) {
  .weather-app-hero-art { width: 350px; }
}

@media (prefers-reduced-motion: reduce) {
  .weather-app-scene,
  .weather-app-halo,
  .weather-app-stars,
  .weather-app-cloud,
  .weather-app-rain,
  .weather-app-glow { animation: none !important; }
}
</style>
