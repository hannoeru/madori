<script setup lang="ts">
import type { NuxtError } from '#app'
import { zh_tw } from '@nuxt/ui/locale'

const { error } = defineProps<{ error: NuxtError }>()
const notFound = computed(() => error.statusCode === 404)
useHead({ htmlAttrs: { lang: 'zh-Hant' }, title: `${notFound.value ? '找不到此頁面' : '目前無法載入'}｜Madori` })
</script>

<template>
  <UApp :locale="zh_tw">
    <main id="main-content" class="plan-grid flex min-h-screen items-center justify-center px-6">
      <div class="max-w-lg bg-default p-10">
        <h1 class="site-heading text-3xl">
          {{ notFound ? '這間物件已不在網站上' : '目前無法載入此頁面' }}
        </h1>
        <p class="mt-4 text-muted">
          {{ notFound ? '物件可能已售出，或連結已變更。' : '請重新整理，或稍後再試。' }}
        </p>
        <UButton size="lg" class="mt-8" @click="clearError({ redirect: '/' })">
          查看目前物件
        </UButton>
      </div>
    </main>
  </UApp>
</template>
