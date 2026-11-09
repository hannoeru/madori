<script setup lang="ts">
import type { AccountRole, AuthResponse } from '#shared/account'
import { agencyRegistrationSchema, buyerRegistrationSchema, loginSchema } from '#shared/account'

const props = defineProps<{ role: AccountRole, mode: 'login' | 'register' }>()
const state = reactive({ role: props.role, name: '', email: '', license: '', lineUrl: '' })
const schema = computed(() => props.mode === 'login' ? loginSchema : props.role === 'agency' ? agencyRegistrationSchema : buyerRegistrationSchema)
const title = computed(() => `${props.role === 'agency' ? '房仲公司' : '買方'}${props.mode === 'login' ? '登入' : '註冊'}`)
const sent = ref(false)
const pending = ref(false)
const error = ref(useRoute().query.error ? '登入連結已失效，請重新取得連結。' : '')
const devLink = ref('')
const counterpart = computed(() => `${props.role === 'buyer' ? '/buyer' : ''}/${props.mode === 'login' ? 'register' : 'login'}`)

async function submit() {
  if (pending.value)
    return
  pending.value = true
  error.value = ''
  try {
    const result = await $fetch<AuthResponse>(`/api/auth/${props.mode}`, { method: 'POST', body: state })
    devLink.value = result.link ?? ''
    sent.value = true
  }
  catch (cause) {
    error.value = requestErrorMessage(cause, '目前無法完成操作。請稍後重試。')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-8 sm:py-16">
      <UButton to="/" color="neutral" variant="ghost" icon="i-lucide-arrow-left" class="mb-8">
        返回 Madori
      </UButton>
      <UCard class="mx-auto max-w-lg">
        <template #header>
          <p class="mb-2 text-sm text-primary">
            {{ role === 'agency' ? '刊登物件・管理諮詢' : '收藏物件・保留諮詢紀錄' }}
          </p>
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ title }}
          </h1>
        </template>
        <div v-if="sent" class="space-y-5" role="status">
          <p v-if="devLink" class="text-toned">
            本機開發模式不寄送郵件。請使用下方測試連結登入。
          </p>
          <p v-else class="text-toned">
            若此電子郵件有對應帳號，您將收到登入連結。請查看收件匣及垃圾郵件。
          </p>
          <UButton v-if="devLink" :to="devLink" block>
            使用測試連結登入
          </UButton>
          <UButton block variant="outline" color="neutral" @click="sent = false">
            返回表單
          </UButton>
        </div>
        <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="submit">
          <UFormField v-if="mode === 'register'" name="name" :label="role === 'agency' ? '公司名稱' : '您的姓名'" required>
            <UInput v-model="state.name" :autocomplete="role === 'agency' ? 'organization' : 'name'" class="w-full" />
          </UFormField>
          <UFormField name="email" label="電子郵件" description="使用一次性連結登入，不需要密碼。" required>
            <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
          </UFormField>
          <template v-if="mode === 'register' && role === 'agency'">
            <UFormField name="license" label="許可字號" description="請提供日本宅地建物取引業許可字號。" required>
              <UInput v-model="state.license" class="w-full" />
            </UFormField>
            <UFormField name="lineUrl" label="LINE 連結" description="使用 line.me 或 lin.ee 的 HTTPS 連結。" required>
              <UInput v-model="state.lineUrl" type="url" placeholder="https://line.me/ti/p/…" class="w-full" />
            </UFormField>
            <p class="text-sm text-muted">
              驗證電子郵件後即可刊登。許可字號由公司提供，Madori 不將註冊視為執照驗證。
            </p>
          </template>
          <UAlert v-if="error" color="error" :title="error" role="alert" />
          <UButton type="submit" :loading="pending" block size="lg" icon="i-lucide-mail">
            {{ mode === 'register' ? '建立帳號並取得登入連結' : '取得登入連結' }}
          </UButton>
          <p class="text-center text-sm text-muted">
            {{ mode === 'login' ? '還沒有帳號？' : '已有帳號？' }}
            <ULink :to="counterpart" class="text-primary underline underline-offset-4">
              {{ mode === 'login' ? '註冊' : '登入' }}
            </ULink>
          </p>
        </UForm>
        <template #footer>
          <ULink :to="role === 'buyer' ? '/login' : '/buyer/login'" class="text-sm text-muted">
            {{ role === 'buyer' ? '房仲公司請由此登入' : '尋找物件？使用買方帳號' }}
          </ULink>
        </template>
      </UCard>
    </UContainer>
  </main>
</template>
