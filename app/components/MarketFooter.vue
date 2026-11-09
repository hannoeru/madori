<template>
  <footer class="mt-20 border-t border-default bg-muted">
    <UContainer class="grid gap-8 py-12 sm:grid-cols-[1fr_auto]">
      <div>
        <NuxtLink to="/" class="market-wordmark text-3xl text-highlighted">
          madori
        </NuxtLink>
        <p class="mt-3 max-w-xl text-sm text-muted">
          為台灣買方整理東京 23 區的住宅資訊。物件由各房仲公司刊登，實際條件與費用請向刊登公司確認。
        </p>
        <p class="mt-3 text-xs text-muted">
          Madori 提供物件資訊與諮詢管道，不代辦交易，也不保證投資收益或居留資格。
        </p>
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <ULink to="/search">
          探索物件
        </ULink>
        <ULink to="/guide">
          購屋指南
        </ULink>
        <ULink to="/register">
          房仲公司註冊
        </ULink>
      </div>
    </UContainer>
  </footer>
</template>
