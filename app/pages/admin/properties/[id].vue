<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '編輯物件｜瑞哥看房', robots: 'noindex, nofollow' })

const route = useRoute()
</script>

<template>
  <AdminShell>
    <AdminPropertyForm :key="String(route.params.id)" :property-id="String(route.params.id)" />
  </AdminShell>
</template>
