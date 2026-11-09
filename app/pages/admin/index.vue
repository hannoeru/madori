<script setup lang="ts">
import type { AdminPropertyListItem } from '#shared/property'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '物件管理｜Madori', robots: 'noindex, nofollow' })

const { data: properties, error, refresh } = await useFetch<AdminPropertyListItem[]>('/api/admin/properties')
</script>

<template>
  <AdminShell>
    <div class="flex items-center justify-between gap-4">
      <h1 class="site-heading text-2xl">
        所有物件
      </h1>
      <UButton to="/admin/properties/new" icon="i-lucide-plus">
        新增物件
      </UButton>
    </div>

    <UAlert v-if="error" class="mt-6" color="error" title="無法載入物件清單" :actions="[{ label: '重試', onClick: () => { refresh() } }]" />
    <div v-else-if="!properties?.length" class="mt-6 bg-default p-10 text-center">
      <p class="font-medium">
        還沒有物件。
      </p>
      <p class="mt-1 text-sm text-muted">
        新增第一間物件，上傳照片後就能發布到網站。
      </p>
    </div>
    <ul v-else class="mt-6 divide-y divide-default bg-default">
      <li v-for="property in properties" :key="property.id">
        <NuxtLink :to="`/admin/properties/${property.id}`" class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted">
          <div class="min-w-0">
            <p class="font-medium text-highlighted">
              {{ property.titleZhTw }}
            </p>
            <p class="text-sm text-muted">
              {{ property.ward }}，{{ formatManPrice(property.priceYen) }}
            </p>
          </div>
          <UBadge :color="property.status === 'published' ? 'success' : 'neutral'" variant="subtle">
            {{ property.status === 'published' ? '已發布' : '草稿' }}
          </UBadge>
        </NuxtLink>
      </li>
    </ul>
  </AdminShell>
</template>
