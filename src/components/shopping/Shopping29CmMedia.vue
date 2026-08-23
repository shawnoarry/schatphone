<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  eyebrow: { type: String, default: '29CM / MEDIA SLOT' },
  label: { type: String, default: 'OBJECT' },
  tone: { type: String, default: 'stone' },
  role: { type: String, default: 'object' },
  icon: { type: String, default: 'fas fa-cube' },
  loading: { type: String, default: 'lazy' },
})

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<template>
  <figure class="cm-media" :class="['is-' + tone, 'is-' + role]">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      :loading="loading"
      decoding="async"
      @error="failed = true"
    />
    <div v-else class="cm-media-fallback" aria-hidden="true">
      <span class="cm-media-eyebrow">{{ eyebrow }}</span>
      <span class="cm-media-index">{{ label }}</span>
      <span class="cm-media-object"><i :class="icon"></i></span>
      <span class="cm-media-rule"></span>
    </div>
    <figcaption class="sr-only">{{ alt }}</figcaption>
  </figure>
</template>

<style scoped>
.cm-media{position:relative;min-width:0;min-height:0;overflow:hidden;background:#d9d8d2;isolation:isolate}
.cm-media img{width:100%;height:100%;display:block;object-fit:cover}
.cm-media-fallback{position:relative;width:100%;height:100%;overflow:hidden;display:block;color:#111;background:#d8d7d1}
.cm-media-fallback::before,.cm-media-fallback::after{content:'';position:absolute;z-index:-1;border-radius:50%;filter:blur(1px)}
.cm-media-fallback::before{width:72%;height:72%;right:-16%;bottom:-18%;background:rgba(255,255,255,.48);border:1px solid rgba(17,17,17,.24)}
.cm-media-fallback::after{width:46%;height:46%;top:18%;left:-16%;background:rgba(17,17,17,.08);border:1px solid rgba(17,17,17,.16)}
.cm-media-eyebrow{position:absolute;top:13px;left:13px;color:#ff4800;font-size:8px;font-weight:900;letter-spacing:.14em}
.cm-media-index{position:absolute;right:13px;top:13px;font-size:8px;font-weight:900;letter-spacing:.16em}
.cm-media-object{position:absolute;inset:23% 22%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(17,17,17,.38);background:rgba(255,255,255,.28);box-shadow:12px 14px 0 rgba(17,17,17,.08);transform:rotate(-5deg)}
.cm-media-object::before{content:'';position:absolute;inset:13%;border:1px solid rgba(17,17,17,.2);transform:rotate(9deg)}
.cm-media-object i{position:relative;z-index:1;font-size:clamp(28px,7vw,58px);font-weight:300}
.cm-media-rule{position:absolute;right:13px;bottom:15px;left:13px;height:1px;background:#111}
.is-night .cm-media-fallback{color:#f5f4f0;background:#20211f}.is-night .cm-media-fallback::before{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.35)}.is-night .cm-media-fallback::after{background:rgba(255,72,0,.25);border-color:rgba(255,72,0,.48)}.is-night .cm-media-object{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.06);box-shadow:12px 14px 0 rgba(255,72,0,.2)}.is-night .cm-media-object::before{border-color:rgba(255,255,255,.2)}.is-night .cm-media-rule{background:#f5f4f0}
.is-paper .cm-media-fallback{background:#eee8dd}.is-paper .cm-media-fallback::before{background:rgba(255,72,0,.14);border-color:rgba(255,72,0,.42)}.is-paper .cm-media-fallback::after{background:rgba(17,17,17,.12)}
.is-metal .cm-media-fallback{background:#c7c8c4}.is-metal .cm-media-fallback::before{background:linear-gradient(140deg,rgba(255,255,255,.74),rgba(17,17,17,.14));border-radius:12%;transform:rotate(-14deg)}.is-metal .cm-media-object{background:rgba(255,255,255,.38);border-radius:10%}
.is-departure .cm-media-fallback{background:#b9aaa0}.is-departure .cm-media-fallback::before{width:62%;height:80%;right:16%;bottom:-24%;border-radius:12%;background:rgba(17,17,17,.12);transform:rotate(10deg)}.is-departure .cm-media-object{border-radius:12%;transform:rotate(4deg)}
.is-context{aspect-ratio:3/2}.is-material{aspect-ratio:4/3}.is-state{aspect-ratio:1/1}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:640px){.cm-media-object{inset:25% 20%}.cm-media-eyebrow,.cm-media-index{font-size:7px}}
</style>
