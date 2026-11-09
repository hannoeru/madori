<script setup lang="ts">
import type { PropertyQuery, PropertySearchForm } from '#shared/property'
import * as v from 'valibot'
import { propertyQuerySchema } from '#shared/property'

const route = useRoute()
const form = ref<PropertySearchForm>({})
const filtersOpen = ref(false)
const keys = ['ward', 'propertyType', 'buildStatus', 'layout', 'minPrice', 'maxPrice', 'minFloorArea', 'maxFloorArea', 'lineId', 'stationId', 'maxAgeYears', 'maxWalkingMinutes', 'sort'] satisfies (keyof PropertyQuery)[]
const labels = { ward: '區域', propertyType: '類型', buildStatus: '屋況', layout: '格局', minPrice: '最低價格', maxPrice: '最高價格', minFloorArea: '最小面積', maxFloorArea: '最大面積', lineId: '路線', stationId: '車站', maxAgeYears: '屋齡上限', maxWalkingMinutes: '步行上限', sort: '排序' }
const sortOptions = [{ label: '最新刊登', value: 'newest' }, { label: '價格由低到高', value: 'price_asc' }, { label: '價格由高到低', value: 'price_desc' }, { label: '面積由大到小', value: 'area_desc' }] satisfies { label: string, value: PropertyQuery['sort'] }[]
watch(() => route.query, (query) => {
  const parsed = v.safeParse(propertyQuerySchema, query)
  if (!parsed.success) {
    form.value = {}
    return
  }
  const { page: _page, pageSize: _pageSize, minPrice, maxPrice, minFloorArea, maxFloorArea, maxAgeYears, maxWalkingMinutes, ...selection } = parsed.output
  form.value = {
    ...selection,
    minPrice: minPrice === undefined ? undefined : String(minPrice),
    maxPrice: maxPrice === undefined ? undefined : String(maxPrice),
    minFloorArea: minFloorArea === undefined ? undefined : String(minFloorArea),
    maxFloorArea: maxFloorArea === undefined ? undefined : String(maxFloorArea),
    maxAgeYears: maxAgeYears === undefined ? undefined : String(maxAgeYears),
    maxWalkingMinutes: maxWalkingMinutes === undefined ? undefined : String(maxWalkingMinutes),
  }
}, { immediate: true })
const { data, status, error, refresh } = await useFetch('/api/properties', { query: computed(() => route.query) })
const page = computed(() => data.value?.page ?? 1)
const activeFilters = computed(() => keys.filter(key => key !== 'sort' && typeof route.query[key] === 'string' && route.query[key] !== ''))
useSeoMeta({ title: '東京住宅搜尋｜Madori', description: '依區域、價格、格局、面積與車站搜尋東京23區的住宅。' })

async function apply() {
  filtersOpen.value = false
  const query = Object.fromEntries(Object.entries(form.value).filter(([, value]) => value !== undefined && value !== ''))
  await navigateTo({ path: '/search', query })
}

async function clear() {
  filtersOpen.value = false
  form.value = {}
  await navigateTo('/search')
}

async function remove(key: keyof PropertyQuery) {
  const query = { ...route.query }
  delete query[key]
  delete query.page
  await navigateTo({ path: '/search', query })
}

function changePage(value: number) {
  return navigateTo({ path: '/search', query: { ...route.query, page: String(value) } })
}
</script>

<template>
  <div>
    <MarketHeader />
    <main id="main-content">
      <UContainer class="py-8 sm:py-10">
        <UBreadcrumb :items="[{ label: '首頁', to: '/' }, { label: '探索物件' }]" />
        <div class="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="market-heading text-3xl sm:text-4xl">
              在東京，找到你的生活。
            </h1><p class="mt-3 text-muted">
              {{ status === 'pending' ? '正在載入搜尋結果…' : error ? '請修正條件或稍後重試' : `${data?.total ?? 0} 件公開物件・價格均為日圓` }}
            </p>
          </div>
          <UButton icon="i-lucide-sliders-horizontal" class="lg:hidden" variant="outline" @click="filtersOpen = true">
            篩選
          </UButton>
        </div>
        <div class="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside class="hidden h-fit rounded-md border border-default bg-elevated p-5 lg:block">
            <h2 class="mb-5 text-lg font-semibold">
              搜尋條件
            </h2><SearchFilters v-model="form" @apply="apply" @clear="clear" />
          </aside>
          <section aria-label="搜尋結果" class="min-w-0">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div class="flex flex-wrap gap-2">
                <UButton v-for="key in activeFilters" :key="key" size="xs" color="neutral" variant="soft" trailing-icon="i-lucide-x" :aria-label="`移除${labels[key]}條件`" @click="remove(key)">
                  {{ labels[key] }}
                </UButton><span v-if="!activeFilters.length" class="text-sm text-muted">全部東京23區</span>
              </div>
              <UFormField label="物件排序" class="w-48">
                <USelect v-model="form.sort" :items="sortOptions" placeholder="最新刊登" class="w-full" @update:model-value="apply" />
              </UFormField>
            </div>
            <div v-if="status === 'pending'" class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="正在載入搜尋結果">
              <USkeleton v-for="i in 6" :key="i" class="h-96" />
            </div>
            <UAlert v-else-if="error" color="error" title="無法完成搜尋" :description="requestErrorMessage(error, '請檢查條件後重試。')" :actions="[{ label: '重試', onClick: () => refresh() }, { label: '清除條件', onClick: clear }]" />
            <template v-else-if="data?.items.length">
              <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <PropertyCard v-for="property in data.items" :key="property.id" :property="property" />
              </div>
              <UPagination :page="page" :total="data.total" :items-per-page="data.pageSize" :ui="{ list: 'flex-wrap justify-center' }" class="mt-10 flex justify-center" aria-label="搜尋結果分頁" @update:page="changePage">
                <template #first>
                  <UButton icon="i-lucide-chevrons-left" color="neutral" variant="outline" aria-label="第一頁" />
                </template>
                <template #prev>
                  <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" aria-label="上一頁" />
                </template>
                <template #item="{ item }">
                  <UButton v-if="item.type === 'page'" :label="String(item.value)" :color="page === item.value ? 'primary' : 'neutral'" :variant="page === item.value ? 'solid' : 'outline'" :aria-label="`第 ${item.value} 頁`" :aria-current="page === item.value ? 'page' : undefined" square />
                </template>
                <template #next>
                  <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" aria-label="下一頁" />
                </template>
                <template #last>
                  <UButton icon="i-lucide-chevrons-right" color="neutral" variant="outline" aria-label="最後一頁" />
                </template>
              </UPagination>
            </template>
            <UEmpty v-else icon="i-lucide-search" title="目前沒有符合條件的物件" description="試著放寬價格、區域或步行時間，看看其他可能。" :actions="[{ label: '清除所有條件', onClick: clear }]" />
          </section>
        </div>
        <USlideover v-model:open="filtersOpen" title="搜尋條件" description="調整條件後按下套用，更新搜尋結果。">
          <template #body>
            <SearchFilters v-model="form" @apply="apply" @clear="clear" />
          </template>
        </USlideover>
      </UContainer>
    </main>
    <MarketFooter />
  </div>
</template>
