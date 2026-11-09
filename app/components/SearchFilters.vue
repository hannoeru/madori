<script setup lang="ts">
import type { PropertySearchForm } from '#shared/property'
import { propertyQuerySchema } from '#shared/property'
import { TOKYO_23_WARDS } from '#shared/tokyo'

const emit = defineEmits<{ apply: [], clear: [] }>()
const model = defineModel<PropertySearchForm>({ required: true })
const { data } = await useFetch('/api/stations')
const stationOpen = ref(false)
const types = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }] satisfies { label: string, value: PropertySearchForm['propertyType'] }[]
const buildStatuses = [{ label: '新成屋', value: 'new' }, { label: '中古屋', value: 'resale' }] satisfies { label: string, value: PropertySearchForm['buildStatus'] }[]
const lines = computed(() => data.value?.lines.map(line => ({ label: line.nameZhTw, value: line.id })) ?? [])
const stations = computed(() => data.value?.stations.filter(station => !model.value.lineId || station.lineId === model.value.lineId).map(station => ({ label: station.nameZhTw, value: station.id })) ?? [])
watch(() => model.value.lineId, () => {
  if (data.value && model.value.stationId && !stations.value.some(station => station.value === model.value.stationId))
    model.value.stationId = undefined
})
</script>

<template>
  <UForm :schema="propertyQuerySchema" :state="model" class="space-y-5" @submit="emit('apply')">
    <UFormField name="ward" label="東京23區">
      <USelect v-model="model.ward" :items="TOKYO_23_WARDS" placeholder="不限區域" class="w-full" size="lg" />
    </UFormField>
    <UFormField name="propertyType" label="物件類型">
      <USelect v-model="model.propertyType" :items="types" placeholder="全部住宅" class="w-full" size="lg" />
    </UFormField>
    <UFormField name="buildStatus" label="新成屋／中古屋">
      <USelect v-model="model.buildStatus" :items="buildStatuses" placeholder="不限" class="w-full" size="lg" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField name="minPrice" label="最低價格（日圓）">
        <UInput v-model="model.minPrice" inputmode="numeric" placeholder="不限" class="w-full" />
      </UFormField>
      <UFormField name="maxPrice" label="最高價格（日圓）">
        <UInput v-model="model.maxPrice" inputmode="numeric" placeholder="不限" class="w-full" />
      </UFormField>
    </div>
    <UFormField name="layout" label="格局">
      <USelect v-model="model.layout" :items="['1R', '1K', '1DK', '1LDK', '2LDK', '3LDK', '4LDK']" placeholder="不限格局" class="w-full" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField name="minFloorArea" label="最小面積（m²）">
        <UInput v-model="model.minFloorArea" inputmode="decimal" placeholder="不限" class="w-full" />
      </UFormField>
      <UFormField name="maxFloorArea" label="最大面積（m²）">
        <UInput v-model="model.maxFloorArea" inputmode="decimal" placeholder="不限" class="w-full" />
      </UFormField>
    </div>
    <p class="text-xs text-muted">
      公寓以專有面積篩選；獨棟住宅以土地面積篩選。1 坪約為 3.3058 m²。
    </p>
    <UFormField name="lineId" label="鐵路路線">
      <USelect v-model="model.lineId" :items="lines" placeholder="不限路線" class="w-full" />
    </UFormField>
    <UFormField name="stationId" label="車站">
      <USelectMenu v-model="model.stationId" v-model:open="stationOpen" v-bind="stationOpen ? {} : { 'aria-controls': undefined }" :items="stations" value-key="value" aria-label="車站" placeholder="搜尋車站" class="w-full" />
    </UFormField>
    <UFormField name="maxWalkingMinutes" label="步行時間上限（分鐘）">
      <UInput v-model="model.maxWalkingMinutes" inputmode="numeric" placeholder="例如 10" class="w-full" />
    </UFormField>
    <UFormField name="maxAgeYears" label="屋齡上限（年）">
      <UInput v-model="model.maxAgeYears" inputmode="numeric" placeholder="例如 20" class="w-full" />
    </UFormField>
    <div class="grid gap-3">
      <UButton type="submit" block size="lg" icon="i-lucide-search">
        套用條件
      </UButton><UButton color="neutral" variant="outline" block @click="emit('clear')">
        清除所有條件
      </UButton>
    </div>
  </UForm>
</template>
