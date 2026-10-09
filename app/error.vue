<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: '找不到頁面',
  description: '很抱歉，找不到此頁面。',
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
