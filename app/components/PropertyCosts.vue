<script setup lang="ts">
import type { PropertyDetail } from '#shared/property'

const { property } = defineProps<{ property: Pick<PropertyDetail, 'priceYen' | 'propertyType' | 'managementFeeYen' | 'repairReserveYen'> }>()
const monthlyTotal = computed(() => property.managementFeeYen !== null && property.repairReserveYen !== null ? property.managementFeeYen + property.repairReserveYen : null)
</script>

<template>
  <div>
    <p class="site-price text-4xl text-highlighted">
      {{ formatManPrice(property.priceYen) }}
    </p>
    <p class="mt-1 text-sm text-muted">
      {{ formatYen(property.priceYen) }}，不含其他購屋費用
    </p>
    <dl v-if="property.propertyType === 'condominium'" class="mt-5 space-y-2 border-t border-default pt-4 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          管理費／月
        </dt><dd>{{ property.managementFeeYen === null ? '請向我確認' : formatYen(property.managementFeeYen) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          修繕積立金／月
        </dt><dd>{{ property.repairReserveYen === null ? '請向我確認' : formatYen(property.repairReserveYen) }}</dd>
      </div>
      <div v-if="monthlyTotal !== null" class="flex justify-between gap-4 font-semibold">
        <dt>每月合計</dt><dd>{{ formatYen(monthlyTotal) }}</dd>
      </div>
    </dl>
  </div>
</template>
