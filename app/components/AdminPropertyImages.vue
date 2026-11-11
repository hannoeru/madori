<script setup lang="ts">
import type { PropertyImage } from '#shared/property'

const props = defineProps<{ propertyId: string, images: PropertyImage[] }>()
const emit = defineEmits<{ changed: [] }>()

const photos = computed(() => props.images.filter(image => image.kind === 'photo'))
const floorPlan = computed(() => props.images.find(image => image.kind === 'floor_plan'))
const photoInput = ref<HTMLInputElement>()
const planInput = ref<HTMLInputElement>()
const busyLabel = ref('')
const errorMessage = ref('')
const pendingDelete = ref<PropertyImage>()
const deleteOpen = computed({ get: () => !!pendingDelete.value, set: (open) => {
  if (!open)
    pendingDelete.value = undefined
} })

async function run(action: () => Promise<void>) {
  errorMessage.value = ''
  try {
    await action()
  }
  catch (error) {
    errorMessage.value = requestErrorMessage(error, '圖片操作失敗，請重試。')
  }
  finally {
    busyLabel.value = ''
    emit('changed')
  }
}

function upload(event: Event, kind: PropertyImage['kind']) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  return run(async () => {
    for (const [index, file] of files.entries()) {
      busyLabel.value = `上傳中 ${index + 1}／${files.length}`
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kind)
      await $fetch(`/api/admin/properties/${props.propertyId}/images`, { method: 'POST', body })
    }
  })
}

function setCover(image: PropertyImage) {
  busyLabel.value = '儲存中'
  return run(async () => {
    await $fetch(`/api/admin/properties/${props.propertyId}/images/${image.id}`, { method: 'PATCH' })
  })
}

function confirmDelete() {
  const image = pendingDelete.value
  if (!image)
    return
  pendingDelete.value = undefined
  busyLabel.value = '刪除中'
  return run(async () => {
    await $fetch(`/api/admin/properties/${props.propertyId}/images/${image.id}`, { method: 'DELETE' })
  })
}
</script>

<template>
  <section class="space-y-5" aria-labelledby="images-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="images-title" class="site-heading text-lg">
          照片與格局圖
        </h2>
        <p class="text-sm text-muted">
          JPEG 或 PNG，單張最多 10 MB，最多 20 張照片。圖片選好後會立即儲存。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-image-plus" variant="outline" :disabled="!!busyLabel || photos.length >= 20" @click="photoInput?.click()">
          新增照片
        </UButton>
        <UButton icon="i-lucide-layout-template" variant="outline" :disabled="!!busyLabel" @click="planInput?.click()">
          {{ floorPlan ? '替換格局圖' : '上傳格局圖' }}
        </UButton>
      </div>
    </div>
    <input ref="photoInput" type="file" multiple accept="image/png,image/jpeg" class="hidden" aria-label="新增照片" @change="upload($event, 'photo')">
    <input ref="planInput" type="file" accept="image/png,image/jpeg" class="hidden" aria-label="上傳格局圖" @change="upload($event, 'floor_plan')">

    <p v-if="busyLabel" class="text-sm text-muted" role="status">
      {{ busyLabel }}
    </p>
    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" role="alert" />

    <ul v-if="images.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="(image, index) in [...photos, ...(floorPlan ? [floorPlan] : [])]" :key="image.id">
        <div class="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted">
          <img :src="`/api/property-images/${image.id}`" :alt="image.kind === 'photo' ? `照片 ${index + 1}` : '格局圖'" loading="lazy" class="h-full w-full" :class="image.kind === 'photo' ? 'object-cover' : 'object-contain'">
          <UBadge v-if="image.isCover" class="absolute left-2 top-2">
            封面
          </UBadge>
          <UBadge v-if="image.kind === 'floor_plan'" color="neutral" class="absolute left-2 top-2">
            格局圖
          </UBadge>
        </div>
        <div class="mt-1 flex justify-between gap-1">
          <UButton v-if="image.kind === 'photo' && !image.isCover" size="sm" color="neutral" variant="ghost" :disabled="!!busyLabel" @click="setCover(image)">
            設為封面
          </UButton>
          <span v-else />
          <UButton size="sm" color="error" variant="ghost" :disabled="!!busyLabel" @click="pendingDelete = image">
            刪除
          </UButton>
        </div>
      </li>
    </ul>

    <UModal v-model:open="deleteOpen" title="刪除這張圖片？" description="刪除後無法復原。">
      <template #footer>
        <UButton color="neutral" variant="outline" @click="pendingDelete = undefined">
          取消
        </UButton>
        <UButton color="error" @click="confirmDelete">
          刪除圖片
        </UButton>
      </template>
    </UModal>
  </section>
</template>
