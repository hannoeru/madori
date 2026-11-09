<script setup lang="ts">
import { TOKYO_23_WARDS } from '#shared/tokyo'

const ward = ref<string>()
const budget = ref<string>()
const propertyType = ref<string>()
const budgets = [
  { label: '5,000 萬日圓', value: '50000000' },
  { label: '8,000 萬日圓', value: '80000000' },
  { label: '1 億日圓', value: '100000000' },
]
const types = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const { data, status, error, refresh } = await useFetch('/api/properties', { query: { pageSize: '3' } })

useSeoMeta({ title: 'Madori｜用熟悉的語言，找到東京的家', description: '以繁體中文探索東京23區的公寓與獨棟住宅。比較格局、面積、通勤與費用，聯絡刊登房仲公司。' })

function search() {
  return navigateTo({ path: '/search', query: { ward: ward.value, maxPrice: budget.value, propertyType: propertyType.value } })
}
</script>

<template>
  <div>
    <MarketHeader />
    <main id="main-content">
      <UContainer>
        <section class="grid gap-12 py-6 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:py-14" aria-labelledby="home-title">
          <div class="self-center">
            <p class="hidden text-xs tracking-[.25em] text-muted sm:block">
              A PLACE IN TOKYO. A LIFE OF YOUR OWN.
            </p>
            <h1 id="home-title" class="market-heading mt-3 text-3xl leading-normal text-highlighted sm:text-5xl lg:text-6xl">
              東京的下一站，<br><span class="text-primary">是你的日常。</span>
            </h1>
            <p class="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              <span class="sm:hidden">繁體中文，探索東京23區的住宅。</span>
              <span class="hidden sm:inline">用熟悉的語言，找到適合你的家。從街區、通勤到每月費用，把買房需要的資訊看清楚。</span>
            </p>
          </div>
          <TokyoScene class="hidden min-h-72 lg:block" />
        </section>
        <form class="grid grid-cols-2 gap-4 rounded-md border border-default bg-elevated p-5 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:p-6" @submit.prevent="search">
          <UFormField label="想住在哪裡？" class="col-span-2 lg:col-span-1">
            <USelect v-model="ward" :items="TOKYO_23_WARDS" placeholder="東京23區・不限區域" class="w-full" size="lg" />
          </UFormField>
          <UFormField label="預算上限">
            <USelect v-model="budget" :items="budgets" placeholder="不限預算" class="w-full" size="lg" />
          </UFormField>
          <UFormField label="物件類型">
            <USelect v-model="propertyType" :items="types" placeholder="所有住宅" class="w-full" size="lg" />
          </UFormField>
          <UButton type="submit" size="lg" icon="i-lucide-search" class="col-span-2 justify-center self-end lg:col-span-1">
            搜尋物件
          </UButton>
        </form>
        <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
          <span>從生活開始</span>
          <ULink to="/search?maxWalkingMinutes=10" class="underline decoration-default underline-offset-4">
            車站步行10分鐘內
          </ULink>
          <ULink to="/search?layout=2LDK" class="underline decoration-default underline-offset-4">
            探索2LDK
          </ULink>
          <ULink to="/search?ward=目黑區" class="underline decoration-default underline-offset-4">
            探索目黑區
          </ULink>
        </div>
        <section class="mt-8 sm:mt-16" aria-labelledby="latest-title">
          <div class="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="latest-title" class="market-heading text-2xl text-highlighted sm:text-3xl">
              找到下一個家的可能
            </h2>
            <UButton to="/search" variant="link" trailing-icon="i-lucide-arrow-up-right">
              所有物件
            </UButton>
          </div>
          <div v-if="status === 'pending'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="正在載入物件">
            <USkeleton v-for="i in 3" :key="i" class="h-96" />
          </div>
          <UAlert v-else-if="error" title="目前無法載入物件" description="請稍後再試，不會影響您的搜尋條件。" color="error" :actions="[{ label: '重試', onClick: () => refresh() }]" />
          <div v-else-if="data?.items.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PropertyCard v-for="property in data.items" :key="property.id" :property="property" />
          </div>
          <UEmpty v-else icon="i-lucide-house" title="新的家，值得等待" description="目前尚無公開物件。您可以先了解東京購屋需要確認的資訊。" :actions="[{ label: '閱讀購屋指南', to: '/guide' }]" />
        </section>
        <section class="mt-16 grid gap-8 border-y border-default py-10 sm:grid-cols-[1fr_auto]" aria-labelledby="guide-title">
          <div>
            <p class="text-xs tracking-widest text-muted">
              BEFORE YOU BUY
            </p><h2 id="guide-title" class="market-heading mt-3 text-2xl sm:text-3xl">
              先看懂資訊，再決定下一步。
            </h2><p class="mt-3 max-w-2xl text-muted">
              LDK 怎麼看？專有面積與坪數有何不同？管理費、修繕積立金如何影響持有成本？
            </p>
          </div>
          <UButton to="/guide" size="lg" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right" class="self-center justify-center">
            東京購屋指南
          </UButton>
        </section>
      </UContainer>
    </main>
    <MarketFooter />
  </div>
</template>
