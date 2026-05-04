<script setup>
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl p-4" data-testid="settings-about-info-card">
    <p class="text-sm font-semibold">SchatPhone</p>
    <p class="text-xs text-gray-500 mt-1">{{ t('当前版本：1.2.0', 'Current version: 1.2.0') }}</p>
    <p class="text-xs text-gray-500 mt-1">{{ t('框架：Vue 3 + Vite + Pinia + Tailwind v4', 'Stack: Vue 3 + Vite + Pinia + Tailwind v4') }}</p>
  </div>
</template>
