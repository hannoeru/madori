<script setup lang="ts">
definePageMeta({ key: route => route.fullPath })
const route = useRoute()
const { data, error } = await useFetch(() => `/api/properties/${route.params.id}`)
if (error.value)
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: '目前無法載入此物件。' })
const property = data.value
if (!property)
  throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

const photos = property.images.filter(image => image.kind === 'photo')
const floorPlan = property.images.find(image => image.kind === 'floor_plan')
const selectedIndex = ref(Math.max(0, photos.findIndex(image => image.isCover)))
const selectedPhoto = computed(() => photos[selectedIndex.value])
const zoomOpen = ref(false)
const floorPlanOpen = ref(false)
const from = route.query.from
const returnTo = typeof from === 'string' && /^\/search(?:\?|$)/.test(from) ? from : '/search'
const facts = [
  { label: '所在地', value: property.addressZhTw },
  { label: '格局', value: property.layout },
  { label: '築年月', value: property.builtOn },
  { label: '建物結構', value: property.structure },
  property.propertyType === 'condominium'
    ? { label: '所在樓層／總樓層', value: property.floorNumber !== null || property.totalFloors !== null ? `${property.floorNumber ?? '未提供'}／${property.totalFloors ?? '未提供'}` : null }
    : { label: '總樓層', value: property.totalFloors },
  { label: '土地權利', value: property.landRights },
  { label: '交易型態', value: property.transactionMode },
]
useSeoMeta({ title: `${property.titleZhTw}｜Madori`, description: `${property.ward}・${property.layout}・${formatPropertyArea(property)}` })
</script>

