<script setup lang="ts">
import type { AgencyInquiry, InquiryPage } from '#shared/inquiry'
import { inquiryNotificationLabels } from '#shared/inquiry'
import { requestErrorMessage } from '../../utils/request-error'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '諮詢收件匣｜Madori', robots: 'noindex, nofollow' })
const { user, loggedIn, ready } = useUserSession()
const agencyId = computed(() => ready.value && loggedIn.value && user.value?.role === 'agency' ? user.value.id : null)
const owner = shallowRef({ id: agencyId.value, epoch: 0 })
const page = ref(1)
const cachePrefix = computed(() => `agency-inquiries:${owner.value.id ?? 'guest'}:${owner.value.epoch}:`)
const fetchKey = computed(() => `${cachePrefix.value}${page.value}`)
const request = useRequestFetch()
const readingIds = ref<string[]>([])
const readError = ref('')
const acceptedReads = new Map<string, string>()
let active = true

function isCurrent(current: typeof owner.value) {
  return active && owner.value === current && current.id === agencyId.value
}

function clearInbox() {
  const prefix = cachePrefix.value
  clearNuxtData(key => key.startsWith(prefix))
}

watch(agencyId, (id) => {
  clearInbox()
  readingIds.value = []
  readError.value = ''
  acceptedReads.clear()
  page.value = 1
  owner.value = { id, epoch: owner.value.epoch + 1 }
}, { flush: 'sync' })

onBeforeUnmount(() => {
  active = false
  acceptedReads.clear()
  clearInbox()
})

const { data: response, status, error, refresh } = useAsyncData(fetchKey, async (_app, { signal }) => {
  const current = owner.value
  const requestedPage = page.value
  if (!current.id || !isCurrent(current))
    return null
  try {
    const history = await request<InquiryPage<AgencyInquiry>>('/api/admin/inquiries', { query: { page: requestedPage }, signal })
    if (!isCurrent(current))
      return null
    for (const inquiry of history.items)
      inquiry.readAt = acceptedReads.get(inquiry.id) ?? inquiry.readAt
    return { ownerId: current.id, epoch: current.epoch, history }
  }
  catch (error) {
    if (isCurrent(current))
      throw error
    return null
  }
}, { enabled: computed(() => !!agencyId.value) })

const data = computed(() => response.value?.ownerId === agencyId.value && response.value?.epoch === owner.value.epoch ? response.value.history : null)
const dateFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' })

async function markRead(inquiry: AgencyInquiry) {
  const current = owner.value
  const inbox = data.value
  if (!current.id || !isCurrent(current) || !inbox?.items.includes(inquiry) || inquiry.readAt || readingIds.value.includes(inquiry.id))
    return
  readingIds.value.push(inquiry.id)
  readError.value = ''
  try {
    const result = await $fetch(`/api/admin/inquiries/${inquiry.id}/read`, { method: 'PATCH' })
    if (isCurrent(current) && result.readAt) {
      acceptedReads.set(inquiry.id, result.readAt)
      const row = data.value?.items.find(row => row.id === inquiry.id)
      if (row)
        row.readAt = result.readAt
    }
  }
  catch (error) {
    if (isCurrent(current) && data.value === inbox)
      readError.value = requestErrorMessage(error, '無法更新閱讀狀態。請使用同一筆諮詢的「標示已讀」按鈕重試。')
  }
  finally {
    if (isCurrent(current))
      readingIds.value = readingIds.value.filter(id => id !== inquiry.id)
  }
}
</script>

