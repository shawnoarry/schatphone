<template>
  <article class="ripple-detail" data-testid="community-post-detail">
    <header class="ripple-detail__header">
      <button type="button" class="ripple-detail__back" data-testid="community-detail-back" :aria-label="backLabel" @click="$emit('back')">
        <i class="fas fa-arrow-left" aria-hidden="true"></i><span>{{ backText }}</span>
      </button>
      <button type="button" class="ripple-detail__bookmark" :class="{ 'is-active': bookmarked }" :aria-label="bookmarkLabel" data-testid="community-detail-bookmark" @click="$emit('bookmark', post.id)">
        <i :class="bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark'" aria-hidden="true"></i>
      </button>
    </header>

    <div class="ripple-detail__scroll">
      <button type="button" class="ripple-detail__author" data-testid="community-detail-author" @click="$emit('account', account.id)">
        <span class="ripple-detail__avatar" :class="`tone-${account.tone}`" aria-hidden="true">{{ account.avatar }}</span>
        <span><strong>{{ accountName }}</strong><small>{{ account.handle }} · {{ timeLabel }}</small></span>
        <i v-if="account.verified" class="fas fa-circle-check" aria-label="verified"></i>
      </button>

      <div class="ripple-detail__truth" :class="`is-${truth.kind}`" data-testid="community-detail-truth">
        <i class="fas" :class="truth.icon" aria-hidden="true"></i>
        <span><strong>{{ truth.label }}</strong><small>{{ truth.detail }}</small></span>
      </div>

      <h1 v-if="title">{{ title }}</h1>
      <div v-if="post.media" class="ripple-detail__media" :class="`tone-${post.media.tone}`" aria-hidden="true">
        <small>{{ mediaEyebrow }}</small><strong>{{ post.media.mark }}</strong><span></span>
      </div>
      <p v-for="(paragraph, index) in body" :key="index">{{ paragraph }}</p>

      <section v-if="claims.length" class="ripple-detail__sources is-claims">
        <h2>{{ claimsHeading }}</h2>
        <div v-for="claim in claims" :key="claim.id" class="ripple-detail__source">
          <span><i class="fas fa-circle-question" aria-hidden="true"></i>{{ claim.statusLabel }}</span>
          <p>{{ claim.summary }}</p>
        </div>
      </section>

      <section v-if="facts.length" class="ripple-detail__sources">
        <h2>{{ sourcesHeading }}</h2>
        <div v-for="fact in facts" :key="fact.id" class="ripple-detail__source" :class="{ 'is-unavailable': !fact.available }">
          <span><i class="fas" :class="fact.available ? 'fa-link' : 'fa-link-slash'" aria-hidden="true"></i>{{ fact.sourceLabel }}</span>
          <p>{{ fact.summary }}</p>
          <small v-if="!fact.available">{{ unavailableLabel }}</small>
        </div>
      </section>

      <footer class="ripple-detail__footer">
        <span><i class="far fa-comment" aria-hidden="true"></i>{{ commentCount }}</span>
        <span><i class="fas fa-retweet" aria-hidden="true"></i>{{ repostCount }}</span>
        <small>{{ committedLabel }}</small>
      </footer>
    </div>
  </article>
</template>

<script setup>
defineProps({
  post: { type: Object, required: true }, account: { type: Object, required: true },
  accountName: { type: String, required: true }, title: { type: String, default: '' },
  body: { type: Array, required: true }, timeLabel: { type: String, required: true },
  truth: { type: Object, required: true }, mediaEyebrow: { type: String, default: '' },
  facts: { type: Array, default: () => [] }, claims: { type: Array, default: () => [] },
  bookmarked: { type: Boolean, default: false }, backLabel: { type: String, required: true },
  backText: { type: String, required: true }, bookmarkLabel: { type: String, required: true },
  sourcesHeading: { type: String, required: true }, claimsHeading: { type: String, required: true },
  unavailableLabel: { type: String, required: true }, committedLabel: { type: String, required: true },
  commentCount: { type: String, required: true }, repostCount: { type: String, required: true },
})
defineEmits(['back', 'bookmark', 'account'])
</script>

