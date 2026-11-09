<script setup lang="ts">
import type { PropertySummary } from '#shared/property'

defineProps<{ property: PropertySummary }>()
const route = useRoute()
</script>

<template>
  <article class="group overflow-hidden rounded-md border border-default bg-elevated">
    <NuxtLink :to="{ path: `/properties/${property.id}`, query: route.path === '/search' ? { from: route.fullPath } : undefined }" class="block" :aria-label="`查看 ${property.titleZhTw}`">
      <div class="relative aspect-[4/3] overflow-hidden bg-muted">
        <img v-if="coverImageId(property.images)" :src="`/api/property-images/${coverImageId(property.images)}`" :alt="property.titleZhTw" loading="lazy" class="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105">
        <div v-else class="flex h-full flex-col items-center justify-center gap-3 text-muted">
          <UIcon name="i-lucide-house" class="size-12" />
          <span class="text-sm">尚未提供照片</span>
        </div>
        <UBadge color="neutral" variant="solid" class="absolute left-4 top-4">
          {{ property.propertyType === 'condominium' ? '公寓' : '獨棟住宅' }}
        </UBadge>
      </div>
      <div class="p-5">
        <p class="text-xs tracking-wider text-muted">
          東京・{{ property.ward }}
        </p>
        <h3 class="mt-2 line-clamp-2 min-h-14 text-lg font-semibold leading-relaxed text-highlighted group-hover:text-primary">
          {{ property.titleZhTw }}
        </h3>
        <p class="market-price mt-3 text-2xl font-semibold text-highlighted">
          {{ formatManPrice(property.priceYen) }}
        </p>
        <p class="mt-3 text-sm text-toned">
          {{ property.layout }} · {{ formatPropertyArea(property) }}
        </p>
        <p class="mt-2 flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-train-front" class="size-4 shrink-0" />
          {{ property.transitEntries[0] ? `${property.transitEntries[0].stationNameZhTw}站 步行${property.transitEntries[0].walkingMinutes}分鐘` : '交通資訊待確認' }}
        </p>
        <p class="mt-4 border-t border-default pt-3 text-xs text-muted">
          {{ formatBuiltOn(property.builtOn) }}・查看完整物件資訊
        </p>
      </div>
    </NuxtLink>
    <SavePropertyButton :property-id="property.id" class="px-5 pb-5" />
  </article>
</template>
