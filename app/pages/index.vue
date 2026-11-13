<script setup lang="ts">
import type { PropertySummary } from '#shared/property'

const { agent } = useAppConfig()
const route = useRoute()
const router = useRouter()
const { data: properties, error, status, refresh } = await useFetch<PropertySummary[]>('/api/properties')

const origin = useRequestURL().origin
useSeoMeta({
  title: '瑞哥看房｜東京購屋，用中文看懂',
  description: '東京23區的公寓與獨棟住宅，用繁體中文看懂價格、格局與每月費用，直接用 LINE 詢問房仲。',
  ogImage: () => properties.value?.[0]?.coverImageId ? `${origin}/api/property-images/${properties.value[0].coverImageId}` : undefined,
})

function queryFilter(key: string, fallback = 'all') {
  return computed({
    get: () => typeof route.query[key] === 'string' ? route.query[key] : fallback,
    set: value => router.replace({ query: { ...route.query, [key]: value === fallback ? undefined : value } }),
  })
}

const ward = queryFilter('ward')
const propertyType = queryFilter('type')
const budget = queryFilter('budget')
const sort = queryFilter('sort', 'newest')

const wardOptions = computed(() => [
  { label: '全部區域', value: 'all' },
  ...[...new Set(properties.value?.map(property => property.ward))].map(value => ({ label: value, value })),
])
const typeOptions = [{ label: '全部類型', value: 'all' }, { label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const budgetOptions = [{ label: '不限預算', value: 'all' }, { label: '5,000萬日圓以下', value: '50000000' }, { label: '8,000萬日圓以下', value: '80000000' }, { label: '1億日圓以下', value: '100000000' }]
const sortOptions = [{ label: '最新物件', value: 'newest' }, { label: '價格由低到高', value: 'price_asc' }, { label: '價格由高到低', value: 'price_desc' }]

const results = computed(() => {
  const matches = (properties.value ?? []).filter(property =>
    (ward.value === 'all' || property.ward === ward.value)
    && (propertyType.value === 'all' || property.propertyType === propertyType.value)
    && (budget.value === 'all' || property.priceYen <= Number(budget.value)))
  if (sort.value === 'price_asc')
    return matches.toSorted((a, b) => a.priceYen - b.priceYen)
  if (sort.value === 'price_desc')
    return matches.toSorted((a, b) => b.priceYen - a.priceYen)
  return matches
})

function clearFilters() {
  return router.replace({ query: {} })
}

const steps = [
  { title: '傳 LINE 告訴我條件', description: '預算、想住的區域、自住或投資都可以先聊。' },
  { title: '確認物件與完整費用', description: '我會確認物件現況，用中文說明每月費用與購屋成本。' },
  { title: '安排看屋', description: '可以來東京實地看屋，也可以先用視訊看。' },
]
</script>

<template>
  <div>
    <SiteHeader />
    <main id="main-content">
      <section class="plan-grid" aria-labelledby="home-title">
        <UContainer class="grid items-center gap-10 py-12 lg:grid-cols-[1fr_1.05fr] lg:py-20">
          <div>
            <h1 id="home-title" class="site-heading text-4xl leading-snug sm:text-6xl sm:leading-tight">
              東京的家，<br>用中文看懂。
            </h1>
            <p class="mt-6 max-w-md text-lg text-toned">
              {{ agent.intro }}
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <UButton to="#listings" size="lg">
                看目前物件
              </UButton>
              <LineButton />
            </div>
          </div>
          <FloorPlanDrawing class="hidden sm:block" />
        </UContainer>
      </section>

      <UContainer>
        <section id="listings" class="scroll-mt-6 pt-14" aria-labelledby="listings-title">
          <h2 id="listings-title" class="site-heading text-3xl">
            目前物件
          </h2>
          <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <UFormField label="區域">
              <USelect v-model="ward" :items="wardOptions" class="w-full" />
            </UFormField>
            <UFormField label="類型">
              <USelect v-model="propertyType" :items="typeOptions" class="w-full" />
            </UFormField>
            <UFormField label="預算">
              <USelect v-model="budget" :items="budgetOptions" class="w-full" />
            </UFormField>
            <UFormField label="排序">
              <USelect v-model="sort" :items="sortOptions" class="w-full" />
            </UFormField>
          </div>

          <UAlert v-if="error" class="mt-8" color="error" title="無法載入物件" description="請檢查網路連線後重試。" :actions="[{ label: '重試', onClick: () => { refresh() } }]" />
          <div v-else-if="status === 'pending'" class="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" aria-label="正在載入物件">
            <USkeleton v-for="i in 3" :key="i" class="aspect-[4/3]" />
          </div>
          <div v-else-if="results.length" class="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            <PropertyCard v-for="property in results" :key="property.id" :property="property" />
          </div>
          <div v-else-if="properties?.length" class="mt-8 bg-elevated p-8">
            <p class="font-medium">
              沒有符合條件的物件。
            </p>
            <p class="mt-1 text-muted">
              放寬條件，或傳 LINE 告訴我你的需求。
            </p>
            <UButton class="mt-4" variant="outline" @click="clearFilters">
              清除條件
            </UButton>
          </div>
          <div v-else class="mt-8 bg-elevated p-8">
            <p class="font-medium">
              新物件整理中。
            </p>
            <p class="mt-1 text-muted">
              傳 LINE 告訴我你的預算和想住的區域，我會直接提供合適的物件。
            </p>
            <LineButton class="mt-4" />
          </div>
        </section>

        <section class="mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="process-title">
          <div>
            <h2 id="process-title" class="site-heading text-3xl">
              從第一則訊息到看屋
            </h2>
            <p class="mt-4 text-muted">
              想先了解 LDK、坪數和管理費？請看<ULink to="/guide" class="text-primary underline underline-offset-4">
                購屋指南
              </ULink>。
            </p>
          </div>
          <ol class="grid gap-8 sm:grid-cols-3">
            <li v-for="(step, index) in steps" :key="step.title" class="border-t-2 border-primary pt-4">
              <p class="site-price text-primary">
                {{ index + 1 }}
              </p>
              <h3 class="mt-2 font-semibold text-highlighted">
                {{ step.title }}
              </h3>
              <p class="mt-2 text-sm text-muted">
                {{ step.description }}
              </p>
            </li>
          </ol>
        </section>
      </UContainer>
    </main>
    <SiteFooter />
  </div>
</template>
