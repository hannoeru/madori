<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '編輯物件｜Madori', robots: 'noindex, nofollow' })

const route = useRoute()
const propertyId = String(route.params.id)
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-6 sm:py-10">
      <UButton to="/admin/properties" color="neutral" variant="ghost" icon="i-lucide-arrow-left">
        返回所有物件
      </UButton>
      <div class="mt-6 max-w-4xl">
        <AdminPropertyForm :property-id="propertyId" />
      </div>
    </UContainer>
  </main>
</template>
