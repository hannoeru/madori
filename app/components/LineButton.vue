<script setup lang="ts">
const { agent } = useAppConfig()
</script>

<template>
  <UButton :to="agent.lineUrl" target="_blank" rel="noopener noreferrer" size="lg" color="neutral" icon="i-simple-icons:line" class="justify-center bg-line font-semibold text-ai-950 hover:bg-line/85 active:bg-line/85">
    <slot>用 LINE 聯絡我</slot>
  </UButton>
</template>
