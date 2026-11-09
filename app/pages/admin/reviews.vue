<script setup lang="ts">
import type { AdminPropertyListItem } from '#shared/admin-property'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '新鮮度審查｜Madori', robots: 'noindex, nofollow' })
const { data: queue, error, status, refresh } = await useFetch<AdminPropertyListItem[]>('/api/admin/properties', { query: { review: 'due' } })
</script>

<template>
  <AdminDashboardShell title="新鮮度審查" sidebar-id="admin-reviews" panel-id="reviews">
    <div class="max-w-4xl space-y-6">
      <div>
        <h2 class="text-2xl font-semibold">
          確認物件仍可出售
        </h2>
        <p class="mt-3 text-muted">
          這裡僅列出您公司的已發布物件，且下次更新日已到期。日期以東京時間計算。請逐件確認價格、資料與出售狀態，再更新下次更新日。無法出售的物件請撤下。
        </p>
      </div>
      <UAlert v-if="error" color="error" title="無法載入審查清單。請重試。">
        <template #actions>
          <UButton variant="outline" @click="refresh()">
            重試
          </UButton>
        </template>
      </UAlert>
      <USkeleton v-else-if="status === 'pending'" class="h-40" />
      <UEmpty v-else-if="!queue?.length" icon="i-lucide-circle-check" title="沒有到期物件" description="已發布物件到期後會顯示於此。" />
      <ul v-else class="divide-y divide-default border-y border-default">
        <li v-for="property in queue" :key="property.id" class="flex flex-wrap items-center justify-between gap-4 py-5">
          <div class="min-w-0">
            <p class="font-semibold">
              {{ property.titleZhTw }}
            </p>
            <p class="mt-1 break-all text-sm text-muted">
              {{ property.propertyNumber }} · 應審查日期 {{ property.nextUpdateOn }}
            </p>
          </div>
          <UButton :to="`/admin/properties/${property.id}`" class="min-h-11" variant="outline">
            審查與更新
          </UButton>
        </li>
      </ul>
    </div>
  </AdminDashboardShell>
</template>
