<template>
  <article
    class="ripple-post"
    :class="[{ 'is-unread': !read }, `truth-${truth.kind}`]"
    :data-testid="`community-post-${post.id}`"
  >
    <button
      type="button"
      class="ripple-post__open"
      :aria-label="openLabel"
      @click="$emit('open', post.id)"
    >
      <span class="ripple-avatar" :class="`tone-${account.tone}`" aria-hidden="true">
        {{ account.avatar }}
      </span>
      <span class="ripple-post__content">
        <span class="ripple-post__byline">
          <strong>{{ accountName }}</strong>
          <i v-if="account.verified" class="fas fa-circle-check" aria-hidden="true"></i>
          <span>{{ account.handle }}</span>
          <span aria-hidden="true">·</span>
          <time :datetime="post.publishedAt">{{ timeLabel }}</time>
        </span>

        <span class="ripple-truth" :class="`is-${truth.kind}`">
          <i class="fas" :class="truth.icon" aria-hidden="true"></i>
          <strong>{{ truth.label }}</strong>
          <span>{{ truth.detail }}</span>
        </span>

        <strong v-if="title" class="ripple-post__title">{{ title }}</strong>
        <span class="ripple-post__body">{{ body }}</span>

        <span v-if="post.media" class="ripple-media" :class="`tone-${post.media.tone}`" aria-hidden="true">
          <small>{{ mediaEyebrow }}</small>
          <strong>{{ post.media.mark }}</strong>
          <span class="ripple-media__line"></span>
        </span>
      </span>
    </button>

    <footer class="ripple-post__footer">
      <span class="ripple-post__metric" :aria-label="commentLabel">
        <i class="far fa-comment" aria-hidden="true"></i>
        {{ commentCount }}
      </span>
      <span class="ripple-post__metric" :aria-label="repostLabel">
        <i class="fas fa-retweet" aria-hidden="true"></i>
        {{ repostCount }}
      </span>
      <button
        type="button"
        class="ripple-post__action"
        :class="{ 'is-active': bookmarked }"
        :aria-label="bookmarkLabel"
        :data-testid="`community-bookmark-${post.id}`"
        @click="$emit('bookmark', post.id)"
      >
        <i :class="bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark'" aria-hidden="true"></i>
      </button>
      <span v-if="!read" class="ripple-post__new">{{ newLabel }}</span>
    </footer>
  </article>
</template>

<script setup>
defineProps({
  post: { type: Object, required: true },
  account: { type: Object, required: true },
  accountName: { type: String, required: true },
  title: { type: String, default: '' },
  body: { type: String, required: true },
  timeLabel: { type: String, required: true },
  truth: { type: Object, required: true },
  mediaEyebrow: { type: String, default: '' },
  read: { type: Boolean, default: false },
  bookmarked: { type: Boolean, default: false },
  openLabel: { type: String, required: true },
  bookmarkLabel: { type: String, required: true },
  commentLabel: { type: String, required: true },
  repostLabel: { type: String, required: true },
  commentCount: { type: String, required: true },
  repostCount: { type: String, required: true },
  newLabel: { type: String, required: true },
})

defineEmits(['open', 'bookmark'])
</script>

<style scoped>
.ripple-post {
  position: relative;
  background: var(--ripple-panel);
  border: 1px solid var(--ripple-line);
  border-radius: 22px;
  overflow: hidden;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.ripple-post::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: transparent;
}

.ripple-post.is-unread::before { background: var(--ripple-accent); }

.ripple-post:hover {
  border-color: var(--ripple-line-strong);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--ripple-ink) 9%, transparent);
  transform: translateY(-1px);
}

.ripple-post__open {
  width: 100%;
  padding: 18px 18px 10px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 13px;
  color: inherit;
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}

.ripple-avatar {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 16px 16px 16px 6px;
  font: 800 17px/1 Georgia, 'Noto Serif SC', serif;
  color: #fff;
  background: #26313c;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18);
}

