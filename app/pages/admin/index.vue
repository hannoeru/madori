<script setup lang="ts">
import type { AdminPropertyListItem } from '#shared/admin-property'

definePageMeta({ middleware: 'auth' })

const { user, clear } = useUserSession()

async function logout(): Promise<void> {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

const { data: properties, error, refresh } = await useFetch<AdminPropertyListItem[]>('/api/admin/properties')
const { data: queue, error: queueError, refresh: refreshQueue } = await useFetch<AdminPropertyListItem[]>('/api/admin/properties', { query: { review: 'due' } })
const freshnessQueue = computed(() => queue.value ?? [])

useSeoMeta({ title: '公司後台｜Madori', robots: 'noindex, nofollow' })
</script>

<template>
  <AdminDashboardShell title="總覽" sidebar-id="admin" panel-id="admin-home">
    <template #navbar-right>
      <span class="text-sm text-muted">{{ user?.name }}</span>
      <UButton color="neutral" variant="ghost" @click="logout">
        登出
      </UButton>
      <UButton to="/admin/properties/new" icon="i-lucide-plus">
        新增物件
      </UButton>
    </template>

    <UAlert v-if="error || queueError" color="error" title="無法載入公司物件。">
      <template #actions>
        <UButton variant="outline" @click="refresh(); refreshQueue()">
          重試
        </UButton>
      </template>
    </UAlert>
    <UAlert v-if="freshnessQueue.length" color="warning" icon="i-lucide-clock-alert" :title="`${freshnessQueue.length} 件已發布物件需要更新`" description="請確認資料後更新、撤下或維持發布。" />
    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <UCard>
        <p class="text-sm text-muted">
          已發布
        </p>
        <p class="mt-2 text-3xl font-bold">
          {{ properties?.filter(property => property.status === 'published').length ?? 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          草稿
        </p>
        <p class="mt-2 text-3xl font-bold">
          {{ properties?.filter(property => property.status === 'draft').length ?? 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          已撤下
        </p>
        <p class="mt-2 text-3xl font-bold">
          {{ properties?.filter(property => property.status === 'withdrawn').length ?? 0 }}
        </p>
      </UCard>
    </div>
    <UCard class="mt-6">
      <template #header>
        <h2 class="font-semibold">
          新鮮度審查
        </h2>
      </template>
      <UButton to="/admin/reviews" variant="link" class="mb-3">
        查看審查清單
      </UButton>
      <UEmpty v-if="!queueError && !freshnessQueue.length" icon="i-lucide-circle-check" title="沒有逾期物件" />
      <ul v-else class="divide-y divide-default">
        <li v-for="property in freshnessQueue" :key="property.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium">
              {{ property.titleZhTw }}
            </p>
            <p class="text-sm text-muted">
              {{ property.propertyNumber }} · {{ property.nextUpdateOn }}
            </p>
          </div>
          <UButton :to="`/admin/properties/${property.id}`" color="neutral" variant="outline">
            編輯
          </UButton>
        </li>
      </ul>
    </UCard>
  </AdminDashboardShell>
</template>
