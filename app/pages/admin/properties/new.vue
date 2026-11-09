<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '新增物件｜Madori', robots: 'noindex, nofollow' })
</script>

<template>
  <AdminShell>
    <AdminPropertyForm />
  </AdminShell>
</template>
