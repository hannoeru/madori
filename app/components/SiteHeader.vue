<template>
  <header class="border-b border-default bg-default">
    <UContainer class="flex h-16 items-center justify-between gap-4">
      <NuxtLink to="/" class="site-wordmark text-2xl text-primary" aria-label="瑞哥看房首頁">
        瑞哥看房
      </NuxtLink>
      <nav class="flex items-center gap-1 sm:gap-4" aria-label="主要導覽">
        <UButton to="/#listings" color="neutral" variant="ghost">
          物件
        </UButton>
        <UButton to="/guide" color="neutral" variant="ghost">
          購屋指南
        </UButton>
        <LineButton class="hidden sm:inline-flex" size="md">
          LINE 聯絡
        </LineButton>
      </nav>
    </UContainer>
  </header>
</template>
