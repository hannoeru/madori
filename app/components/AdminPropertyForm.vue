<script setup lang="ts">
import type { AdminAgencyOperationScope, AdminImageSummary, AdminPropertyDetail, AdminPropertyInput } from '#shared/admin-property'
import * as v from 'valibot'
import { adminPropertyInputSchema, createAgencyViewScope, publicationErrors } from '#shared/admin-property'
import { TOKYO_23_WARDS } from '#shared/tokyo'

const props = defineProps<{ propertyId?: string }>()

const router = useRouter()

const propertyTypeOptions = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const buildStatusOptions = [{ label: '新成屋', value: 'new' }, { label: '中古', value: 'resale' }]
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
const transitEntries = ref<{ stationId: string, walkingMinutes: string, stationOpen: boolean }[]>([])
const images = ref<AdminImageSummary[]>([])
const error = ref('')
const success = ref('')
const fieldErrors = ref<Record<string, string>>({})
const errorSummary = ref<HTMLElement>()
const saving = ref(false)
const mediaBusy = ref(false)
const loaded = ref(!props.propertyId)
const deleteOpen = ref(false)
const { user } = useUserSession()
const view = createAgencyViewScope(() => user.value?.role === 'agency' ? user.value.id : undefined)

watch(() => user.value?.role === 'agency' ? user.value.id : undefined, () => {
  if (!view.ownsView()) {
    view.retire()
    images.value = []
    loaded.value = false
    error.value = ''
    success.value = ''
    saving.value = false
    mediaBusy.value = false
  }
}, { flush: 'sync' })
onScopeDispose(view.retire)

const initialScope = view.capture()
const { data: stationData } = await useFetch('/api/stations', { retry: 0 })

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
  const scope = view.capture()
  const propertyId = props.propertyId
  if (!view.isCurrent(scope) || !propertyId)
    return
  try {
    const detail = await $fetch<AdminPropertyDetail>(`/api/admin/properties/${propertyId}`, { retry: 0 })
    if (!view.isCurrent(scope))
      return
    images.value = detail.images
    await nextTick()
  }
  catch (error) {
    if (view.isCurrent(scope))
      throw error
  }
}

if (props.propertyId && view.isCurrent(initialScope)) {
  const { data, error: loadError } = await useFetch<AdminPropertyDetail>(() => `/api/admin/properties/${props.propertyId}`, { key: `admin-property:${initialScope?.agencyId}:${props.propertyId}:${useId()}`, retry: 0 })
  if (loadError.value && view.isCurrent(initialScope))
    error.value = '無法載入此物件，請確認存取權限並重新整理。'
  if (data.value && view.isCurrent(initialScope)) {
    loaded.value = true
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
    transitEntries.value = p.transitEntries.map(entry => ({ stationId: entry.stationId, walkingMinutes: String(entry.walkingMinutes), stationOpen: false }))
    images.value = p.images
  }
}

function addTransit(): void {
  transitEntries.value.push({ stationId: '', walkingMinutes: '', stationOpen: false })
}

function removeTransit(index: number): void {
  transitEntries.value.splice(index, 1)
}

async function showError(message: string, scope: AdminAgencyOperationScope | undefined) {
  if (!view.isCurrent(scope))
    return
  error.value = message
  await nextTick()
  if (view.isCurrent(scope))
    errorSummary.value?.focus()
}