<style scoped>
.ripple-detail { height: 100%; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); color: var(--ripple-ink); background: var(--ripple-panel); }
.ripple-detail__header { min-height: 62px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--ripple-line); }
.ripple-detail__back, .ripple-detail__bookmark { min-height: 42px; border: 0; border-radius: 14px; color: var(--ripple-ink); background: transparent; cursor: pointer; }
.ripple-detail__back { padding: 0 12px; display: inline-flex; align-items: center; gap: 9px; font-weight: 800; }
.ripple-detail__bookmark { width: 42px; }
.ripple-detail__bookmark.is-active { color: var(--ripple-accent-ink); background: var(--ripple-accent-soft); }
.ripple-detail__scroll { min-height: 0; padding: 26px clamp(20px, 5vw, 64px) 48px; overflow-y: auto; }
.ripple-detail__author { max-width: 100%; padding: 0; display: grid; grid-template-columns: 50px minmax(0, 1fr) auto; gap: 12px; align-items: center; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; }
.ripple-detail__avatar { width: 50px; height: 50px; display: grid; place-items: center; border-radius: 17px 17px 17px 6px; color: #fff; background: #26313c; font: 800 18px/1 Georgia, serif; }
.ripple-detail__avatar.tone-vermilion { background: #e44a57; } .ripple-detail__avatar.tone-ink { background: #1c2832; } .ripple-detail__avatar.tone-blue { background: #2876a8; } .ripple-detail__avatar.tone-violet { background: #7557b7; } .ripple-detail__avatar.tone-slate { background: #59636d; } .ripple-detail__avatar.tone-coral { background: #f06462; }
.ripple-detail__author span { min-width: 0; } .ripple-detail__author strong, .ripple-detail__author small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ripple-detail__author strong { font-size: 15px; } .ripple-detail__author small { margin-top: 3px; color: var(--ripple-muted); } .ripple-detail__author > i { color: var(--ripple-accent); }
.ripple-detail__truth { margin: 22px 0 20px; padding: 12px 14px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; border-radius: 14px; color: var(--ripple-truth-ink); background: var(--ripple-truth-bg); }
.ripple-detail__truth span > * { display: block; } .ripple-detail__truth small { margin-top: 2px; line-height: 1.45; }
.ripple-detail__truth.is-unverified { --ripple-truth-bg: var(--ripple-warning-bg); --ripple-truth-ink: var(--ripple-warning-ink); } .ripple-detail__truth.is-corrected { --ripple-truth-bg: var(--ripple-corrected-bg); --ripple-truth-ink: var(--ripple-corrected-ink); } .ripple-detail__truth.is-source-unavailable { --ripple-truth-bg: var(--ripple-neutral-bg); --ripple-truth-ink: var(--ripple-neutral-ink); }
.ripple-detail h1 { margin: 0 0 20px; font: 800 clamp(26px, 4vw, 42px)/1.16 Georgia, 'Noto Serif SC', serif; letter-spacing: -.025em; overflow-wrap: anywhere; }
.ripple-detail__scroll > p { margin: 0 0 17px; color: var(--ripple-copy); font-size: 16px; line-height: 1.9; overflow-wrap: anywhere; }
.ripple-detail__media { position: relative; min-height: 230px; padding: 22px; margin-bottom: 24px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; border-radius: 24px; color: #fff; background: linear-gradient(135deg, #ff876c, #da3e63 58%, #562a56); }
.ripple-detail__media::after { content: ''; position: absolute; width: 330px; height: 330px; right: -110px; top: -150px; border: 1px solid rgba(255,255,255,.35); border-radius: 50%; box-shadow: 0 0 0 30px rgba(255,255,255,.05), 0 0 0 75px rgba(255,255,255,.04); }
.ripple-detail__media.tone-cloud { background: linear-gradient(145deg, #8ca7b7, #587181 52%, #283b4b); } .ripple-detail__media.tone-river { background: linear-gradient(135deg, #24566e, #438f99 52%, #d4a05e); } .ripple-detail__media.tone-mint { background: linear-gradient(135deg, #267a71, #4caa8a 58%, #d5bc6b); } .ripple-detail__media.tone-night { background: linear-gradient(135deg, #172a42, #36455f 50%, #cb5d6d); }
.ripple-detail__media small { z-index: 1; font-weight: 900; letter-spacing: .18em; } .ripple-detail__media strong { z-index: 1; font: 900 clamp(42px, 7vw, 68px)/1 Georgia, serif; } .ripple-detail__media span { width: 46px; height: 4px; background: #fff; }
.ripple-detail__sources { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--ripple-line); } .ripple-detail__sources h2 { margin: 0 0 12px; font: 800 16px/1.3 Georgia, 'Noto Serif SC', serif; }
.ripple-detail__source { padding: 13px 14px; margin-bottom: 9px; border-radius: 14px; background: var(--ripple-soft); } .ripple-detail__source span { display: flex; align-items: center; gap: 7px; color: var(--ripple-accent-ink); font-size: 12px; font-weight: 800; } .ripple-detail__source p { margin: 6px 0 0; color: var(--ripple-copy); font-size: 13px; line-height: 1.55; } .ripple-detail__source small { display: block; margin-top: 7px; color: var(--ripple-muted); font-weight: 700; } .ripple-detail__source.is-unavailable { border: 1px dashed var(--ripple-line-strong); }
.ripple-detail__footer { margin-top: 30px; padding-top: 18px; display: flex; align-items: center; gap: 20px; border-top: 1px solid var(--ripple-line); color: var(--ripple-muted); } .ripple-detail__footer span { display: inline-flex; gap: 7px; } .ripple-detail__footer small { margin-left: auto; }
button:focus-visible { outline: 3px solid var(--ripple-focus); outline-offset: 2px; }
@media (max-width: 560px) { .ripple-detail__scroll { padding: 20px 18px 42px; } .ripple-detail h1 { font-size: 27px; } .ripple-detail__media { min-height: 190px; border-radius: 18px; } .ripple-detail__footer { flex-wrap: wrap; } .ripple-detail__footer small { width: 100%; margin-left: 0; } }
</style>
