<script setup lang="ts">
import type { AdminPropertyDetail, PropertyImage, PropertyInput } from '#shared/property'
import * as v from 'valibot'
import { propertyInputSchema, publicationErrors } from '#shared/property'
import { TOKYO_23_WARDS } from '#shared/tokyo'

const props = defineProps<{ propertyId?: string }>()

const form = reactive({
  propertyType: 'condominium' as PropertyInput['propertyType'],
  buildStatus: 'resale' as PropertyInput['buildStatus'],
  titleZhTw: '',
  descriptionZhTw: '',
  priceYen: '',
  ward: undefined as string | undefined,
  addressZhTw: '',
  layout: '',
  floorAreaSqm: '',
  landAreaSqm: '',
  buildingAreaSqm: '',
  builtOn: '',
  structure: '',
  floorNumber: '',
  totalFloors: '',
  landRights: '',
  managementFeeYen: '',
  repairReserveYen: '',
  equipmentZhTw: '',
})
const transit = ref<{ line: string, station: string, walkingMinutes: string }[]>([])
const status = ref<PropertyInput['status']>('draft')
const images = ref<PropertyImage[]>([])
const fieldErrors = ref<Record<string, string>>({})
const errorMessage = ref('')
const successMessage = ref('')
const saving = ref(false)
const deleteOpen = ref(false)
const isCondominium = computed(() => form.propertyType === 'condominium')

const typeOptions = [{ label: '公寓', value: 'condominium' }, { label: '獨棟住宅', value: 'detached_house' }]
const buildOptions = [{ label: '中古屋', value: 'resale' }, { label: '新成屋', value: 'new' }]
const landRightsOptions = ['所有權', '借地權', '定期借地權', '舊法借地權']

function asText(value: string | number | null): string {
  return value === null ? '' : String(value)
}

if (props.propertyId) {
  const { data } = await useFetch<AdminPropertyDetail>(`/api/admin/properties/${props.propertyId}`)
  if (!data.value)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。', fatal: true })
  const property = data.value
  Object.assign(form, {
    ...property,
    priceYen: asText(property.priceYen),
    floorAreaSqm: asText(property.floorAreaSqm),
    landAreaSqm: asText(property.landAreaSqm),
    buildingAreaSqm: asText(property.buildingAreaSqm),
    structure: asText(property.structure),
    floorNumber: asText(property.floorNumber),
    totalFloors: asText(property.totalFloors),
    landRights: asText(property.landRights),
    managementFeeYen: asText(property.managementFeeYen),
    repairReserveYen: asText(property.repairReserveYen),
    equipmentZhTw: asText(property.equipmentZhTw),
  })
  transit.value = property.transit.map(entry => ({ ...entry, walkingMinutes: String(entry.walkingMinutes) }))
  status.value = property.status
  images.value = property.images
}

async function reloadImages() {
  const detail = await $fetch<AdminPropertyDetail>(`/api/admin/properties/${props.propertyId}`)
  images.value = detail.images
}

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

function emptyToNull(value: string): string | null {
  return value.trim() || null
}

async function save(targetStatus: PropertyInput['status']) {
  errorMessage.value = ''
  successMessage.value = ''
  fieldErrors.value = {}
  const parsed = v.safeParse(propertyInputSchema, {
    ...form,
    status: targetStatus,
    priceYen: Number(form.priceYen),
    floorAreaSqm: numberOrNull(form.floorAreaSqm),
    landAreaSqm: numberOrNull(form.landAreaSqm),
    buildingAreaSqm: numberOrNull(form.buildingAreaSqm),
    structure: emptyToNull(form.structure),
    floorNumber: numberOrNull(form.floorNumber),
    totalFloors: numberOrNull(form.totalFloors),
    landRights: emptyToNull(form.landRights),
    managementFeeYen: numberOrNull(form.managementFeeYen),
    repairReserveYen: numberOrNull(form.repairReserveYen),
    equipmentZhTw: emptyToNull(form.equipmentZhTw),
    transit: transit.value.map(entry => ({ ...entry, walkingMinutes: entry.walkingMinutes === '' ? Number.NaN : Number(entry.walkingMinutes) })),
  })
  if (!parsed.success) {
    fieldErrors.value = Object.fromEntries(parsed.issues.map(issue => [issue.path?.map(part => part.key).join('.') ?? '', issue.message]))
    errorMessage.value = '請修正標示的欄位。'
    return
  }
  if (targetStatus === 'published') {
    const missing = publicationErrors(parsed.output, images.value)
    if (missing.length) {
      errorMessage.value = `發布前請補齊：${missing.join('、')}。`
      return
    }
  }

  saving.value = true
  try {
    if (props.propertyId) {
      await $fetch(`/api/admin/properties/${props.propertyId}`, { method: 'PATCH', body: parsed.output })
      status.value = targetStatus
      successMessage.value = targetStatus === 'published' ? '已發布到網站。' : '已儲存為草稿。'
    }
    else {
      const created = await $fetch<{ id: string }>('/api/admin/properties', { method: 'POST', body: parsed.output })
      await navigateTo(`/admin/properties/${created.id}`)
    }
  }
  catch (error) {
    errorMessage.value = requestErrorMessage(error, '儲存失敗，輸入的資料仍保留在此頁。')
  }
  finally {
    saving.value = false
  }
}