.ripple-avatar.tone-vermilion { background: #e44a57; }
.ripple-avatar.tone-ink { background: #1c2832; }
.ripple-avatar.tone-blue { background: #2876a8; }
.ripple-avatar.tone-violet { background: #7557b7; }
.ripple-avatar.tone-slate { background: #59636d; }
.ripple-avatar.tone-coral { background: #f06462; }

.ripple-post__content { min-width: 0; display: grid; gap: 9px; }

.ripple-post__byline {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ripple-muted);
  font-size: 12px;
}

.ripple-post__byline strong {
  color: var(--ripple-ink);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ripple-post__byline .fa-circle-check { color: var(--ripple-accent); font-size: 12px; }
.ripple-post__byline span:first-of-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ripple-truth {
  justify-self: start;
  max-width: 100%;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 9px;
  color: var(--ripple-truth-ink);
  background: var(--ripple-truth-bg);
  font-size: 11px;
  line-height: 1.35;
}

.ripple-truth strong { white-space: nowrap; }
.ripple-truth span { min-width: 0; overflow-wrap: anywhere; }
.ripple-truth.is-unverified { --ripple-truth-bg: var(--ripple-warning-bg); --ripple-truth-ink: var(--ripple-warning-ink); }
.ripple-truth.is-corrected { --ripple-truth-bg: var(--ripple-corrected-bg); --ripple-truth-ink: var(--ripple-corrected-ink); }
.ripple-truth.is-source-unavailable { --ripple-truth-bg: var(--ripple-neutral-bg); --ripple-truth-ink: var(--ripple-neutral-ink); }

.ripple-post__title {
  font: 760 17px/1.35 Georgia, 'Noto Serif SC', serif;
  letter-spacing: -.01em;
  overflow-wrap: anywhere;
}

.ripple-post__body {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--ripple-copy);
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.ripple-media {
  position: relative;
  min-height: 120px;
  display: grid;
  align-content: space-between;
  padding: 14px;
  overflow: hidden;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #ff876c, #da3e63 58%, #562a56);
}

.ripple-media::before,
.ripple-media::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, .28);
}

.ripple-media::before { width: 190px; height: 190px; right: -52px; top: -95px; }
.ripple-media::after { width: 110px; height: 110px; right: 22px; bottom: -74px; }
.ripple-media.tone-cloud { background: linear-gradient(145deg, #8ca7b7, #587181 52%, #283b4b); }
.ripple-media.tone-river { background: linear-gradient(135deg, #24566e, #438f99 52%, #d4a05e); }
.ripple-media.tone-mint { background: linear-gradient(135deg, #267a71, #4caa8a 58%, #d5bc6b); }
.ripple-media.tone-night { background: linear-gradient(135deg, #172a42, #36455f 50%, #cb5d6d); }
.ripple-media small { position: relative; z-index: 1; font-weight: 800; letter-spacing: .16em; }
.ripple-media strong { position: relative; z-index: 1; font: 800 30px/1 Georgia, serif; }
.ripple-media__line { position: absolute; left: 14px; bottom: 47px; width: 34px; height: 3px; background: #fff; }

.ripple-post__footer {
  min-height: 44px;
  padding: 0 14px 10px 77px;
  display: flex;
  align-items: center;
  gap: 18px;
  color: var(--ripple-muted);
}

.ripple-post__metric { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.ripple-post__action { margin-left: auto; width: 40px; height: 40px; border: 0; border-radius: 12px; color: var(--ripple-muted); background: transparent; cursor: pointer; }
.ripple-post__action:hover { background: var(--ripple-soft); }
.ripple-post__action.is-active { color: var(--ripple-accent-ink); background: var(--ripple-accent-soft); }
.ripple-post__new { padding: 4px 7px; border-radius: 999px; color: var(--ripple-accent-ink); background: var(--ripple-accent-soft); font-size: 10px; font-weight: 800; }

button:focus-visible { outline: 3px solid var(--ripple-focus); outline-offset: 2px; }

@media (max-width: 560px) {
  .ripple-post { border-radius: 0; border-inline: 0; }
  .ripple-post:hover { transform: none; box-shadow: none; }
  .ripple-post__open { padding: 15px 14px 8px; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; }
  .ripple-avatar { width: 42px; height: 42px; border-radius: 14px 14px 14px 5px; }
  .ripple-post__footer { padding-left: 66px; }
  .ripple-truth { grid-template-columns: auto auto; }
  .ripple-truth span { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .ripple-post { transition: none; }
}
</style>
