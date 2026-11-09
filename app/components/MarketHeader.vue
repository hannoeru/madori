<script setup lang="ts">
const { user, clear } = useUserSession()
const mobileOpen = ref(false)
const isDev = import.meta.dev
const navigation = [
  { label: '探索物件', to: '/search' },
  { label: '購屋指南', to: '/guide' },
  { label: '我的收藏', to: '/buyer/saved' },
]

async function logout() {
  mobileOpen.value = false
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <div v-if="isDev" class="bg-primary px-4 py-1.5 text-center text-xs text-inverted">
    本機示範環境・物件僅供測試，不提供交易服務
  </div>
  <header class="border-b border-default bg-default">
    <UContainer class="flex h-16 items-center justify-between gap-6 sm:h-20">
      <NuxtLink to="/" class="flex items-baseline gap-3 text-highlighted" aria-label="Madori 首頁">
        <span class="market-wordmark text-4xl">madori</span>
        <span class="hidden text-xs tracking-widest sm:block">東京住まい</span>
      </NuxtLink>
      <UNavigationMenu :items="navigation" class="hidden lg:flex" />
      <div class="flex items-center gap-2">
        <UButton v-if="user" :to="user.role === 'agency' ? '/admin' : '/buyer'" variant="ghost" color="neutral" class="hidden sm:inline-flex" icon="i-lucide-user-round">
          我的帳號
        </UButton>
        <UButton v-else to="/buyer/login" color="neutral" variant="ghost" class="hidden sm:inline-flex">
          買方登入
        </UButton>
        <UButton to="/login" variant="outline" class="hidden lg:inline-flex">
          房仲入口
        </UButton>
        <UButton color="neutral" variant="ghost" icon="i-lucide-menu" aria-label="開啟導覽選單" class="lg:hidden" @click="mobileOpen = true" />
      </div>
    </UContainer>
    <USlideover v-model:open="mobileOpen" title="Madori 導覽" description="探索東京物件與管理您的帳號。">
      <template #body>
        <UNavigationMenu :items="navigation" orientation="vertical" @click="mobileOpen = false" />
        <div class="mt-8 grid gap-3">
          <UButton :to="user ? (user.role === 'agency' ? '/admin' : '/buyer') : '/buyer/login'" block @click="mobileOpen = false">
            {{ user ? '我的帳號' : '買方登入' }}
          </UButton>
          <UButton to="/login" variant="outline" block @click="mobileOpen = false">
            房仲入口
          </UButton>
          <UButton v-if="user" color="neutral" variant="ghost" block @click="logout">
            登出
          </UButton>
        </div>
      </template>
    </USlideover>
  </header>
</template>
