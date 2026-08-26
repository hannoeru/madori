<script setup lang="ts">
import type { PropertyQuery, PropertySummary } from '../../shared/property'

const search = reactive<PropertyQuery>({})
const wards = ['千代田區', '中央區', '港區', '新宿區', '台東區', '目黑區']
const propertyTypes = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const buildStatuses = [{ label: '新成屋', value: 'new' }, { label: '中古', value: 'resale' }]
const { data: properties, refresh } = await useFetch<PropertySummary[]>('/api/properties', {
  query: computed(() => search),
})

useSeoMeta({ title: 'Madori｜東京23區房產搜尋', description: '以繁體中文搜尋東京23區的新成屋與中古公寓、獨棟住宅。' })

function formatYen(value: number): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}

function submitSearch(): void {
  void refresh()
}
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-6 sm:py-10">
      <header class="flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-primary">
          madori
        </NuxtLink><UButton to="/admin" color="neutral" variant="ghost">
          管理員
        </UButton>
      </header>
      <section class="max-w-3xl py-16 sm:py-24">
        <p class="text-sm font-semibold text-primary">
          TOKYO 23 WARDS
        </p><h1 class="mt-3 text-4xl font-bold tracking-tight text-highlighted sm:text-6xl">
          在東京，找到適合你的家。
        </h1><p class="mt-6 text-lg text-toned">
          以繁體中文比較新成屋與中古房產，取得清楚、完整的物件資訊。
        </p>
      </section>
      <section aria-labelledby="search-heading">
        <h2 id="search-heading" class="sr-only">
          搜尋條件
        </h2><UCard>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UFormField label="東京23區">
              <USelect v-model="search.ward" :items="wards" placeholder="選擇區域" clear />
            </UFormField>
            <UFormField label="物件類型">
              <USelect v-model="search.propertyType" :items="propertyTypes" placeholder="全部" clear />
            </UFormField>
            <UFormField label="新成屋 / 中古">
              <USelect v-model="search.buildStatus" :items="buildStatuses" placeholder="全部" clear />
            </UFormField>
            <UFormField label="格局">
              <UInput v-model="search.layout" placeholder="例如 2LDK" />
            </UFormField>
            <UFormField label="最低價格（日圓）">
              <UInput v-model="search.minPrice" type="number" />
            </UFormField>
            <UFormField label="最高價格（日圓）">
              <UInput v-model="search.maxPrice" type="number" />
            </UFormField>
            <UFormField label="最小面積（m²）">
              <UInput v-model="search.minFloorArea" type="number" />
            </UFormField>
            <UFormField label="最大面積（m²）">
              <UInput v-model="search.maxFloorArea" type="number" />
            </UFormField>
            <UFormField label="車站">
              <UInput v-model="search.station" placeholder="例如 淺草" />
            </UFormField>
            <UFormField label="最多步行時間（分鐘）">
              <UInput v-model="search.maxWalkingMinutes" type="number" />
            </UFormField>
            <UButton class="self-end" icon="i-lucide-search" @click="submitSearch">
              搜尋物件
            </UButton>
          </div>
        </UCard>
      </section>
      <section class="mt-16" aria-labelledby="properties-heading">
        <div class="flex items-baseline justify-between gap-4">
          <h2 id="properties-heading" class="text-2xl font-bold text-highlighted">
            精選物件
          </h2><span class="text-sm text-muted">{{ properties?.length ?? 0 }} 件</span>
        </div>
        <div v-if="properties?.length" class="mt-6 divide-y divide-default">
          <NuxtLink v-for="property in properties" :key="property.id" :to="`/properties/${property.id}`" class="grid gap-4 py-5 sm:grid-cols-[220px_1fr]">
            <div class="aspect-[4/3] rounded-lg bg-muted" aria-hidden="true" /><article>
              <p class="text-sm text-primary">
                {{ property.propertyType === 'condominium' ? '公寓' : '獨棟住宅' }}
              </p><h3 class="mt-1 text-xl font-semibold text-highlighted">
                {{ property.titleZhTw }}
              </h3><p class="mt-2 text-xl font-bold">
                {{ formatYen(property.priceYen) }}
              </p><p class="mt-2 text-sm text-toned">
                {{ property.ward }} · {{ property.layout }} · {{ property.floorAreaSqm }} m² · {{ property.builtOn }}
              </p><p v-if="property.transitEntries[0]" class="mt-2 text-sm text-muted">
                {{ property.transitEntries[0].stationNameZhTw }}站 步行{{ property.transitEntries[0].walkingMinutes }}分鐘
              </p>
            </article>
          </NuxtLink>
        </div>
        <UEmpty v-else class="mt-6" icon="i-lucide-house" title="目前沒有符合條件的物件" description="請調整搜尋條件後再試一次。" />
      </section>
    </UContainer>
  </main>
</template>
