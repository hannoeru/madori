<script setup lang="ts">
defineProps<{
  title: string
  sidebarId: string
  panelId: string
}>()

const navItems = [
  { label: '總覽', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: '所有物件', icon: 'i-lucide-house', to: '/admin/properties' },
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
      <UNavigationMenu :items="navItems" orientation="vertical" />
    </UDashboardSidebar>
    <UDashboardPanel :id="panelId">
      <template #header>
        <UDashboardNavbar :title="title">
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
