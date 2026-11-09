<script setup lang="ts">
import type { PropertyDetail } from '#shared/property'

const { agent } = useAppConfig()
const route = useRoute()
const { data: property, error } = await useFetch<PropertyDetail>(`/api/properties/${route.params.id}`)
if (error.value || !property.value)
  throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: '找不到此物件。', fatal: true })

const detail = property.value
const photos = detail.images.filter(image => image.kind === 'photo')
const floorPlan = detail.images.find(image => image.kind === 'floor_plan')
const selectedIndex = ref(Math.max(0, photos.findIndex(image => image.isCover)))
const selectedPhoto = computed(() => photos[selectedIndex.value])
const zoomedImageId = ref<string>()
const zoomOpen = computed({ get: () => !!zoomedImageId.value, set: (open) => {
  if (!open)
    zoomedImageId.value = undefined
} })

const facts = [
  { label: '面積', value: formatPropertyArea(detail) },
  { label: '格局', value: detail.layout },
  { label: '所在地', value: detail.addressZhTw },
  { label: '築年月', value: formatBuiltOn(detail.builtOn) },
  { label: '屋況', value: detail.buildStatus === 'new' ? '新成屋' : '中古屋' },
  { label: '建物結構', value: detail.structure },
  { label: '樓層', value: detail.propertyType === 'condominium' && detail.floorNumber !== null ? `${detail.floorNumber} 樓${detail.totalFloors === null ? '' : `，共 ${detail.totalFloors} 層`}` : detail.totalFloors === null ? null : `共 ${detail.totalFloors} 層` },
  { label: '土地權利', value: detail.landRights },
  { label: '設備', value: detail.equipmentZhTw },
].filter(fact => fact.value)

useSeoMeta({ title: `${detail.titleZhTw}｜Madori`, description: `${detail.ward} ${detail.layout} ${formatManPrice(detail.priceYen)}` })
</script>

<template>
  <div class="pb-20 lg:pb-0">
    <SiteHeader />
    <main id="main-content">
      <UContainer class="py-6 sm:py-8">
        <UButton to="/#listings" color="neutral" variant="ghost" icon="i-lucide-arrow-left" class="-ml-3">
          所有物件
        </UButton>

        <div class="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <article class="min-w-0">
            <section aria-label="物件照片">
              <button v-if="selectedPhoto" class="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-sm bg-muted" aria-label="放大照片" @click="zoomedImageId = selectedPhoto?.id">
                <img :src="`/api/property-images/${selectedPhoto.id}`" :alt="`${detail.titleZhTw} 照片 ${selectedIndex + 1}`" class="h-full w-full object-cover">
              </button>
              <div v-if="photos.length > 1" class="mt-2 flex gap-2 overflow-x-auto pb-1">
                <button v-for="(photo, index) in photos" :key="photo.id" class="h-16 w-20 shrink-0 overflow-hidden rounded-sm border-2 sm:h-20 sm:w-28" :class="index === selectedIndex ? 'border-primary' : 'border-transparent'" :aria-label="`查看照片 ${index + 1}`" :aria-pressed="index === selectedIndex" @click="selectedIndex = index">
                  <img :src="`/api/property-images/${photo.id}`" alt="" loading="lazy" class="h-full w-full object-cover">
                </button>
              </div>
            </section>

            <h1 class="site-heading mt-8 text-3xl leading-snug">
              {{ detail.titleZhTw }}
            </h1>
            <p class="mt-2 text-muted">
              {{ detail.ward }}，{{ propertyTypeLabels[detail.propertyType] }}
            </p>

            <PropertyCosts :property="detail" class="mt-6 lg:hidden" />

            <section class="mt-10" aria-labelledby="facts-title">
              <h2 id="facts-title" class="site-heading text-xl">
                物件資料
              </h2>
              <dl class="mt-3 divide-y divide-default border-y border-default">
                <div v-for="fact in facts" :key="fact.label" class="grid grid-cols-[6rem_1fr] gap-4 py-3">
                  <dt class="text-muted">
                    {{ fact.label }}
                  </dt>
                  <dd class="whitespace-pre-line">
                    {{ fact.value }}
                  </dd>
                </div>
              </dl>
            </section>

            <section v-if="detail.transit.length" class="mt-10" aria-labelledby="transit-title">
              <h2 id="transit-title" class="site-heading text-xl">
                交通
              </h2>
              <ul class="mt-3 space-y-2">
                <li v-for="entry in detail.transit" :key="`${entry.line}-${entry.station}`">
                  {{ entry.line }} {{ entry.station }}站，步行 {{ entry.walkingMinutes }} 分鐘
                </li>
              </ul>
            </section>

            <section v-if="floorPlan" class="mt-10" aria-labelledby="plan-title">
              <h2 id="plan-title" class="site-heading text-xl">
                格局圖
              </h2>
              <button class="mt-3 block w-full cursor-zoom-in rounded-sm bg-elevated p-4" aria-label="放大格局圖" @click="zoomedImageId = floorPlan?.id">
                <img :src="`/api/property-images/${floorPlan.id}`" :alt="`${detail.titleZhTw} 格局圖`" loading="lazy" class="mx-auto max-h-[28rem] object-contain">
              </button>
            </section>

            <section class="mt-10" aria-labelledby="about-title">
              <h2 id="about-title" class="site-heading text-xl">
                物件說明
              </h2>
              <p class="mt-3 max-w-2xl whitespace-pre-line text-toned">
                {{ detail.descriptionZhTw }}
              </p>
              <p class="mt-6 text-sm text-muted">
                資料更新日：{{ detail.updatedAt.slice(0, 10) }}。物件可能已售出或條件已變更，請先向我確認。
              </p>
            </section>
          </article>

          <aside class="hidden lg:block">
            <div class="sticky top-6 space-y-6">
              <PropertyCosts :property="detail" />
              <div class="border-t border-default pt-6">
                <p class="font-semibold text-highlighted">
                  {{ agent.name }}
                </p>
                <p class="text-sm text-muted">
                  {{ agent.company }}
                </p>
                <p class="mt-3 text-sm text-muted">
                  想看屋或了解完整費用，傳 LINE 告訴我這間物件的名稱。
                </p>
                <LineButton class="mt-4 w-full" />
              </div>
            </div>
          </aside>
        </div>
      </UContainer>

      <UModal v-model:open="zoomOpen" title="放大檢視" description="物件圖片" :ui="{ content: 'sm:max-w-5xl' }">
        <template #body>
          <img v-if="zoomedImageId" :src="`/api/property-images/${zoomedImageId}`" :alt="detail.titleZhTw" class="w-full object-contain">
        </template>
      </UModal>

      <div class="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 border-t border-default bg-default px-4 py-3 lg:hidden">
        <p class="site-price text-lg text-highlighted">
          {{ formatManPrice(detail.priceYen) }}
        </p>
        <LineButton />
      </div>
    </main>
    <div class="hidden lg:block">
      <SiteFooter />
    </div>
  </div>
</template>
