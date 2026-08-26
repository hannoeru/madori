<script setup lang="ts">
interface Property {
  id: string
  slug: string
  titleZhTw: string
  priceYen: number
  ward: string
  layout: string
  floorAreaSqm: number
  builtOn: string
  propertyType: 'condominium' | 'detached_house'
  images: Array<{ id: string, isCover: boolean }>
  transitEntries: Array<{ id: string, stationNameZhTw: string, walkingMinutes: number }>
}

const selectedWard = ref<string>()
const wards = ['千代田區', '中央區', '港區', '新宿區', '台東區', '目黑區']
const requestUrl = computed(() => selectedWard.value ? `/api/properties?ward=${encodeURIComponent(selectedWard.value)}` : '/api/properties')
const { data: properties } = await useFetch<Property[]>(requestUrl)

useSeoMeta({
  title: 'Madori｜東京23區房產搜尋',
  description: '以繁體中文搜尋東京23區的新成屋與中古公寓、獨棟住宅。'
})

function formatYen(value: number): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-6 sm:py-10">
      <header class="flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-primary">madori</NuxtLink>
        <UButton to="/admin" color="neutral" variant="ghost">
          管理員
        </UButton>
      </header>

      <section class="max-w-3xl py-16 sm:py-24">
        <p class="text-sm font-semibold text-primary">
          TOKYO 23 WARDS
        </p>
        <h1 class="mt-3 text-4xl font-bold tracking-tight text-highlighted sm:text-6xl">
          在東京，找到適合你的家。
        </h1>
        <p class="mt-6 text-lg text-toned">
          以繁體中文比較新成屋與中古房產，取得清楚、完整的物件資訊。
        </p>
      </section>

      <section aria-labelledby="search-heading">
        <h2 id="search-heading" class="sr-only">
          搜尋條件
        </h2>
        <UCard>
          <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
            <UFormField label="東京23區">
              <USelect
                v-model="selectedWard"
                :items="wards"
                placeholder="選擇區域"
                clear
              />
            </UFormField>
            <UButton class="self-end" icon="i-lucide-search">
              搜尋物件
            </UButton>
          </div>
        </UCard>
      </section>

      <section class="mt-16" aria-labelledby="properties-heading">
        <div class="flex items-baseline justify-between gap-4">
          <h2 id="properties-heading" class="text-2xl font-bold text-highlighted">
            精選物件
          </h2>
          <span class="text-sm text-muted">{{ properties?.length ?? 0 }} 件</span>
        </div>
        <div v-if="properties?.length" class="mt-6 divide-y divide-default">
          <NuxtLink
            v-for="property in properties"
            :key="property.id"
            :to="`/properties/${property.slug}`"
            class="grid gap-4 py-5 sm:grid-cols-[220px_1fr]"
          >
            <div class="aspect-[4/3] rounded-lg bg-muted" aria-hidden="true" />
            <article>
              <p class="text-sm text-primary">{{ property.propertyType === 'condominium' ? '公寓' : '獨棟住宅' }}</p>
              <h3 class="mt-1 text-xl font-semibold text-highlighted">{{ property.titleZhTw }}</h3>
              <p class="mt-2 text-xl font-bold">{{ formatYen(property.priceYen) }}</p>
              <p class="mt-2 text-sm text-toned">{{ property.ward }} · {{ property.layout }} · {{ property.floorAreaSqm }} m² · {{ property.builtOn }}</p>
              <p v-if="property.transitEntries[0]" class="mt-2 text-sm text-muted">{{ property.transitEntries[0].stationNameZhTw }}站 步行{{ property.transitEntries[0].walkingMinutes }}分鐘</p>
            </article>
          </NuxtLink>
        </div>
        <UEmpty
          v-else
          class="mt-6"
          icon="i-lucide-house"
          title="目前沒有符合條件的物件"
          description="請調整搜尋條件後再試一次。"
        />
      </section>
    </UContainer>
  </main>
</template>
