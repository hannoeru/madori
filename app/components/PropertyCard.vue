<script setup lang="ts">
import type { PropertySummary } from '#shared/property'

const { property } = defineProps<{ property: PropertySummary }>()
const nearest = computed(() => property.transit[0])
</script>

<template>
  <article>
    <NuxtLink :to="`/properties/${property.id}`" class="group block">
      <div class="aspect-[4/3] overflow-hidden rounded-sm bg-muted">
        <img v-if="property.coverImageId" :src="`/api/property-images/${property.coverImageId}`" :alt="property.titleZhTw" loading="lazy" class="h-full w-full object-cover">
      </div>
      <p class="site-price mt-4 text-2xl text-highlighted">
        {{ formatManPrice(property.priceYen) }}
      </p>
      <h3 class="mt-1 line-clamp-2 font-medium text-highlighted decoration-2 underline-offset-4 group-hover:underline">
        {{ property.titleZhTw }}
      </h3>
      <dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <div>
          <dt class="sr-only">
            區域
          </dt><dd>{{ property.ward }}</dd>
        </div>
        <div>
          <dt class="sr-only">
            類型
          </dt><dd>{{ propertyTypeLabels[property.propertyType] }}</dd>
        </div>
        <div>
          <dt class="sr-only">
            格局
          </dt><dd>{{ property.layout }}</dd>
        </div>
        <div v-if="nearest">
          <dt class="sr-only">
            最近車站
          </dt><dd>{{ nearest.station }}站步行 {{ nearest.walkingMinutes }} 分</dd>
        </div>
      </dl>
    </NuxtLink>
  </article>
</template>
