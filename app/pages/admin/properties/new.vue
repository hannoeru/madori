<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: '新增物件｜瑞哥看房', robots: 'noindex, nofollow' })
</script>

<template>
  <AdminShell>
    <AdminPropertyForm />
  </AdminShell>
</template>