<template>
  <AdminDashboardShell title="諮詢收件匣" sidebar-id="admin-inquiries-sidebar" panel-id="admin-inquiries-panel">
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-serif text-2xl font-semibold text-highlighted">
            買方諮詢
          </h2>
          <p class="mt-2 max-w-2xl text-muted">
            這裡只顯示提交時寄給貴公司的訊息。郵件通知失敗不會刪除諮詢，已讀狀態與郵件通知分開記錄。
          </p>
          <p v-if="data" class="mt-2 text-sm text-muted">
            共 {{ data.total }} 筆諮詢
          </p>
        </div>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="status === 'pending'" :disabled="!agencyId" class="min-h-11 self-start" @click="refresh()">
          重新整理
        </UButton>
      </div>
      <UAlert v-if="readError" role="alert" color="error" icon="i-lucide-circle-alert" :title="readError" />
      <UAlert v-if="!agencyId" role="status" color="neutral" title="請登入房仲公司帳號" description="登入後即可查看貴公司的諮詢收件匣。">
        <template #actions>
          <UButton to="/login" class="min-h-11">
            房仲公司登入
          </UButton>
        </template>
      </UAlert>
      <UAlert v-else-if="status === 'pending'" role="status" color="info" icon="i-lucide-loader-circle" title="正在讀取收件匣" />
      <UAlert v-else-if="error" role="alert" color="error" icon="i-lucide-circle-alert" title="無法讀取收件匣" description="請重新整理後重試。">
        <template #actions>
          <UButton color="error" variant="outline" class="min-h-11" @click="refresh()">
            重試
          </UButton>
        </template>
      </UAlert>
      <UAlert v-else-if="!data?.items.length" color="neutral" icon="i-lucide-inbox" title="目前沒有買方諮詢" description="買方對貴公司的公開物件提交諮詢後，訊息會保留在這裡。" />
      <ol v-else class="space-y-5" aria-label="公司諮詢收件匣">
        <li v-for="inquiry in data.items" :key="inquiry.id">
          <UCard>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm text-muted">
                  物件編號 {{ inquiry.propertyNumber }}
                </p>
                <h3 class="mt-1 break-words text-xl font-semibold text-highlighted">
                  {{ inquiry.propertyTitle }}
                </h3>
                <time :datetime="inquiry.createdAt" class="mt-2 block text-sm text-muted">
                  {{ dateFormat.format(new Date(inquiry.createdAt)) }}（台北時間）
                </time>
              </div>
              <UBadge :color="inquiry.readAt ? 'neutral' : 'primary'" variant="soft" class="self-start">
                {{ inquiry.readAt ? '已讀' : '未讀' }}
              </UBadge>
            </div>
            <dl class="mt-5 grid gap-3 border-y border-default py-4 sm:grid-cols-2">
              <div class="min-w-0">
                <dt class="text-sm text-muted">
                  買方名稱
                </dt>
                <dd class="mt-1 break-words font-medium text-default">
                  {{ inquiry.buyerName }}
                </dd>
              </div>
              <div class="min-w-0">
                <dt class="text-sm text-muted">
                  聯絡電子郵件
                </dt>
                <dd class="mt-1 break-all text-default">
                  {{ inquiry.buyerEmail }}
                </dd>
              </div>
            </dl>
            <p class="mt-5 whitespace-pre-wrap break-words text-default">
              {{ inquiry.message }}
            </p>
            <UAlert
              class="mt-5"
              :color="inquiry.notificationStatus === 'failed' ? 'warning' : 'neutral'"
              :title="inquiryNotificationLabels[inquiry.notificationStatus]"
              :description="inquiry.notificationStatus === 'failed' ? '郵件通知未成功，這筆諮詢仍在收件匣中。請直接使用買方提供的聯絡資料回覆。' : inquiry.notificationStatus === 'pending' ? '諮詢已儲存，郵件通知尚未完成。' : '郵件服務已接受通知。這不代表郵件已送達或已讀。'"
            />
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <UButton v-if="!inquiry.readAt" :loading="readingIds.includes(inquiry.id)" :disabled="readingIds.includes(inquiry.id)" class="min-h-11" @click="markRead(inquiry)">
                標示已讀
              </UButton>
              <p v-else class="text-sm text-muted">
                已讀時間：{{ dateFormat.format(new Date(inquiry.readAt)) }}
              </p>
              <UButton v-if="inquiry.propertyId" :to="`/admin/properties/${inquiry.propertyId}`" color="neutral" variant="outline" class="min-h-11">
                管理物件
              </UButton>
              <span v-else class="text-sm text-muted">物件目前未公開或已移除，保留提交時的名稱與編號。</span>
            </div>
          </UCard>
        </li>
      </ol>
      <UPagination v-if="data && data.total > data.pageSize" v-model:page="page" :total="data.total" :items-per-page="data.pageSize" :sibling-count="1" show-edges class="justify-center" />
    </div>
  </AdminDashboardShell>
</template>
