<script setup lang="ts">
const name = ref('')
const email = ref('')
const license = ref('')
const lineUrl = ref('')
const sent = ref(false)
const error = ref('')
const devLink = ref('')

useSeoMeta({ title: '公司註冊｜Madori', robots: 'noindex, nofollow' })

async function submit(): Promise<void> {
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean, link?: string }>('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, license: license.value, lineUrl: lineUrl.value },
    })
    devLink.value = res.link ?? ''
    sent.value = true
  }
  catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '註冊失敗。'
  }
}
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-16">
      <UCard class="mx-auto max-w-md">
        <template #header>
          <h1 class="text-xl font-bold text-highlighted">
            公司註冊
          </h1>
        </template>
        <div v-if="sent" class="space-y-4">
          <p v-if="devLink" class="text-toned">
            開發模式下不會寄送電子郵件，請點擊下方連結登入：
          </p>
          <UButton v-if="devLink" :to="devLink" block color="primary" icon="i-lucide-zap">
            點此登入
          </UButton>
          <p v-else class="text-toned">
            已寄出登入連結，請到信箱點擊完成登入。
          </p>
          <UButton to="/login" block color="neutral" variant="outline">
            返回登入
          </UButton>
        </div>
        <div v-else class="grid gap-4">
          <UFormField label="公司名稱">
            <UInput v-model="name" autocomplete="organization" required />
          </UFormField>
          <UFormField label="電子郵件">
            <UInput v-model="email" type="email" autocomplete="email" required />
          </UFormField>
          <UFormField label="許可字號">
            <UInput v-model="license" required />
          </UFormField>
          <UFormField label="LINE 連結">
            <UInput v-model="lineUrl" type="url" placeholder="https://line.me/ti/p/…" required />
          </UFormField>
          <UAlert v-if="error" color="error" :title="error" />
          <UButton block icon="i-lucide-log-in" @click="submit">
            註冊
          </UButton>
          <p class="text-center text-sm text-muted">
            已有帳號？<NuxtLink to="/login" class="text-primary">
              登入
            </NuxtLink>
          </p>
        </div>
      </UCard>
    </UContainer>
  </main>
</template>