<template>
  <div>
    <MarketHeader />
    <main id="main-content">
      <UContainer class="py-8 sm:py-10">
        <UButton :to="returnTo" color="neutral" variant="ghost" icon="i-lucide-arrow-left">
          返回搜尋結果
        </UButton>
        <div class="mt-6 flex flex-wrap gap-2">
          <UBadge variant="soft">
            {{ property.ward }}
          </UBadge><UBadge color="neutral" variant="soft">
            {{ property.propertyType === 'condominium' ? '公寓' : '獨棟住宅' }}
          </UBadge><UBadge color="neutral" variant="outline">
            {{ property.buildStatus === 'new' ? '新成屋' : '中古屋' }}
          </UBadge>
        </div>
        <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 class="market-heading max-w-4xl text-3xl leading-relaxed sm:text-4xl">
            {{ property.titleZhTw }}
          </h1>
          <SavePropertyButton :property-id="property.id" />
        </div>
        <p class="mt-3 text-muted">
          {{ property.layout }} · {{ formatPropertyArea(property) }}
        </p>
        <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article class="min-w-0">
            <section aria-label="物件照片">
              <button v-if="selectedPhoto" class="block aspect-[4/3] w-full overflow-hidden rounded-md bg-muted" :aria-label="`放大照片：${selectedPhoto.altZhTw}`" @click="zoomOpen = true">
                <img :src="`/api/property-images/${selectedPhoto.id}`" :alt="selectedPhoto.altZhTw" class="h-full w-full object-cover">
              </button>
              <div v-else class="flex aspect-[4/3] items-center justify-center rounded-md border border-default bg-muted">
                <div class="text-center text-muted">
                  <UIcon name="i-lucide-image" class="size-12" /><p class="mt-3">
                    刊登公司尚未提供照片
                  </p>
                </div>
              </div>
              <div v-if="photos.length" class="mt-3 flex flex-wrap gap-2">
                <button v-for="(image, index) in photos" :key="image.id" class="h-20 w-24 overflow-hidden rounded-sm border-2" :class="selectedIndex === index ? 'border-primary' : 'border-transparent'" :aria-label="`查看照片 ${index + 1}：${image.altZhTw}`" :aria-pressed="selectedIndex === index" @click="selectedIndex = index">
                  <img :src="`/api/property-images/${image.id}`" :alt="image.altZhTw" loading="lazy" class="h-full w-full object-cover">
                </button>
              </div>
              <p v-if="selectedPhoto" class="mt-3 text-sm text-muted">
                {{ selectedPhoto.altZhTw }}・{{ selectedIndex + 1 }}／{{ photos.length }}
              </p>
            </section>
            <section class="mt-10 border-t border-default pt-8" aria-labelledby="floor-plan-title">
              <div class="flex items-center justify-between gap-4">
                <h2 id="floor-plan-title" class="market-heading text-2xl">
                  格局圖
                </h2><UButton v-if="floorPlan" variant="outline" icon="i-lucide-expand" @click="floorPlanOpen = true">
                  放大查看
                </UButton>
              </div><img v-if="floorPlan" :src="`/api/property-images/${floorPlan.id}`" :alt="floorPlan.altZhTw" class="mt-5 max-h-96 w-full rounded-md border border-default bg-elevated object-contain p-4"><p v-else class="mt-4 text-muted">
                尚未提供格局圖，請向刊登公司確認室內配置。
              </p>
            </section>
            <PropertyCosts :property="property" class="mt-8 lg:hidden" />
            <section class="mt-10 border-t border-default pt-8" aria-labelledby="facts-title">
              <h2 id="facts-title" class="market-heading text-2xl">
                物件概要
              </h2><dl class="mt-5 divide-y divide-default">
                <div class="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]">
                  <dt class="text-muted">
                    {{ property.propertyType === 'condominium' ? '專有面積' : '土地與建物面積' }}
                  </dt><dd>{{ formatPropertyArea(property) }}</dd>
                </div><div v-for="fact in facts" :key="fact.label" class="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]">
                  <dt class="text-muted">
                    {{ fact.label }}
                  </dt><dd>{{ fact.value ?? '未提供，請向房仲確認' }}</dd>
                </div>
              </dl>
            </section>
            <section class="mt-10 border-t border-default pt-8" aria-labelledby="transit-title">
              <h2 id="transit-title" class="market-heading text-2xl">
                車站與交通
              </h2><ul class="mt-5 space-y-4">
                <li v-for="entry in property.transitEntries" :key="entry.id" class="flex gap-3">
                  <UIcon name="i-lucide-train-front" class="mt-1 size-5 shrink-0 text-primary" /><div>
                    <p>{{ entry.lineNameZhTw }}・{{ formatStationName(entry.stationNameZhTw, entry.stationNameJa) }}</p><p class="mt-1 text-sm text-muted">
                      步行 {{ entry.walkingMinutes }} 分鐘
                    </p>
                  </div>
                </li>
              </ul><p v-if="!property.transitEntries.length" class="mt-4 text-muted">
                交通資訊未提供，請向房仲確認。
              </p><p class="mt-5 text-xs text-muted">
                步行時間為刊登資訊，不包含候車或轉乘。請實際確認通勤路徑。
              </p>
            </section>
            <section class="mt-10 border-t border-default pt-8" aria-labelledby="description-title">
              <h2 id="description-title" class="market-heading text-2xl">
                關於這個家
              </h2><p class="mt-5 whitespace-pre-line leading-loose text-toned">
                {{ property.descriptionZhTw }}
              </p><h3 v-if="property.equipmentZhTw" class="mt-6 font-semibold">
                設備與特色
              </h3><p v-if="property.equipmentZhTw" class="mt-3 whitespace-pre-line text-muted">
                {{ property.equipmentZhTw }}
              </p>
            </section>
            <section class="mt-10 rounded-md border border-default p-5">
              <h2 class="font-semibold">
                資訊更新
              </h2><p class="mt-2 text-sm text-muted">
                更新日期：{{ property.updatedAt.slice(0, 10) }}・下次更新：{{ property.nextUpdateOn }}
              </p><p class="mt-2 text-sm text-muted">
                物件由 {{ property.agency.name }} 刊登。成交或條件變動可能早於網站更新，請先確認是否仍可購買。
              </p>
            </section>
          </article>
          <aside class="h-fit space-y-5 lg:sticky lg:top-6">
            <PropertyCosts :property="property" class="hidden lg:block" />
            <UCard>
              <h2 class="text-xl font-semibold">
                向刊登公司確認
              </h2><p class="mt-4 font-semibold">
                {{ property.agency.name }}
              </p><p class="mt-2 text-sm text-muted">
                {{ property.agency.license }}
              </p><p class="mt-4 text-sm text-muted">
                詢問看屋安排、目前狀態與完整費用。Madori 不將公司註冊視為執照驗證。
              </p>
              <PropertyInquiry :property-id="property.id" :property-title="property.titleZhTw" class="mt-6" />
              <UButton :to="property.agency.lineUrl" target="_blank" rel="noopener noreferrer" block size="lg" class="mt-6" icon="i-simple-icons-line">
                使用 LINE 諮詢
              </UButton>
            </UCard>
          </aside>
        </div>
        <UModal v-model:open="zoomOpen" title="物件照片" :description="selectedPhoto?.altZhTw ?? '物件照片'">
          <template #body>
            <img v-if="selectedPhoto" :src="`/api/property-images/${selectedPhoto.id}`" :alt="selectedPhoto.altZhTw" class="w-full object-contain">
          </template>
        </UModal>
        <UModal v-model:open="floorPlanOpen" title="格局圖" :description="floorPlan?.altZhTw ?? '格局圖'">
          <template #body>
            <img v-if="floorPlan" :src="`/api/property-images/${floorPlan.id}`" :alt="floorPlan.altZhTw" class="w-full object-contain">
          </template>
        </UModal>
      </UContainer>
    </main>
    <MarketFooter />
  </div>
</template>
