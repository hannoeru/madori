<script setup lang="ts">
import type { AdminImageRecovery, AdminImageSummary } from '#shared/admin-property'
import * as v from 'valibot'
import { adminImageRecoveryErrorSchema, createAgencyViewScope } from '#shared/admin-property'

const props = defineProps<{ propertyId: string, images: AdminImageSummary[], disabled?: boolean, refreshImages: () => Promise<void> }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const photos = ref<AdminImageSummary[]>([])
const floorPlan = ref<AdminImageSummary>()
const coverId = ref<string | null>(null)
const uploadAlt = ref('')
const photoInput = ref<HTMLInputElement>()
const floorInput = ref<HTMLInputElement>()
const pendingDelete = ref<AdminImageSummary>()
const deleteOpen = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const warning = ref('')
const recoveries = ref<AdminImageRecovery[]>([])
const { user } = useUserSession()
const view = createAgencyViewScope(() => user.value?.role === 'agency' ? user.value.id : undefined)

function discard() {
  view.retire()
  recoveries.value = []
  error.value = ''
  success.value = ''
  warning.value = ''
  busy.value = false
}

watch(() => user.value?.role === 'agency' ? user.value.id : undefined, () => {
  if (!view.ownsView()) {
    discard()
    emit('busy', false)
  }
}, { flush: 'sync' })
onScopeDispose(discard)

watch(() => props.images, (images) => {
  if (!view.ownsView())
    return
  photos.value = images.filter(image => image.kind === 'photo').sort((a, b) => a.position - b.position).map(image => ({ ...image }))
  const plan = images.find(image => image.kind === 'floor_plan')
  floorPlan.value = plan ? { ...plan } : undefined
  coverId.value = photos.value.find(image => image.isCover)?.id ?? photos.value[0]?.id ?? null
}, { immediate: true })

function move(index: number, direction: number) {
  if (!view.ownsView())
    return
  const photo = photos.value[index]
  if (!photo || index + direction < 0 || index + direction >= photos.value.length)
    return
  photos.value.splice(index, 1)
  photos.value.splice(index + direction, 0, photo)
}

async function run(action: () => Promise<{ cleanupPending: boolean }>, message: string) {
  const scope = view.capture()
  if (!view.isCurrent(scope) || busy.value || props.disabled)
    return
  busy.value = true
  emit('busy', true)
  error.value = ''
  success.value = ''
  warning.value = ''
  try {
    const result = await action()
    if (!view.isCurrent(scope))
      return
    success.value = message
    warning.value = result.cleanupPending ? '圖片變更已儲存，舊檔案仍待清除。請至所有物件清單重試圖片清除。' : ''
    await props.refreshImages()
    if (!view.isCurrent(scope))
      return
    await nextTick()
  }
  catch (err) {
    if (!view.isCurrent(scope))
      return
    const parsed = v.safeParse(adminImageRecoveryErrorSchema, err)
    if (parsed.success && !recoveries.value.some(item => item.objectKey === parsed.output.data.data.recovery.objectKey))
      recoveries.value.push(parsed.output.data.data.recovery)
    error.value = success.value ? '圖片變更已儲存，但無法重新載入。請重新整理頁面。' : requestErrorMessage(err, '圖片變更失敗。請重試。')
  }
  finally {
    if (view.isCurrent(scope)) {
      busy.value = false
      emit('busy', false)
    }
  }
}

async function upload(event: Event, kind: 'photo' | 'floor_plan') {
  const scope = view.capture()
  if (!view.isCurrent(scope) || !(event.target instanceof HTMLInputElement))
    return
  const input = event.target
  const file = input.files?.[0]
  if (!file)
    return
  const body = new FormData()
  body.append('file', file)
  body.append('kind', kind)
  body.append('alt', uploadAlt.value)
  await run(() => $fetch<{ cleanupPending: boolean }>(`/api/admin/properties/${props.propertyId}/images`, { method: 'POST', body, retry: 0 }), kind === 'photo' ? '照片已上傳。' : '格局圖已儲存。原格局圖僅在新圖片儲存成功後移除。')
  if (view.isCurrent(scope))
    input.value = ''
}

async function saveOrder() {
  await run(() => $fetch(`/api/admin/properties/${props.propertyId}/images`, { method: 'PATCH', retry: 0, body: {
    photos: photos.value.map(image => ({ id: image.id, altZhTw: image.altZhTw })),
    coverImageId: coverId.value,
    floorPlanId: floorPlan.value?.id,
    floorPlanAltZhTw: floorPlan.value?.altZhTw,
  } }), '照片順序、封面與圖片說明已儲存。')
}

function confirmDelete(image: AdminImageSummary) {
  if (!view.ownsView())
    return
  pendingDelete.value = image
  deleteOpen.value = true
}

async function remove() {
  const scope = view.capture()
  if (!view.isCurrent(scope))
    return
  const image = pendingDelete.value
  if (!image)
    return
  await run(() => $fetch(`/api/admin/properties/${props.propertyId}/images/${image.id}`, { method: 'DELETE', retry: 0 }), '圖片已刪除。')
  if (view.isCurrent(scope))
    deleteOpen.value = false
}
</script>

