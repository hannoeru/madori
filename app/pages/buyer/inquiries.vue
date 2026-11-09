<script setup lang="ts">
import type { BuyerInquiry, InquiryPage } from '#shared/inquiry'
import { inquiryNotificationDescriptions, inquiryNotificationLabels } from '#shared/inquiry'

definePageMeta({ middleware: 'buyer' })
useSeoMeta({ title: '諮詢紀錄｜Madori', robots: 'noindex, nofollow' })
const { user, loggedIn, ready } = useUserSession()
const buyerId = computed(() => ready.value && loggedIn.value && user.value?.role === 'buyer' ? user.value.id : null)
const owner = shallowRef({ id: buyerId.value, epoch: 0 })
const page = ref(1)
const cachePrefix = computed(() => `buyer-inquiries:${owner.value.id ?? 'guest'}:${owner.value.epoch}:`)
const fetchKey = computed(() => `${cachePrefix.value}${page.value}`)
const request = useRequestFetch()
let active = true

function isCurrent(current: typeof owner.value) {
  return active && owner.value === current && current.id === buyerId.value
}

function clearHistory() {
  const prefix = cachePrefix.value
  clearNuxtData(key => key.startsWith(prefix))
}

watch(buyerId, (id) => {
  clearHistory()
  page.value = 1
  owner.value = { id, epoch: owner.value.epoch + 1 }
}, { flush: 'sync' })

onBeforeUnmount(() => {
  active = false
  clearHistory()
})

const { data: response, status, error, refresh } = useAsyncData(fetchKey, async (_app, { signal }) => {
  const current = owner.value
  const requestedPage = page.value
  if (!current.id || !isCurrent(current))
    return null
  try {
    const history = await request<InquiryPage<BuyerInquiry>>('/api/buyer/inquiries', { query: { page: requestedPage }, signal })
    return isCurrent(current) ? { ownerId: current.id, epoch: current.epoch, history } : null
  }
  catch (error) {
    if (isCurrent(current))
      throw error
    return null
  }
}, { enabled: computed(() => !!buyerId.value) })

const data = computed(() => response.value?.ownerId === buyerId.value && response.value?.epoch === owner.value.epoch ? response.value.history : null)
const dateFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' })
</script>

<template>
  <BuyerDashboardShell title="諮詢紀錄" description="查看已儲存的訊息與房仲公司閱讀狀態。郵件通知失敗不會刪除諮詢。">
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">
          {{ data ? `共 ${data.total} 筆諮詢` : '您的物件諮詢' }}
        </p>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="status === 'pending'" :disabled="!buyerId" class="min-h-11" @click="refresh()">
          重新整理
        </UButton>
      </div>
      <UAlert v-if="!buyerId" role="status" color="neutral" title="請登入買方帳號" description="登入後即可查看您自己的諮詢紀錄。">
        <template #actions>
          <UButton to="/buyer/login" class="min-h-11">
            買方登入
          </UButton>
        </template>
      </UAlert>
      <UAlert v-else-if="status === 'pending'" role="status" color="info" icon="i-lucide-loader-circle" title="正在讀取諮詢紀錄" />
      <UAlert v-else-if="error" role="alert" color="error" icon="i-lucide-circle-alert" title="無法讀取諮詢紀錄" description="這不代表您的諮詢已刪除。請重新整理後重試。">
        <template #actions>
          <UButton color="error" variant="outline" class="min-h-11" @click="refresh()">
            重試
          </UButton>
        </template>
      </UAlert>
      <UAlert v-else-if="!data?.items.length" color="neutral" icon="i-lucide-message-square" title="目前沒有諮詢紀錄" description="在公開物件頁提交諮詢後，您可以在這裡查看訊息。">
        <template #actions>
          <UButton to="/search" class="min-h-11">
            探索物件
          </UButton>
        </template>
      </UAlert>
      <ol v-else class="space-y-5" aria-label="諮詢紀錄">
        <li v-for="inquiry in data.items" :key="inquiry.id">
          <UCard>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm text-muted">
                  物件編號 {{ inquiry.propertyNumber }}
                </p>
                <h2 class="mt-1 break-words text-xl font-semibold text-highlighted">
                  {{ inquiry.propertyTitle }}
                </h2>
                <p class="mt-2 break-words text-sm text-muted">
                  收件房仲公司：{{ inquiry.agencyName }}
                </p>
                <time :datetime="inquiry.createdAt" class="mt-1 block text-sm text-muted">
                  {{ dateFormat.format(new Date(inquiry.createdAt)) }}（台北時間）
                </time>
              </div>
              <UBadge :color="inquiry.readAt ? 'primary' : 'neutral'" variant="soft" class="self-start">
                {{ inquiry.readAt ? '房仲公司已讀' : '房仲公司未讀' }}
              </UBadge>
            </div>
            <p class="mt-5 whitespace-pre-wrap break-words text-default">
              {{ inquiry.message }}
            </p>
            <UAlert
              class="mt-5"
              :color="inquiry.notificationStatus === 'failed' ? 'warning' : 'neutral'"
              :title="inquiryNotificationLabels[inquiry.notificationStatus]"
              :description="inquiryNotificationDescriptions[inquiry.notificationStatus]"
            />
            <UButton v-if="inquiry.propertyId" :to="`/properties/${inquiry.propertyId}`" color="neutral" variant="outline" class="mt-4 min-h-11">
              查看目前公開物件
            </UButton>
            <p v-else class="mt-4 text-sm text-muted">
              物件目前未公開或已移除。上方保留您提交時的物件名稱與編號。
            </p>
          </UCard>
        </li>
      </ol>
      <UPagination v-if="data && data.total > data.pageSize" v-model:page="page" :total="data.total" :items-per-page="data.pageSize" :sibling-count="1" show-edges class="justify-center" />
    </div>
  </BuyerDashboardShell>
</template>
