<script setup lang="ts">
definePageMeta({ middleware: 'buyer' })
useSeoMeta({ title: '我的收藏｜Madori', robots: 'noindex, nofollow' })
const { items, loading, loaded, loadError, busy, refresh } = useSavedProperties()
await refresh()

function savedOn(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'medium' }).format(new Date(value))
}
</script>

<template>
  <BuyerDashboardShell title="我的收藏" description="在這裡比較已收藏的物件。停止公開的物件不再顯示詳細資訊，但仍可移除。">
    <template #actions>
      <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" :disabled="busy" class="min-h-11" @click="refresh">
        重新載入
      </UButton>
    </template>
    <UAlert v-if="loadError" color="error" variant="subtle" icon="i-lucide-circle-alert" title="收藏載入失敗" :description="loadError" class="mb-6" />
    <div v-if="loading && !loaded" role="status" aria-label="正在載入收藏" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="index in 3" :key="index" class="h-96 w-full rounded-md" />
    </div>
    <div v-else-if="loaded && items.length === 0 && !loadError" class="border border-dashed border-default px-6 py-16 text-center">
      <UIcon name="i-lucide-heart" class="size-10 text-primary" />
      <h2 class="mt-5 text-xl font-semibold text-highlighted">
        還沒有收藏物件
      </h2>
      <p class="mt-3 leading-relaxed text-muted">
        在物件頁面按下「收藏物件」，就能在這裡找到。
      </p>
      <UButton to="/search" icon="i-lucide-search" class="mt-6 min-h-11">
        開始探索物件
      </UButton>
    </div>
    <template v-else-if="items.length">
      <p class="mb-5 text-sm text-muted" aria-live="polite">
        共 {{ items.length }} 筆收藏
      </p>
      <div class="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="item in items" :key="item.propertyId" class="min-w-0 space-y-3">
          <PropertyCard v-if="item.kind === 'available'" :property="item.property" />
          <UCard v-else>
            <div class="flex min-h-52 flex-col items-center justify-center text-center">
              <UIcon name="i-lucide-house" class="size-10 text-muted" />
              <UBadge color="neutral" variant="subtle" class="mt-5">
                目前無法查看
              </UBadge>
              <h2 class="mt-3 text-lg font-semibold text-highlighted">
                此物件已停止公開
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-muted">
                不再提供物件資訊。您可以移除此筆收藏。
              </p>
            </div>
          </UCard>
          <div class="space-y-3 px-1">
            <p class="text-sm text-muted">
              收藏於 <time :datetime="item.createdAt">{{ savedOn(item.createdAt) }}</time>
            </p>
            <SavePropertyButton :property-id="item.propertyId" />
          </div>
        </div>
      </div>
    </template>
  </BuyerDashboardShell>
</template>
