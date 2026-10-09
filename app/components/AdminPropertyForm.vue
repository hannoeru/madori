<script setup lang="ts">
import type { AdminImageSummary, AdminPropertyDetail } from '#shared/admin-property'
import { TOKYO_23_WARDS } from '#shared/tokyo'

const props = defineProps<{ propertyId?: string }>()

const router = useRouter()

const propertyTypeOptions = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const buildStatusOptions = [{ label: '新成屋', value: 'new' }, { label: '中古', value: 'resale' }]
const statusOptions = [{ label: '草稿', value: 'draft' }, { label: '已發布', value: 'published' }, { label: '已撤下', value: 'withdrawn' }]
const landRightsOptions = ['所有權', '借地權', '定期借地權', '舊法借地權']
const transactionModeOptions = ['仲介', '賣主', '代理']

const propertyType = ref<'condominium' | 'detached_house'>('condominium')
const buildStatus = ref<'new' | 'resale'>('resale')
const status = ref<'draft' | 'published' | 'withdrawn'>('draft')
const titleZhTw = ref('')
const descriptionZhTw = ref('')
const priceYen = ref('')
const ward = ref('')
const addressZhTw = ref('')
const layout = ref('')
const floorAreaSqm = ref('')
const landAreaSqm = ref('')
const buildingAreaSqm = ref('')
const builtOn = ref('')
const structure = ref('')
const floorNumber = ref('')
const totalFloors = ref('')
const landRights = ref('')
const managementFeeYen = ref('')
const repairReserveYen = ref('')
const transactionMode = ref('')
const equipmentZhTw = ref('')
const nextUpdateOn = ref('')
const transitEntries = ref<{ stationId: string, walkingMinutes: string }[]>([])
const images = ref<AdminImageSummary[]>([])
const coverInput = ref<HTMLInputElement>()
const error = ref('')
const saving = ref(false)

const { data: stationData } = await useFetch('/api/stations')

const stationOptions = computed(() => {
  const lines = stationData.value?.lines ?? []
  const stations = stationData.value?.stations ?? []
  const lineNames = new Map(lines.map(line => [line.id, line.nameZhTw]))
  return stations.map(station => ({ label: `${lineNames.get(station.lineId) ?? ''} ${station.nameZhTw}`, value: station.id }))
})

function toNumberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

async function reloadImages(): Promise<void> {
  if (!props.propertyId)
    return
  const detail = await $fetch<AdminPropertyDetail>(`/api/admin/properties/${props.propertyId}`)
  images.value = detail.images
}

if (props.propertyId) {
  const { data } = await useFetch<AdminPropertyDetail>(() => `/api/admin/properties/${props.propertyId}`)
  if (data.value) {
    const p = data.value
    propertyType.value = p.propertyType
    buildStatus.value = p.buildStatus
    status.value = p.status
    titleZhTw.value = p.titleZhTw
    descriptionZhTw.value = p.descriptionZhTw
    priceYen.value = String(p.priceYen)
    ward.value = p.ward
    addressZhTw.value = p.addressZhTw
    layout.value = p.layout
    floorAreaSqm.value = p.floorAreaSqm == null ? '' : String(p.floorAreaSqm)
    landAreaSqm.value = p.landAreaSqm == null ? '' : String(p.landAreaSqm)
    buildingAreaSqm.value = p.buildingAreaSqm == null ? '' : String(p.buildingAreaSqm)
    builtOn.value = p.builtOn
    structure.value = p.structure ?? ''
    floorNumber.value = p.floorNumber == null ? '' : String(p.floorNumber)
    totalFloors.value = p.totalFloors == null ? '' : String(p.totalFloors)
    landRights.value = p.landRights ?? ''
    managementFeeYen.value = p.managementFeeYen == null ? '' : String(p.managementFeeYen)
    repairReserveYen.value = p.repairReserveYen == null ? '' : String(p.repairReserveYen)
    transactionMode.value = p.transactionMode ?? ''
    equipmentZhTw.value = p.equipmentZhTw ?? ''
    nextUpdateOn.value = p.nextUpdateOn
    transitEntries.value = p.transitEntries.map(entry => ({ stationId: entry.stationId, walkingMinutes: String(entry.walkingMinutes) }))
    images.value = p.images
  }
}

function addTransit(): void {
  transitEntries.value.push({ stationId: '', walkingMinutes: '' })
}

function removeTransit(index: number): void {
  transitEntries.value.splice(index, 1)
}

async function onCoverUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.propertyId)
    return

  error.value = ''
  saving.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', 'photo')
    body.append('isCover', 'true')
    body.append('alt', titleZhTw.value || '封面圖片')
    await $fetch(`/api/admin/properties/${props.propertyId}/images`, { method: 'POST', body })
    await reloadImages()
  }
  catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗。'
  }
  finally {
    saving.value = false
    input.value = ''
  }
}

async function deleteCover(): Promise<void> {
  const id = coverImageId(images.value)
  if (!id || !props.propertyId)
    return
  try {
    await $fetch(`/api/admin/properties/${props.propertyId}/images/${id}`, { method: 'DELETE' })
    await reloadImages()
  }
  catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '刪除失敗。'
  }
}

