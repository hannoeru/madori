<script setup lang="ts">
import type { InquirySubmissionResponse } from '#shared/inquiry'
import { inquiryFormSchema, inquiryNotificationDescriptions, inquiryNotificationLabels } from '#shared/inquiry'
import { requestErrorMessage } from '../utils/request-error'

const props = defineProps<{ propertyId: string, propertyTitle: string }>()
const { loggedIn, user, ready } = useUserSession()
const open = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const state = reactive({ message: '' })
const submissionKey = ref('')
const draftProperty = shallowRef<{ id: string, title: string } | null>(null)
const confirmed = shallowRef<InquirySubmissionResponse | null>(null)
const formId = `inquiry-${useId()}`
const buyerId = computed(() => ready.value && loggedIn.value && user.value?.role === 'buyer' ? user.value.id : null)
let operationEpoch = 0

watch(buyerId, () => {
  operationEpoch++
  open.value = false
  submitting.value = false
  state.message = ''
  draftProperty.value = null
  confirmed.value = null
  submissionKey.value = ''
  errorMessage.value = ''
}, { flush: 'sync' })

onBeforeUnmount(() => operationEpoch++)

function startInquiry() {
  if (!buyerId.value)
    return
  if (confirmed.value) {
    state.message = ''
    submissionKey.value = ''
    draftProperty.value = null
    confirmed.value = null
    errorMessage.value = ''
  }
  draftProperty.value ??= { id: props.propertyId, title: props.propertyTitle }
  open.value = true
}

async function submit() {
  if (!buyerId.value || submitting.value || confirmed.value || !draftProperty.value)
    return
  const epoch = ++operationEpoch
  submitting.value = true
  errorMessage.value = ''
  try {
    submissionKey.value ||= crypto.randomUUID()
    const result = await $fetch<InquirySubmissionResponse>('/api/buyer/inquiries', {
      method: 'POST',
      body: { propertyId: draftProperty.value.id, submissionKey: submissionKey.value, message: state.message },
    })
    if (epoch === operationEpoch)
      confirmed.value = result
  }
  catch (error) {
    if (epoch === operationEpoch)
      errorMessage.value = requestErrorMessage(error, '目前無法確認諮詢是否已儲存。您的內容已保留，請使用相同內容重試，或查看諮詢紀錄。')
  }
  finally {
    if (epoch === operationEpoch)
      submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <UButton v-if="!ready" disabled block size="lg" class="min-h-11">
      正在確認登入狀態
    </UButton>
    <template v-else-if="!loggedIn">
      <UButton to="/buyer/login" block size="lg" icon="i-lucide-mail" class="min-h-11">
        登入買方帳號後諮詢
      </UButton>
      <p class="text-sm text-muted">
        諮詢會保留在您的帳號紀錄中。
      </p>
    </template>
    <template v-else-if="user?.role === 'agency'">
      <UButton disabled block size="lg" class="min-h-11">
        房仲公司帳號無法提交諮詢
      </UButton>
      <p class="text-sm text-muted">
        如需諮詢物件，請使用買方帳號登入。
      </p>
    </template>
    <UButton v-else block size="lg" icon="i-lucide-mail" class="min-h-11" @click="startInquiry">
      {{ confirmed ? '新增諮詢' : '諮詢此物件' }}
    </UButton>

    <UModal v-model:open="open" title="諮詢物件" :description="draftProperty?.title ?? propertyTitle" :dismissible="!submitting" :close="!submitting" :ui="{ footer: 'flex-wrap justify-end' }">
      <template #body>
        <UAlert
          v-if="confirmed"
          role="status"
          :color="confirmed.notificationStatus === 'failed' ? 'warning' : 'success'"
          title="諮詢已儲存"
          :description="inquiryNotificationDescriptions[confirmed.notificationStatus]"
          icon="i-lucide-check-circle"
        />
        <UForm v-else :id="formId" :schema="inquiryFormSchema" :state="state" class="space-y-5" @submit="submit">
          <p class="break-words text-sm text-muted">
            將以 {{ user?.name }}（{{ user?.email }}）的聯絡資料提交給此物件的房仲公司。
          </p>
          <UFormField name="message" label="諮詢內容" description="請填寫看屋需求或物件問題，最多 2,000 字。" :hint="`${state.message.length} / 2,000`" required>
            <UTextarea v-model="state.message" :rows="6" :maxlength="2000" :disabled="submitting" class="w-full" />
          </UFormField>
          <UAlert v-if="submitting" role="status" title="正在儲存諮詢" description="請勿重複提交，儲存後會顯示通知狀態。" color="info" icon="i-lucide-loader-circle" />
          <UAlert v-if="errorMessage" role="alert" :title="errorMessage" description="重試不會建立重複諮詢。若上次請求的結果不明，請勿更改內容後重試。" color="error" icon="i-lucide-circle-alert" />
        </UForm>
      </template>
      <template #footer>
        <template v-if="confirmed">
          <span class="mr-auto text-sm text-muted">{{ inquiryNotificationLabels[confirmed.notificationStatus] }}</span>
          <UButton to="/buyer/inquiries" color="neutral" variant="outline" class="min-h-11">
            查看諮詢紀錄
          </UButton>
          <UButton class="min-h-11" @click="open = false">
            完成
          </UButton>
        </template>
        <template v-else>
          <UButton color="neutral" variant="outline" :disabled="submitting" class="min-h-11" @click="open = false">
            暫時關閉
          </UButton>
          <UButton type="submit" :form="formId" :loading="submitting" :disabled="submitting" class="min-h-11">
            {{ errorMessage ? '重試儲存' : '提交諮詢' }}
          </UButton>
        </template>
      </template>
    </UModal>
  </div>
</template>
