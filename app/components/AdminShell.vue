<script setup lang="ts">
const { clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-elevated">
    <header class="border-b border-default bg-default">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <NuxtLink to="/admin" class="font-semibold text-primary">
          物件管理
        </NuxtLink>
        <div class="flex items-center gap-1">
          <UButton to="/" target="_blank" color="neutral" variant="ghost">
            查看網站
          </UButton>
          <UButton color="neutral" variant="ghost" @click="logout">
            登出
          </UButton>
        </div>
      </UContainer>
    </header>
    <main id="main-content">
      <UContainer class="py-8">
        <slot />
      </UContainer>
    </main>
  </div>
</template>
