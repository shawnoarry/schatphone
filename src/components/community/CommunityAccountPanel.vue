<template>
  <section class="ripple-account" data-testid="community-account-panel">
    <button type="button" class="ripple-account__close" :aria-label="closeLabel" @click="$emit('close')">
      <i class="fas fa-xmark" aria-hidden="true"></i>
    </button>
    <span class="ripple-account__avatar" :class="`tone-${account.tone}`" aria-hidden="true">{{ account.avatar }}</span>
    <span class="ripple-account__kind">{{ kindLabel }}</span>
    <h2>{{ name }}</h2>
    <p class="ripple-account__handle">{{ account.handle }}</p>
    <p class="ripple-account__bio">{{ bio }}</p>
    <div class="ripple-account__numbers">
      <span><strong>{{ followerCount }}</strong>{{ followerLabel }}</span>
      <span><strong>{{ postCount }}</strong>{{ postLabel }}</span>
    </div>
    <button
      type="button"
      class="ripple-account__follow"
      :class="{ 'is-following': followed }"
      data-testid="community-account-follow"
      @click="$emit('toggle-follow', account.id)"
    >
      <i :class="followed ? 'fas fa-check' : 'fas fa-plus'" aria-hidden="true"></i>
      {{ followed ? followingLabel : followLabel }}
    </button>
  </section>
</template>

<script setup>
defineProps({
  account: { type: Object, required: true },
  name: { type: String, required: true },
  bio: { type: String, required: true },
  kindLabel: { type: String, required: true },
  followerCount: { type: String, required: true },
  postCount: { type: Number, required: true },
  followed: { type: Boolean, default: false },
  followerLabel: { type: String, required: true },
  postLabel: { type: String, required: true },
  followLabel: { type: String, required: true },
  followingLabel: { type: String, required: true },
  closeLabel: { type: String, required: true },
})
defineEmits(['close', 'toggle-follow'])
</script>

<style scoped>
.ripple-account { position: relative; padding: 30px 24px; display: flex; flex-direction: column; align-items: flex-start; color: var(--ripple-ink); }
.ripple-account__close { position: absolute; top: 14px; right: 14px; width: 42px; height: 42px; border: 0; border-radius: 14px; color: var(--ripple-muted); background: var(--ripple-soft); cursor: pointer; }
.ripple-account__avatar { width: 74px; height: 74px; display: grid; place-items: center; margin-bottom: 14px; border-radius: 25px 25px 25px 8px; color: #fff; background: #26313c; font: 800 27px/1 Georgia, serif; }
.ripple-account__avatar.tone-vermilion { background: #e44a57; }
.ripple-account__avatar.tone-ink { background: #1c2832; }
.ripple-account__avatar.tone-blue { background: #2876a8; }
.ripple-account__avatar.tone-violet { background: #7557b7; }
.ripple-account__avatar.tone-slate { background: #59636d; }
.ripple-account__avatar.tone-coral { background: #f06462; }
.ripple-account__kind { color: var(--ripple-accent-ink); font-size: 11px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
.ripple-account h2 { max-width: 100%; margin: 7px 0 1px; font: 800 27px/1.18 Georgia, 'Noto Serif SC', serif; overflow-wrap: anywhere; }
.ripple-account__handle { margin: 0; color: var(--ripple-muted); font-size: 13px; }
.ripple-account__bio { margin: 18px 0; color: var(--ripple-copy); font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.ripple-account__numbers { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
.ripple-account__numbers span { padding: 12px; border-radius: 14px; background: var(--ripple-soft); color: var(--ripple-muted); font-size: 11px; }
.ripple-account__numbers strong { display: block; color: var(--ripple-ink); font: 800 17px/1.3 Georgia, serif; }
.ripple-account__follow { width: 100%; min-height: 46px; border: 0; border-radius: 15px; color: #fff; background: var(--ripple-action); font-weight: 800; cursor: pointer; }
.ripple-account__follow.is-following { color: var(--ripple-accent-ink); background: var(--ripple-accent-soft); }
button:focus-visible { outline: 3px solid var(--ripple-focus); outline-offset: 2px; }
</style>