<template>
  <section v-if="view.ownsView()" class="space-y-5 border-y border-default py-6" aria-labelledby="media-heading">
    <div>
      <h2 id="media-heading" class="text-xl font-semibold">
        照片與格局圖
      </h2>
      <p class="mt-2 text-sm text-muted">
        發布前須有1至20張照片、一張照片封面及一張格局圖。僅限您有權使用的 PNG 或 JPEG，單張最多10 MiB。PNG最多1200萬像素，須為8位元、非交錯格式。JPEG最多200萬像素，且解碼記憶體不可超過32 MiB。
      </p>
      <p class="mt-1 text-sm text-muted">
        上傳和刪除會立即儲存。調整順序、封面與說明後，請按「儲存圖片設定」。
      </p>
    </div>
    <UFormField label="新圖片說明" description="描述房間、外觀或格局，供看不到圖片的使用者閱讀。" required>
      <UInput v-model="uploadAlt" class="w-full" :disabled="busy || disabled" :maxlength="200" placeholder="例如：客廳朝南的窗戶" />
    </UFormField>
    <div class="flex flex-wrap gap-3">
      <UButton icon="i-lucide-image-plus" variant="outline" class="min-h-11" :disabled="busy || disabled || photos.length >= 20 || !uploadAlt.trim()" @click="photoInput?.click()">
        新增照片 {{ photos.length }}/20
      </UButton>
      <UButton icon="i-lucide-layout-template" variant="outline" class="min-h-11" :disabled="busy || disabled || !uploadAlt.trim()" @click="floorInput?.click()">
        {{ floorPlan ? '替換格局圖' : '上傳格局圖' }}
      </UButton>
    </div>
    <input ref="photoInput" type="file" accept="image/png,image/jpeg" class="hidden" aria-label="新增照片" @change="upload($event, 'photo')">
    <input ref="floorInput" type="file" accept="image/png,image/jpeg" class="hidden" aria-label="上傳或替換格局圖" @change="upload($event, 'floor_plan')">
    <ol class="grid gap-4 sm:grid-cols-2">
      <li v-for="(image, index) in photos" :key="image.id" class="overflow-hidden border border-default bg-default">
        <img :src="`/api/property-images/${image.id}`" :alt="image.altZhTw" class="aspect-[4/3] w-full object-cover" loading="lazy">
        <div class="space-y-3 p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">
              照片 {{ index + 1 }}
            </p>
            <UBadge v-if="coverId === image.id" color="primary">
              封面
            </UBadge>
          </div>
          <UFormField :label="`照片 ${index + 1} 說明`" required>
            <UInput v-model="image.altZhTw" class="w-full" :disabled="busy || disabled" :maxlength="200" />
          </UFormField>
          <div class="flex flex-wrap gap-2">
            <UButton color="neutral" variant="outline" icon="i-lucide-arrow-up" class="min-h-11 min-w-11" :aria-label="`照片 ${index + 1} 向前移`" :disabled="index === 0 || busy || disabled" @click="move(index, -1)" />
            <UButton color="neutral" variant="outline" icon="i-lucide-arrow-down" class="min-h-11 min-w-11" :aria-label="`照片 ${index + 1} 向後移`" :disabled="index === photos.length - 1 || busy || disabled" @click="move(index, 1)" />
            <UButton color="neutral" variant="ghost" class="min-h-11" :disabled="busy || disabled || coverId === image.id" @click="coverId = image.id">
              設為封面
            </UButton>
            <UButton color="error" variant="ghost" class="min-h-11" :disabled="busy || disabled" :aria-label="`刪除照片 ${index + 1}`" @click="confirmDelete(image)">
              刪除
            </UButton>
          </div>
        </div>
      </li>
    </ol>
    <div v-if="floorPlan" class="grid gap-4 border border-default p-4 sm:grid-cols-[12rem_1fr]">
      <img :src="`/api/property-images/${floorPlan.id}`" :alt="floorPlan.altZhTw" class="aspect-square w-full bg-elevated object-contain" loading="lazy">
      <div class="space-y-3">
        <h3 class="font-semibold">
          格局圖
        </h3>
        <UFormField label="格局圖說明" required>
          <UInput v-model="floorPlan.altZhTw" class="w-full" :disabled="busy || disabled" :maxlength="200" />
        </UFormField>
        <p class="text-sm text-muted">
          已發布物件可直接替換格局圖，無須先撤下。若要移除格局圖，須先撤下物件。
        </p>
        <UButton color="error" variant="ghost" class="min-h-11" :disabled="busy || disabled" @click="confirmDelete(floorPlan)">
          刪除格局圖
        </UButton>
      </div>
    </div>
    <UAlert v-if="error" color="error" :title="error" role="alert" />
    <UAlert v-if="success" color="success" :title="success" role="status" />
    <UAlert v-if="warning" color="warning" :title="warning" role="status" />
    <AdminUploadRecovery v-model="recoveries" :disabled="busy || disabled" />
    <UButton class="min-h-11" :loading="busy" :disabled="busy || disabled" icon="i-lucide-save" @click="saveOrder">
      儲存圖片設定
    </UButton>
    <UModal v-model:open="deleteOpen" title="刪除此圖片？" description="刪除後無法復原。已發布物件須保留至少一張照片及一張格局圖。">
      <template #footer>
        <UButton color="neutral" variant="outline" :disabled="busy" @click="deleteOpen = false">
          取消
        </UButton>
        <UButton color="error" :loading="busy" @click="remove">
          確認刪除
        </UButton>
      </template>
    </UModal>
  </section>
</template>
