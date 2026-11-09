<script setup lang="ts">
import type { PropertyDetail } from '#shared/property'

const { property } = defineProps<{ property: Pick<PropertyDetail, 'priceYen' | 'propertyType' | 'managementFeeYen' | 'repairReserveYen'> }>()
const monthlyCosts = computed(() => property.managementFeeYen !== null && property.repairReserveYen !== null ? property.managementFeeYen + property.repairReserveYen : null)
</script>

<template>
  <UCard>
    <p class="text-sm text-muted">
      物件價格
    </p>
    <p class="market-price mt-2 text-3xl font-semibold text-highlighted">
      {{ formatManPrice(property.priceYen) }}
    </p>
    <p class="mt-2 text-xs text-muted">
      {{ formatYen(property.priceYen) }}・不含其他購屋費用
    </p>
    <dl v-if="property.propertyType === 'condominium'" class="mt-6 space-y-3 border-t border-default pt-5 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          管理費／月
        </dt><dd>{{ property.managementFeeYen === null ? '未提供' : formatYen(property.managementFeeYen) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">
          修繕積立金／月
        </dt><dd>{{ property.repairReserveYen === null ? '未提供' : formatYen(property.repairReserveYen) }}</dd>
      </div>
      <div v-if="monthlyCosts !== null" class="flex justify-between gap-4 border-t border-default pt-3 font-semibold">
        <dt>上述月費合計</dt><dd>{{ formatYen(monthlyCosts) }}</dd>
      </div>
    </dl>
    <UButton to="/guide" variant="link" class="mt-4 px-0" trailing-icon="i-lucide-arrow-up-right">
      了解購屋與持有費用
    </UButton>
  </UCard>
</template>
