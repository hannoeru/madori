<script setup lang="ts">
useSeoMeta({ title: '管理登入｜Madori', robots: 'noindex, nofollow' })

const { fetch: refreshSession, loggedIn } = useUserSession()
if (loggedIn.value)
  await navigateTo('/admin')

const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

async function login() {
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await refreshSession()
    await navigateTo('/admin')
  }
  catch (error) {
    errorMessage.value = requestErrorMessage(error, '無法登入，請重試。')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <main id="main-content" class="plan-grid flex min-h-screen items-center justify-center px-4">
    <form class="w-full max-w-sm space-y-5 bg-default p-8" @submit.prevent="login">
      <h1 class="site-heading text-2xl">
        管理登入
      </h1>
      <UFormField label="密碼" name="password" required>
        <UInput v-model="password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" role="alert" />
      <UButton type="submit" block size="lg" :loading="pending">
        登入
      </UButton>
      <ULink to="/" class="block text-center text-sm text-muted underline underline-offset-4">
        返回網站
      </ULink>
    </form>
  </main>
</template>
