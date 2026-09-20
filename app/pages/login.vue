<script setup lang="ts">
const email = ref('')
const sent = ref(false)
const error = ref('')

const route = useRoute()
const queryError = route.query.error
if (queryError === 'expired')
  error.value = '連結已失效，請重新登入。'
else if (queryError)
  error.value = '登入連結無效，請重新登入。'

useSeoMeta({ title: '公司登入｜Madori', robots: 'noindex, nofollow' })

async function submit(): Promise<void> {
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value } })
    sent.value = true
  }
  catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '登入失敗。'
  }
}
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-16">
      <UCard class="mx-auto max-w-md">
        <template #header>
          <h1 class="text-xl font-bold text-highlighted">
            公司登入
          </h1>
        </template>
        <div v-if="sent" class="space-y-4">
          <p class="text-toned">
            已寄出登入連結，請到信箱點擊完成登入。
          </p>
        </div>
        <div v-else class="grid gap-4">
          <UFormField label="電子郵件">
            <UInput v-model="email" type="email" autocomplete="email" required />
          </UFormField>
          <UAlert v-if="error" color="error" :title="error" />
          <UButton block icon="i-lucide-mail-check" @click="submit">
            取得登入連結
          </UButton>
          <p class="text-center text-sm text-muted">
            還沒有帳號？<NuxtLink to="/register" class="text-primary">
              註冊
            </NuxtLink>
          </p>
        </div>
      </UCard>
    </UContainer>
  </main>
</template>
