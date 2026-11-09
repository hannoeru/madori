<script setup lang="ts">
defineProps<{
  title: string
  sidebarId: string
  panelId: string
}>()

const navItems = [
  { label: '總覽', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: '所有物件', icon: 'i-lucide-house', to: '/admin/properties' },
  { label: '新鮮度審查', icon: 'i-lucide-calendar-clock', to: '/admin/reviews' },
  { label: '詢問收件匣', icon: 'i-lucide-inbox', to: '/admin/inquiries' },
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar :id="sidebarId" collapsible>
      <template #header>
        <NuxtLink to="/admin" class="text-xl font-bold text-primary">
          madori
        </NuxtLink>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navItems" orientation="vertical" />
      </template>
      <template #footer>
        <UButton to="/" color="neutral" variant="ghost" icon="i-lucide-arrow-up-right" class="min-h-11">
          返回公開網站
        </UButton>
      </template>
    </UDashboardSidebar>
    <UDashboardPanel :id="panelId" role="main">
      <template #header>
        <UDashboardNavbar :title="title">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <slot name="navbar-right" />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UContainer class="py-6">
          <slot />
        </UContainer>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
