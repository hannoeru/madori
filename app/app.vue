<script setup lang="ts">
import { zh_tw } from '@nuxt/ui/locale'

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#264566' },
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
})
</script>

<template>
  <UApp :locale="zh_tw">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtPage />
  </UApp>
</template>
