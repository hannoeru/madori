<script setup lang="ts">
import type { PropertyDetail } from '../../../shared/property'

const route = useRoute()
const { data } = await useFetch<PropertyDetail>(() => `/api/properties/${route.params.id}`)
if (!data.value)
  throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

const property = computed(() => data.value!)

useSeoMeta({
  title: `${property.value.titleZhTw}｜Madori`,
  description: `${property.value.ward}・${property.value.layout}・${formatPropertyArea(property.value)}`,
})
</script>

<template>
  <main class="min-h-screen bg-default">
    <UContainer class="py-6 sm:py-10">
      <UButton to="/" color="neutral" variant="ghost" icon="i-lucide-arrow-left">
        返回搜尋
      </UButton>
      <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          <img v-if="coverImageId(property.images)" :src="`/api/property-images/${coverImageId(property.images)}`" :alt="property.titleZhTw" class="aspect-[16/9] w-full rounded-xl object-cover">
          <div v-else class="aspect-[16/9] rounded-xl bg-muted" aria-hidden="true" />
          <p class="mt-6 text-sm font-semibold text-primary">
            {{ property.propertyType === 'condominium' ? '公寓' : '獨棟住宅' }} · {{ property.buildStatus === 'new' ? '新成屋' : '中古' }}
          </p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-highlighted sm:text-5xl">
            {{ property.titleZhTw }}
          </h1>
          <p class="mt-4 text-3xl font-bold">
            {{ formatManPrice(property.priceYen) }}
          </p>
          <section class="mt-10">
            <h2 class="text-xl font-bold text-highlighted">
              物件概要
            </h2>
            <dl class="mt-4 divide-y divide-default border-y border-default">
              <div class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  所在地
                </dt>
                <dd>{{ property.addressZhTw }}</dd>
              </div>
              <div class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  格局 / 面積
                </dt>
                <dd>{{ property.layout }} / {{ formatPropertyArea(property) }}</dd>
              </div>
              <div class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  築年月
                </dt>
                <dd>{{ property.builtOn }}（{{ formatBuiltOn(property.builtOn) }}）</dd>
              </div>
              <div v-if="property.structure" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  結構
                </dt>
                <dd>{{ property.structure }}</dd>
              </div>
              <div v-if="property.floorNumber != null || property.totalFloors != null" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  所在樓層
                </dt>
                <dd>{{ property.floorNumber ?? '—' }} 樓 / 共 {{ property.totalFloors ?? '—' }} 樓</dd>
              </div>
              <div v-if="property.landRights" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  土地權利
                </dt>
                <dd>{{ property.landRights }}</dd>
              </div>
              <div v-if="property.managementFeeYen != null" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  管理費
                </dt>
                <dd>{{ formatYen(property.managementFeeYen) }}/月</dd>
              </div>
              <div v-if="property.repairReserveYen != null" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  修繕積立金
                </dt>
                <dd>{{ formatYen(property.repairReserveYen) }}/月</dd>
              </div>
              <div v-if="property.transactionMode" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  交易型態
                </dt>
                <dd>{{ property.transactionMode }}</dd>
              </div>
              <div v-if="property.equipmentZhTw" class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  設備
                </dt>
                <dd class="whitespace-pre-line">
                  {{ property.equipmentZhTw }}
                </dd>
              </div>
              <div class="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt class="text-muted">
                  下次更新
                </dt>
                <dd>{{ property.nextUpdateOn }}</dd>
              </div>
            </dl>
          </section>
          <section class="mt-10">
            <h2 class="text-xl font-bold text-highlighted">
              交通
            </h2>
            <ul class="mt-4 space-y-2 text-toned">
              <li v-for="entry in property.transitEntries" :key="entry.id">
                {{ entry.lineNameZhTw }}「{{ formatStationName(entry.stationNameZhTw, entry.stationNameJa) }}」站 步行{{ entry.walkingMinutes }}分鐘
              </li>
            </ul>
          </section>
          <section class="mt-10">
            <h2 class="text-xl font-bold text-highlighted">
              物件說明
            </h2>
            <p class="mt-4 whitespace-pre-line text-toned">
              {{ property.descriptionZhTw }}
            </p>
          </section>
        </article>
        <aside class="h-fit rounded-xl border border-default bg-elevated p-6 lg:sticky lg:top-6">
          <h2 class="text-xl font-bold text-highlighted">
            對這間房子有興趣嗎？
          </h2>
          <p class="mt-3 text-sm text-toned">
            {{ property.agency.name }}（{{ property.agency.license }}）為您服務。
          </p>
          <UButton class="mt-6" block :to="property.agency.lineUrl" target="_blank" color="success" icon="i-simple-icons-line">
            使用 LINE 諮詢
          </UButton>
        </aside>
      </div>
    </UContainer>
  </main>
</template>
