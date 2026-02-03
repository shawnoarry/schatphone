<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

defineProps({
  currentTime: {
    type: String,
    default: '',
  },
  currentDate: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const systemStore = useSystemStore()
const { notifications } = storeToRefs(systemStore)

const unlockPhone = () => {
  router.push('/home')
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col items-center pt-20 text-white backdrop-blur-sm bg-black/10"
    @click="unlockPhone"
  >
    <i class="fas fa-lock mb-2 opacity-80"></i>
    <div class="text-6xl font-thin mb-2">{{ currentTime }}</div>
    <div class="text-lg opacity-80">{{ currentDate }}</div>

    <div v-if="notifications.length > 0" class="mt-8 w-11/12 space-y-2">
      <div v-for="note in notifications" :key="note.id" class="glass rounded-xl p-3 flex items-start gap-3">
        <div class="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-black">
          <i :class="note.icon"></i>
        </div>
        <div>
          <div class="font-bold text-sm">{{ note.title }}</div>
          <div class="text-xs opacity-90">{{ note.content }}</div>
        </div>
      </div>
    </div>

    <div class="mt-auto mb-10 text-xs opacity-60 animate-pulse">点击屏幕解锁</div>
  </div>
</template>
