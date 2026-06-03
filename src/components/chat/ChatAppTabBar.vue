<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../../composables/useI18n'

defineProps({
  active: {
    type: String,
    default: 'messages',
  },
})

const router = useRouter()
const { t } = useI18n()

const items = computed(() => [
  {
    id: 'messages',
    label: t('消息', 'Messages'),
    icon: 'fas fa-comment',
    route: { path: '/chat' },
  },
  {
    id: 'objects',
    label: t('对象', 'Objects'),
    icon: 'fas fa-user',
    route: { path: '/chat-contacts', query: { section: 'roles' } },
  },
  {
    id: 'groups',
    label: t('群聊', 'Groups'),
    icon: 'fas fa-comments',
    route: { path: '/chat-groups' },
  },
  {
    id: 'services',
    label: t('服务号', 'Services'),
    icon: 'fas fa-bullhorn',
    route: { path: '/chat-contacts', query: { section: 'service' } },
  },
  {
    id: 'me',
    label: t('我', 'Me'),
    icon: 'fas fa-user-circle',
    route: { path: '/chat-me' },
  },
])

const openItem = (item) => {
  if (!item?.route) return
  router.push(item.route)
}
</script>

<template>
  <nav class="chat-app-tabbar">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="chat-app-tabbar__item"
      :class="{ 'is-active': active === item.id }"
      :aria-current="active === item.id ? 'page' : undefined"
      :data-testid="`chat-app-tab-${item.id}`"
      @click="openItem(item)"
    >
      <span class="chat-app-tabbar__icon">
        <i :class="item.icon"></i>
      </span>
      <span class="chat-app-tabbar__label">{{ item.label }}</span>
    </button>
  </nav>
</template>