async function removeProperty() {
  const scope = view.capture()
  const propertyId = props.propertyId
  if (!view.isCurrent(scope) || !propertyId || saving.value || mediaBusy.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/admin/properties/${propertyId}`, { method: 'DELETE', retry: 0 })
    if (!view.isCurrent(scope))
      return
    await router.push('/admin/properties')
  }
  catch (err) {
    if (view.isCurrent(scope))
      await showError(requestErrorMessage(err, '刪除失敗。'), scope)
  }
  finally {
    if (view.isCurrent(scope)) {
      saving.value = false
      deleteOpen.value = false
    }
  }
}

async function submit(targetStatus: AdminPropertyInput['status'] = status.value): Promise<void> {
  const scope = view.capture()
  const propertyId = props.propertyId
  if (!view.isCurrent(scope) || saving.value || mediaBusy.value || !loaded.value)
    return
  error.value = ''
  success.value = ''
  fieldErrors.value = {}
  const payload = {
    propertyType: propertyType.value,
    buildStatus: buildStatus.value,
    status: targetStatus,
    titleZhTw: titleZhTw.value,
    descriptionZhTw: descriptionZhTw.value,
    priceYen: Number(priceYen.value),
    ward: ward.value,
    addressZhTw: addressZhTw.value,
    layout: layout.value,
    floorAreaSqm: propertyType.value === 'condominium' ? toNumberOrNull(floorAreaSqm.value) : null,
    landAreaSqm: propertyType.value === 'detached_house' ? toNumberOrNull(landAreaSqm.value) : null,
    buildingAreaSqm: propertyType.value === 'detached_house' ? toNumberOrNull(buildingAreaSqm.value) : null,
    builtOn: builtOn.value,
    structure: structure.value || null,
    floorNumber: propertyType.value === 'condominium' ? toNumberOrNull(floorNumber.value) : null,
    totalFloors: toNumberOrNull(totalFloors.value),
    landRights: landRights.value || null,
    managementFeeYen: propertyType.value === 'condominium' ? toNumberOrNull(managementFeeYen.value) : null,
    repairReserveYen: propertyType.value === 'condominium' ? toNumberOrNull(repairReserveYen.value) : null,
    transactionMode: transactionMode.value || null,
    equipmentZhTw: equipmentZhTw.value || null,
    nextUpdateOn: nextUpdateOn.value,
    transitEntries: transitEntries.value.map(entry => ({ stationId: entry.stationId, walkingMinutes: entry.walkingMinutes === '' ? Number.NaN : Number(entry.walkingMinutes) })),
  }
  const parsed = v.safeParse(adminPropertyInputSchema, payload)
  if (!parsed.success) {
    for (const issue of parsed.issues) {
      const field = issue.path?.map(part => part.key).join('.')
      if (field)
        fieldErrors.value[field] = issue.message
    }
    await showError('請修正標示的欄位，再儲存物件。', scope)
    return
  }
  if (targetStatus === 'published') {
    const missing = publicationErrors(parsed.output, images.value)
    if (missing.length) {
      await showError(`發布前請補齊：${missing.join('、')}。資料尚未變更。`, scope)
      return
    }
  }
  saving.value = true
  try {
    if (propertyId) {
      await $fetch(`/api/admin/properties/${propertyId}`, { method: 'PATCH', body: parsed.output, retry: 0 })
      if (!view.isCurrent(scope))
        return
      status.value = targetStatus
      success.value = targetStatus === 'published' ? '物件已儲存並發布。' : targetStatus === 'withdrawn' ? '物件已撤下，買方無法查看。' : '草稿已儲存。'
    }
    else {
      const created = await $fetch('/api/admin/properties', { method: 'POST', body: parsed.output, retry: 0 })
      if (!view.isCurrent(scope))
        return
      await router.push(`/admin/properties/${created.id}`)
    }
  }
  catch (err) {
    if (view.isCurrent(scope))
      await showError(requestErrorMessage(err, '儲存失敗。輸入資料已保留。'), scope)
  }
  finally {
    if (view.isCurrent(scope))
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

    <div v-if="error" ref="errorSummary" tabindex="-1" class="mb-5" role="alert">
      <UAlert color="error" :title="error" />
    </div>
    <form v-if="loaded" class="grid gap-5" @submit.prevent="submit()">
      <UAlert v-if="!propertyId" color="info" title="先儲存草稿，再上傳照片與格局圖。" />
      <div class="flex flex-wrap items-center gap-3">
        <UBadge :color="status === 'published' ? 'primary' : 'neutral'">
          {{ status === 'published' ? '已發布' : status === 'withdrawn' ? '已撤下' : '草稿' }}
        </UBadge>
        <p class="text-sm text-muted">
          發布前請確認適用資料、交通與圖片。撤下後可重新發布或永久刪除。
        </p>
      </div>
      <h2 class="text-lg font-semibold">
        基本資料
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="物件類型" required :error="fieldErrors.propertyType">
          <USelect v-model="propertyType" :items="propertyTypeOptions" />
        </UFormField>
        <UFormField label="新成屋 / 中古" required :error="fieldErrors.buildStatus">
          <USelect v-model="buildStatus" :items="buildStatusOptions" />
        </UFormField>
      </div>

      <UFormField label="標題" required :error="fieldErrors.titleZhTw">
        <UInput v-model="titleZhTw" />
      </UFormField>

      <UFormField label="物件說明" required :error="fieldErrors.descriptionZhTw">
        <UTextarea v-model="descriptionZhTw" :rows="4" />
      </UFormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="價格（日圓）" required :error="fieldErrors.priceYen">
          <UInput v-model="priceYen" type="number" />
        </UFormField>
        <UFormField label="格局" required :error="fieldErrors.layout">
          <UInput v-model="layout" placeholder="例如 2LDK" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="東京23區" required :error="fieldErrors.ward">
          <USelect v-model="ward" :items="TOKYO_23_WARDS" placeholder="選擇區域" />
        </UFormField>
        <UFormField label="所在地" required :error="fieldErrors.addressZhTw">
          <UInput v-model="addressZhTw" />
        </UFormField>
      </div>

      <h2 class="text-lg font-semibold">
        適用資料與費用
      </h2>
      <p class="text-sm text-muted">
        以下適用資料在發布時必填。尚未確認的資料可留空並儲存草稿。
      </p>
      <div v-if="propertyType === 'condominium'" class="grid gap-4 sm:grid-cols-2">
        <UFormField label="專有面積（m²）" required :error="fieldErrors.floorAreaSqm">
          <UInput v-model="floorAreaSqm" type="number" step="any" />
        </UFormField>
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <UFormField label="土地面積（m²）" required :error="fieldErrors.landAreaSqm">
          <UInput v-model="landAreaSqm" type="number" step="any" />
        </UFormField>
        <UFormField label="建物面積（m²）" required :error="fieldErrors.buildingAreaSqm">
          <UInput v-model="buildingAreaSqm" type="number" step="any" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="築年月" required :error="fieldErrors.builtOn">
          <UInput v-model="builtOn" type="month" />
        </UFormField>
        <UFormField label="下次更新日" required :error="fieldErrors.nextUpdateOn">
          <UInput v-model="nextUpdateOn" type="date" />
        </UFormField>
        <UFormField label="結構" required :error="fieldErrors.structure">
          <UInput v-model="structure" placeholder="例如 RC / SRC / 木造" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField v-if="propertyType === 'condominium'" label="所在樓層" description="地下室可填負數，不可為0；不可高於總樓層。" required :error="fieldErrors.floorNumber">
          <UInput v-model="floorNumber" type="number" />
        </UFormField>
        <UFormField label="總樓層" required :error="fieldErrors.totalFloors">
          <UInput v-model="totalFloors" type="number" />
        </UFormField>
        <UFormField label="土地權利" required :error="fieldErrors.landRights">
          <USelect v-model="landRights" :items="landRightsOptions" placeholder="選擇" clear />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField v-if="propertyType === 'condominium'" label="管理費（日圓/月）" description="無費用請填0。" required :error="fieldErrors.managementFeeYen">
          <UInput v-model="managementFeeYen" type="number" />
        </UFormField>
        <UFormField v-if="propertyType === 'condominium'" label="修繕積立金（日圓/月）" description="無費用請填0。" required :error="fieldErrors.repairReserveYen">
          <UInput v-model="repairReserveYen" type="number" />
        </UFormField>
        <UFormField label="交易型態" required :error="fieldErrors.transactionMode">
          <USelect v-model="transactionMode" :items="transactionModeOptions" placeholder="選擇" clear />
        </UFormField>
      </div>

      <UFormField label="設備" :error="fieldErrors.equipmentZhTw">
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
            <UFormField :label="`交通 ${index + 1} 車站`" :error="fieldErrors[`transitEntries.${index}.stationId`]">
              <USelectMenu v-model="entry.stationId" v-model:open="entry.stationOpen" v-bind="entry.stationOpen ? {} : { 'aria-controls': undefined }" :items="stationOptions" value-key="value" :aria-label="`交通 ${index + 1} 車站`" class="w-full" placeholder="選擇車站" />
            </UFormField>
            <UFormField :label="`交通 ${index + 1} 步行分鐘`" :error="fieldErrors[`transitEntries.${index}.walkingMinutes`]">
              <UInput v-model="entry.walkingMinutes" type="number" :min="0" :max="180" class="w-full" />
            </UFormField>
            <UButton color="error" variant="ghost" class="min-h-11" icon="i-lucide-trash-2" :aria-label="`移除交通 ${index + 1}`" :disabled="saving" @click="removeTransit(index)" />
          </div>
          <p v-if="!transitEntries.length" class="text-sm text-muted">
            尚未新增交通。至少加入一個車站。
          </p>
        </div>
      </div>

      <AdminPropertyImages v-if="propertyId" :property-id="propertyId" :images="images" :disabled="saving" :refresh-images="reloadImages" @busy="mediaBusy = $event" />
      <UAlert v-if="success" color="success" :title="success" role="status" />
      <div class="flex flex-wrap justify-end gap-3 border-t border-default pt-5">
        <UButton color="neutral" variant="ghost" @click="router.push('/admin/properties')">
          取消
        </UButton>
        <UButton v-if="propertyId && status === 'withdrawn'" color="error" variant="outline" :disabled="saving || mediaBusy" class="min-h-11" @click="deleteOpen = true">
          永久刪除
        </UButton>
        <UButton v-if="propertyId && status === 'published'" color="neutral" variant="outline" :disabled="saving || mediaBusy" class="min-h-11" @click="submit('withdrawn')">
          撤下物件
        </UButton>
        <UButton v-if="propertyId && status !== 'published'" :disabled="saving || mediaBusy" class="min-h-11" @click="submit('published')">
          {{ status === 'withdrawn' ? '恢復發布' : '發布物件' }}
        </UButton>
        <UButton type="submit" :loading="saving" :disabled="saving || mediaBusy" class="min-h-11" icon="i-lucide-save">
          {{ propertyId ? '儲存資料' : '儲存草稿並新增圖片' }}
        </UButton>
      </div>
    </form>
    <UModal v-model:open="deleteOpen" title="永久刪除此物件？" description="物件與所有圖片將永久移除，無法復原。">
      <template #footer>
        <UButton color="neutral" variant="outline" :disabled="saving" @click="deleteOpen = false">
          取消
        </UButton>
        <UButton color="error" :loading="saving" @click="removeProperty">
          確認永久刪除
        </UButton>
      </template>
    </UModal>
  </UCard>
</template>