async function removeProperty() {
  saving.value = true
  try {
    await $fetch(`/api/admin/properties/${props.propertyId}`, { method: 'DELETE' })
    await navigateTo('/admin')
  }
  catch (error) {
    errorMessage.value = requestErrorMessage(error, '刪除失敗，請重試。')
  }
  finally {
    saving.value = false
    deleteOpen.value = false
  }
}
</script>

<template>
  <form class="mx-auto max-w-3xl space-y-8" @submit.prevent="save(status)">
    <div>
      <UButton to="/admin" color="neutral" variant="ghost" icon="i-lucide-arrow-left" class="-ml-3">
        所有物件
      </UButton>
      <div class="mt-2 flex items-center gap-3">
        <h1 class="site-heading text-2xl">
          {{ propertyId ? '編輯物件' : '新增物件' }}
        </h1>
        <UBadge :color="status === 'published' ? 'success' : 'neutral'" variant="subtle">
          {{ status === 'published' ? '已發布' : '草稿' }}
        </UBadge>
      </div>
    </div>

    <section class="grid gap-4 bg-default p-6 sm:grid-cols-2" aria-label="基本資料">
      <UFormField label="類型" required>
        <USelect v-model="form.propertyType" :items="typeOptions" class="w-full" />
      </UFormField>
      <UFormField label="屋況" required>
        <USelect v-model="form.buildStatus" :items="buildOptions" class="w-full" />
      </UFormField>
      <UFormField label="標題" required :error="fieldErrors.titleZhTw" class="sm:col-span-2">
        <UInput v-model="form.titleZhTw" class="w-full" placeholder="例如：中目黑站步行5分鐘的兩房公寓" />
      </UFormField>
      <UFormField label="價格（日圓）" required :error="fieldErrors.priceYen">
        <UInput v-model="form.priceYen" type="number" min="1" class="w-full" placeholder="64800000" />
      </UFormField>
      <UFormField label="格局" required :error="fieldErrors.layout">
        <UInput v-model="form.layout" class="w-full" placeholder="2LDK" />
      </UFormField>
      <UFormField label="區域" required :error="fieldErrors.ward">
        <USelect v-model="form.ward" :items="TOKYO_23_WARDS" placeholder="選擇區域" class="w-full" />
      </UFormField>
      <UFormField label="所在地" required :error="fieldErrors.addressZhTw">
        <UInput v-model="form.addressZhTw" class="w-full" placeholder="目黑區上目黑" />
      </UFormField>
      <UFormField v-if="isCondominium" label="專有面積（m²）" required :error="fieldErrors.floorAreaSqm">
        <UInput v-model="form.floorAreaSqm" type="number" step="any" class="w-full" />
      </UFormField>
      <template v-else>
        <UFormField label="土地面積（m²）" required :error="fieldErrors.landAreaSqm">
          <UInput v-model="form.landAreaSqm" type="number" step="any" class="w-full" />
        </UFormField>
        <UFormField label="建物面積（m²）" required :error="fieldErrors.buildingAreaSqm">
          <UInput v-model="form.buildingAreaSqm" type="number" step="any" class="w-full" />
        </UFormField>
      </template>
      <UFormField label="築年月" required :error="fieldErrors.builtOn">
        <UInput v-model="form.builtOn" type="month" class="w-full" />
      </UFormField>
      <UFormField label="物件說明" required :error="fieldErrors.descriptionZhTw" class="sm:col-span-2">
        <UTextarea v-model="form.descriptionZhTw" :rows="5" class="w-full" />
      </UFormField>
    </section>

    <section class="grid gap-4 bg-default p-6 sm:grid-cols-2" aria-labelledby="optional-title">
      <h2 id="optional-title" class="site-heading text-lg sm:col-span-2">
        其他資料（可留空）
      </h2>
      <UFormField v-if="isCondominium" label="管理費（日圓／月）" :error="fieldErrors.managementFeeYen">
        <UInput v-model="form.managementFeeYen" type="number" min="0" class="w-full" />
      </UFormField>
      <UFormField v-if="isCondominium" label="修繕積立金（日圓／月）" :error="fieldErrors.repairReserveYen">
        <UInput v-model="form.repairReserveYen" type="number" min="0" class="w-full" />
      </UFormField>
      <UFormField v-if="isCondominium" label="所在樓層" :error="fieldErrors.floorNumber">
        <UInput v-model="form.floorNumber" type="number" class="w-full" />
      </UFormField>
      <UFormField label="總樓層" :error="fieldErrors.totalFloors">
        <UInput v-model="form.totalFloors" type="number" min="1" class="w-full" />
      </UFormField>
      <UFormField label="建物結構" :error="fieldErrors.structure">
        <UInput v-model="form.structure" class="w-full" placeholder="RC" />
      </UFormField>
      <UFormField label="土地權利">
        <USelect v-model="form.landRights" :items="landRightsOptions" placeholder="選擇" class="w-full" />
      </UFormField>
      <UFormField label="設備" :error="fieldErrors.equipmentZhTw" class="sm:col-span-2">
        <UInput v-model="form.equipmentZhTw" class="w-full" placeholder="系統廚具、浴室乾燥機" />
      </UFormField>
    </section>

    <section class="space-y-3 bg-default p-6" aria-labelledby="transit-title">
      <div class="flex items-center justify-between">
        <h2 id="transit-title" class="site-heading text-lg">
          交通
        </h2>
        <UButton color="neutral" variant="outline" icon="i-lucide-plus" :disabled="transit.length >= 5" @click="transit.push({ line: '', station: '', walkingMinutes: '' })">
          新增車站
        </UButton>
      </div>
      <p v-if="fieldErrors.transit" class="text-sm text-error">
        {{ fieldErrors.transit }}
      </p>
      <div v-for="(entry, index) in transit" :key="index" class="grid grid-cols-[1fr_1fr_5rem_auto] items-start gap-2">
        <UFormField label="路線" :error="fieldErrors[`transit.${index}.line`]">
          <UInput v-model="entry.line" class="w-full" placeholder="東急東橫線" />
        </UFormField>
        <UFormField label="車站" :error="fieldErrors[`transit.${index}.station`]">
          <UInput v-model="entry.station" class="w-full" placeholder="中目黑" />
        </UFormField>
        <UFormField label="步行分" :error="fieldErrors[`transit.${index}.walkingMinutes`]">
          <UInput v-model="entry.walkingMinutes" type="number" min="0" class="w-full" />
        </UFormField>
        <UButton class="mt-6" color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="`移除第 ${index + 1} 個車站`" @click="transit.splice(index, 1)" />
      </div>
    </section>

    <div class="bg-default p-6">
      <AdminPropertyImages v-if="propertyId" :property-id="propertyId" :images="images" @changed="reloadImages" />
      <p v-else class="text-sm text-muted">
        儲存草稿後，就可以上傳照片與格局圖。
      </p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" role="alert" />
    <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" role="status" />

    <div class="flex flex-wrap items-center justify-end gap-3">
      <UButton v-if="propertyId" color="error" variant="ghost" class="mr-auto" :disabled="saving" @click="deleteOpen = true">
        刪除物件
      </UButton>
      <UButton v-if="propertyId && status === 'published'" color="neutral" variant="outline" :disabled="saving" @click="save('draft')">
        從網站撤下
      </UButton>
      <UButton v-if="propertyId && status === 'draft'" variant="outline" :disabled="saving" @click="save('published')">
        發布到網站
      </UButton>
      <UButton type="submit" :loading="saving">
        {{ propertyId ? '儲存' : '儲存草稿' }}
      </UButton>
    </div>

    <UModal v-model:open="deleteOpen" title="刪除這間物件？" description="物件資料和所有圖片都會永久刪除，無法復原。">
      <template #footer>
        <UButton color="neutral" variant="outline" @click="deleteOpen = false">
          取消
        </UButton>
        <UButton color="error" :loading="saving" @click="removeProperty">
          刪除物件
        </UButton>
      </template>
    </UModal>
  </form>
</template>
