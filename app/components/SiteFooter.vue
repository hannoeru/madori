<script setup lang="ts">
const { agent } = useAppConfig()
</script>

<template>
  <footer class="mt-24 border-t border-default bg-elevated">
    <UContainer class="flex flex-wrap items-end justify-between gap-8 py-10">
      <div class="max-w-xl text-sm text-muted">
        <p class="font-semibold text-highlighted">
          {{ agent.company }}
        </p>
        <p class="mt-1">
          {{ agent.license }}
        </p>
        <p class="mt-4 text-xs">
          網站資訊僅供參考，實際條件與費用以正式文件為準。本網站不保證投資收益或居留資格。
        </p>
      </div>
      <ULink to="/login" class="text-xs text-muted underline underline-offset-4">
        管理登入
      </ULink>
    </UContainer>
  </footer>
</template>
