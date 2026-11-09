<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
const { user, clear } = useUserSession()
useSavedProperties()
const signingOut = ref(false)
const signOutError = ref('')
const items = [
  { label: '帳號總覽', icon: 'i-lucide-user-round', to: '/buyer', exact: true },
  { label: '我的收藏', icon: 'i-lucide-heart', to: '/buyer/saved' },
  { label: '諮詢紀錄', icon: 'i-lucide-mail', to: '/buyer/inquiries' },
]
const mobileItems = items.map(({ label, to, exact }) => ({ label, to, exact }))

async function logout() {
  if (signingOut.value)
    return
  signingOut.value = true
  try {
    await clear()
    await navigateTo('/')
  }
  catch {
    signOutError.value = '登出失敗。請重試。'
  }
  finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <header class="border-b border-default bg-elevated">
      <UContainer class="flex min-h-20 items-center justify-between gap-4 py-4">
        <NuxtLink to="/buyer" aria-label="Madori 買方帳號總覽" class="text-2xl font-semibold tracking-tight text-primary">
          madori<span class="ml-3 text-sm font-normal text-muted">買方帳號</span>
        </NuxtLink>
        <UButton to="/search" color="neutral" variant="ghost" icon="i-lucide-arrow-up-right" class="min-h-11 shrink-0">
          探索物件
        </UButton>
      </UContainer>
    </header>
    <UContainer class="grid gap-8 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <aside class="min-w-0 space-y-5">
        <div class="hidden border-b border-default pb-5 lg:block">
          <p class="break-words font-semibold text-highlighted">
            {{ user?.name }}
          </p>
          <p class="mt-2 break-all text-sm text-muted">
            {{ user?.email }}
          </p>
        </div>
        <nav aria-label="買方帳號導覽">
          <UNavigationMenu :items="items" orientation="vertical" :ui="{ link: 'min-h-11' }" class="hidden lg:block" />
          <UNavigationMenu :items="mobileItems" :ui="{ link: 'min-h-11', list: 'flex-wrap' }" class="lg:hidden" />
        </nav>
        <div class="hidden lg:block">
          <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" :loading="signingOut" class="min-h-11" @click="logout">
            登出
          </UButton>
        </div>
      </aside>
      <main class="min-w-0">
        <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold text-highlighted">
              {{ title }}
            </h1>
            <p v-if="description" class="mt-3 max-w-2xl leading-relaxed text-muted">
              {{ description }}
            </p>
          </div>
          <slot name="actions" />
        </div>
        <UAlert v-if="signOutError" color="error" variant="subtle" :title="signOutError" class="mb-6" />
        <slot />
        <div class="mt-10 border-t border-default pt-5 lg:hidden">
          <p class="break-all text-sm text-muted">
            {{ user?.email }}
          </p>
          <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" :loading="signingOut" class="mt-2 min-h-11" @click="logout">
            登出
          </UButton>
        </div>
      </main>
    </UContainer>
  </div>
</template>
