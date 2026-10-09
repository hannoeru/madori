<script setup lang="ts">
import type { AdminPropertyListItem } from '#shared/admin-property'

definePageMeta({ middleware: 'auth' })

useSeoMeta({ title: '所有物件｜Madori', robots: 'noindex, nofollow' })

const query = ref('')
const status = ref<'all' | AdminPropertyListItem['status']>('all')
const { data: properties } = await useFetch<AdminPropertyListItem[]>('/api/admin/properties', {
  query: computed(() => ({
    query: query.value || undefined,
    status: status.value === 'all' ? undefined : status.value,
  })),
})

const statusLabels = { draft: '草稿', published: '已發布', withdrawn: '已撤下' } as const
</script>

<template>
  <AdminDashboardShell title="所有物件" sidebar-id="admin-properties" panel-id="properties">
    <template #navbar-right>
      <UButton to="/admin/properties/new" icon="i-lucide-plus">
        新增物件
      </UButton>
    </template>

    <div class="flex flex-wrap gap-3">
      <UInput v-model="query" class="min-w-64" icon="i-lucide-search" placeholder="搜尋編號或標題" />
      <USelect v-model="status" :items="[{ label: '全部狀態', value: 'all' }, { label: '草稿', value: 'draft' }, { label: '已發布', value: 'published' }, { label: '已撤下', value: 'withdrawn' }]" />
    </div>
    <UCard class="mt-6">
      <UEmpty v-if="!properties?.length" icon="i-lucide-house" title="沒有符合條件的物件" />
      <ul v-else class="divide-y divide-default">
        <li v-for="property in properties" :key="property.id" class="flex items-center justify-between gap-4 py-4">
          <div>
            <p class="font-medium">
              {{ property.titleZhTw }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ property.propertyNumber }} · {{ property.ward }} · 下次更新 {{ property.nextUpdateOn }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <UBadge :color="property.status === 'published' ? 'success' : property.status === 'draft' ? 'info' : 'neutral'">
              {{ statusLabels[property.status] }}
            </UBadge>
            <UButton :to="`/admin/properties/${property.id}`" color="neutral" variant="outline">
              編輯
            </UButton>
          </div>
        </li>
      </ul>
    </UCard>
  </AdminDashboardShell>
</template>
