<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, clear } = useUserSession()

async function logout(): Promise<void> {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

interface AdminProperty {
  id: string
  propertyNumber: string
  titleZhTw: string
  status: 'draft' | 'published' | 'withdrawn'
  ward: string
  nextUpdateOn: string
  updatedAt: string
}

const { data: properties } = await useFetch<AdminProperty[]>('/api/admin/properties')
const today = new Date().toISOString().slice(0, 10)
const freshnessQueue = computed(() => properties.value?.filter(property => property.status === 'published' && property.nextUpdateOn <= today) ?? [])

useSeoMeta({ title: '管理員｜Madori', robots: 'noindex, nofollow' })
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar id="admin" collapsible>
      <template #header>
        <NuxtLink to="/admin" class="text-xl font-bold text-primary">
          madori
        </NuxtLink>
      </template>
      <UNavigationMenu :items="[{ label: '總覽', icon: 'i-lucide-layout-dashboard', to: '/admin' }, { label: '所有物件', icon: 'i-lucide-house', to: '/admin/properties' }]" orientation="vertical" />
    </UDashboardSidebar>
    <UDashboardPanel id="admin-home">
      <template #header>
        <UDashboardNavbar title="管理總覽">
          <template #right>
            <span class="text-sm text-muted">{{ user?.name }}</span>
            <UButton color="neutral" variant="ghost" @click="logout">
              登出
            </UButton>
            <UButton to="/admin/properties/new" icon="i-lucide-plus">
              新增物件
            </UButton>
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UContainer class="py-6">
          <UAlert v-if="freshnessQueue.length" color="warning" icon="i-lucide-clock-alert" :title="`${freshnessQueue.length} 件已發布物件需要更新`" description="請確認資料後更新、撤下或維持發布。" /><div class="mt-6 grid gap-4 sm:grid-cols-3">
            <UCard>
              <p class="text-sm text-muted">
                已發布
              </p><p class="mt-2 text-3xl font-bold">
                {{ properties?.filter(property => property.status === 'published').length ?? 0 }}
              </p>
            </UCard><UCard>
              <p class="text-sm text-muted">
                草稿
              </p><p class="mt-2 text-3xl font-bold">
                {{ properties?.filter(property => property.status === 'draft').length ?? 0 }}
              </p>
            </UCard><UCard>
              <p class="text-sm text-muted">
                已撤下
              </p><p class="mt-2 text-3xl font-bold">
                {{ properties?.filter(property => property.status === 'withdrawn').length ?? 0 }}
              </p>
            </UCard>
          </div><UCard class="mt-6">
            <template #header>
              <h2 class="font-semibold">
                新鮮度佇列
              </h2>
            </template><UEmpty v-if="!freshnessQueue.length" icon="i-lucide-circle-check" title="沒有逾期物件" /><ul v-else class="divide-y divide-default">
              <li v-for="property in freshnessQueue" :key="property.id" class="flex items-center justify-between py-3">
                <div>
                  <p class="font-medium">
                    {{ property.titleZhTw }}
                  </p><p class="text-sm text-muted">
                    {{ property.propertyNumber }} · {{ property.nextUpdateOn }}
                  </p>
                </div><UButton :to="`/admin/properties/${property.id}`" color="neutral" variant="outline">
                  編輯
                </UButton>
              </li>
            </ul>
          </UCard>
        </UContainer>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
