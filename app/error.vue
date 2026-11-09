<script setup lang="ts">
import type { NuxtError } from '#app'
import { zh_tw } from '@nuxt/ui/locale'

const { error } = defineProps<{ error: NuxtError }>()
useHead({ htmlAttrs: { lang: 'zh-Hant' }, title: `${error.statusCode === 404 ? '找不到此頁面' : '目前無法載入'}｜Madori` })
</script>

<template>
  <UApp :locale="zh_tw">
    <main id="main-content" class="flex min-h-screen items-center justify-center px-6">
      <div class="max-w-lg text-center">
        <NuxtLink to="/" class="market-wordmark text-4xl" @click.prevent="clearError({ redirect: '/' })">
          madori
        </NuxtLink>
        <p class="mt-10 text-sm tracking-wider text-muted">
          {{ error.statusCode }}
        </p>
        <h1 class="market-heading mt-3 text-3xl">
          {{ error.statusCode === 404 ? '找不到此頁面或物件' : '目前無法載入此頁面' }}
        </h1>
        <p class="mt-5 text-muted">
          {{ error.statusCode === 404 ? '物件可能已撤下，或連結已變更。您可以返回搜尋，查看目前公開的物件。' : '請稍後再試。您的收藏與已送出的詢問不會因此刪除。' }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <UButton size="lg" @click="clearError({ redirect: '/search' })">
            返回物件搜尋
          </UButton><UButton variant="outline" size="lg" @click="clearError({ redirect: '/' })">
            返回首頁
          </UButton>
        </div>
      </div>
    </main>
  </UApp>
</template>
