<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'zh-Hant-TW' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#16a34a' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtPage />
  </UApp>
</template>