async function submit(): Promise<void> {
  error.value = ''
  saving.value = true
  const payload = {
    propertyType: propertyType.value,
    buildStatus: buildStatus.value,
    status: status.value,
    titleZhTw: titleZhTw.value,
    descriptionZhTw: descriptionZhTw.value,
    priceYen: Number(priceYen.value),
    ward: ward.value,
    addressZhTw: addressZhTw.value,
    layout: layout.value,
    floorAreaSqm: toNumberOrNull(floorAreaSqm.value),
    landAreaSqm: toNumberOrNull(landAreaSqm.value),
    buildingAreaSqm: toNumberOrNull(buildingAreaSqm.value),
    builtOn: builtOn.value,
    structure: structure.value || null,
    floorNumber: toNumberOrNull(floorNumber.value),
    totalFloors: toNumberOrNull(totalFloors.value),
    landRights: landRights.value || null,
    managementFeeYen: toNumberOrNull(managementFeeYen.value),
    repairReserveYen: toNumberOrNull(repairReserveYen.value),
    transactionMode: transactionMode.value || null,
    equipmentZhTw: equipmentZhTw.value || null,
    nextUpdateOn: nextUpdateOn.value,
    transitEntries: transitEntries.value.map(entry => ({ stationId: entry.stationId, walkingMinutes: Number(entry.walkingMinutes) })),
  }
  try {
    if (props.propertyId)
      await $fetch(`/api/admin/properties/${props.propertyId}`, { method: 'PATCH', body: payload })
    else
      await $fetch('/api/admin/properties', { method: 'POST', body: payload })
    await router.push('/admin/properties')
  }
  catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗。'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-bold text-highlighted">
        {{ propertyId ? '編輯物件' : '新增物件' }}
      </h1>
    </template>

    <div class="grid gap-4">
      <section v-if="propertyId" class="grid gap-2">
        <p class="text-sm font-medium">
          封面圖片
        </p>
        <div class="flex items-center gap-4">
          <img v-if="coverImageId(images)" :src="`/api/property-images/${coverImageId(images)}`" alt="封面圖片" class="h-24 w-32 rounded-lg object-cover">
          <div v-else class="flex h-24 w-32 items-center justify-center rounded-lg bg-muted text-xs text-muted">
            無封面
          </div>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="outline" :loading="saving" icon="i-lucide-upload" @click="coverInput?.click()">
              上傳封面
            </UButton>
            <UButton v-if="coverImageId(images)" color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteCover">
              移除封面
            </UButton>
          </div>
        </div>
        <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverUpload">
      </section>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="物件類型" required>
          <USelect v-model="propertyType" :items="propertyTypeOptions" />
        </UFormField>
        <UFormField label="新成屋 / 中古" required>
          <USelect v-model="buildStatus" :items="buildStatusOptions" />
        </UFormField>
        <UFormField label="狀態" required>
          <USelect v-model="status" :items="statusOptions" />
        </UFormField>
      </div>

      <UFormField label="標題" required>
        <UInput v-model="titleZhTw" />
      </UFormField>

      <UFormField label="物件說明" required>
        <UTextarea v-model="descriptionZhTw" :rows="4" />
      </UFormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="價格（日圓）" required>
          <UInput v-model="priceYen" type="number" />
        </UFormField>
        <UFormField label="格局" required>
          <UInput v-model="layout" placeholder="例如 2LDK" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="東京23區" required>
          <USelect v-model="ward" :items="TOKYO_23_WARDS" placeholder="選擇區域" />
        </UFormField>
        <UFormField label="所在地" required>
          <UInput v-model="addressZhTw" />
        </UFormField>
      </div>

      <div v-if="propertyType === 'condominium'" class="grid gap-4 sm:grid-cols-2">
        <UFormField label="專有面積（m²）" required>
          <UInput v-model="floorAreaSqm" type="number" />
        </UFormField>
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <UFormField label="土地面積（m²）" required>
          <UInput v-model="landAreaSqm" type="number" />
        </UFormField>
        <UFormField label="建物面積（m²）" required>
          <UInput v-model="buildingAreaSqm" type="number" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="築年月">
          <UInput v-model="builtOn" type="month" />
        </UFormField>
        <UFormField label="下次更新日" required>
          <UInput v-model="nextUpdateOn" type="date" />
        </UFormField>
        <UFormField label="結構">
          <UInput v-model="structure" placeholder="例如 RC / SRC / 木造" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="所在樓層">
          <UInput v-model="floorNumber" type="number" />
        </UFormField>
        <UFormField label="總樓層">
          <UInput v-model="totalFloors" type="number" />
        </UFormField>
        <UFormField label="土地權利">
          <USelect v-model="landRights" :items="landRightsOptions" placeholder="選擇" clear />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="管理費（日圓/月）">
          <UInput v-model="managementFeeYen" type="number" />
        </UFormField>
        <UFormField label="修繕積立金（日圓/月）">
          <UInput v-model="repairReserveYen" type="number" />
        </UFormField>
        <UFormField label="交易型態">
          <USelect v-model="transactionMode" :items="transactionModeOptions" placeholder="選擇" clear />
        </UFormField>
      </div>

      <UFormField label="設備">
        <UInput v-model="equipmentZhTw" placeholder="例如 系統廚具、浴室乾濕分離…" />
      </UFormField>

      <div>
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">
            交通
          </p>
          <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-plus" @click="addTransit">
            新增
          </UButton>
        </div>
        <div class="mt-2 grid gap-2">
          <div v-for="(entry, index) in transitEntries" :key="index" class="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
            <USelect v-model="entry.stationId" :items="stationOptions" placeholder="選擇車站" searchable />
            <UInput v-model="entry.walkingMinutes" type="number" placeholder="步行分鐘" />
            <UButton color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="移除" @click="removeTransit(index)" />
          </div>
          <p v-if="!transitEntries.length" class="text-sm text-muted">
            尚未新增交通。至少加入一個車站。
          </p>
        </div>
      </div>

      <UAlert v-if="error" color="error" :title="error" />

      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="router.push('/admin/properties')">
          取消
        </UButton>
        <UButton :loading="saving" icon="i-lucide-save" @click="submit">
          儲存
        </UButton>
      </div>
    </div>
  </UCard>
</template>
