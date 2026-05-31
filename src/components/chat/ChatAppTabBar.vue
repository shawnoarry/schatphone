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
  <nav class="border-t border-gray-200 bg-white px-2 py-1.5 grid grid-cols-5 gap-1">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="min-w-0 rounded-lg px-1.5 py-1 text-[10px] flex flex-col items-center justify-center gap-0.5 transition"
      :class="active === item.id ? 'text-gray-950 bg-yellow-50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'"
      :data-testid="`chat-app-tab-${item.id}`"
      @click="openItem(item)"
    >
      <i :class="item.icon" class="text-[15px] leading-none"></i>
      <span class="w-full truncate">{{ item.label }}</span>
    </button>
  </nav>
</template>
