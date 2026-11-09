import * as v from 'valibot'
import { TOKYO_23_WARDS } from './tokyo'

function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

const text = (label: string, max: number) => v.pipe(v.string(), v.trim(), v.minLength(1, `請填寫${label}。`), v.maxLength(max, `${label}過長。`))
const optionalText = v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(200))))
const positiveArea = v.optional(v.nullable(v.pipe(v.number(), v.finite(), v.minValue(0.01, '面積必須大於零。'), v.maxValue(100000))))
const fee = v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))))

export const adminPropertyInputSchema = v.object({
  propertyType: v.picklist(['condominium', 'detached_house']),
  buildStatus: v.picklist(['new', 'resale']),
  status: v.picklist(['draft', 'published', 'withdrawn']),
  titleZhTw: text('標題', 200),
  descriptionZhTw: text('物件說明', 20000),
  priceYen: v.pipe(v.number(), v.integer(), v.minValue(1, '價格必須大於零。'), v.maxValue(Number.MAX_SAFE_INTEGER)),
  ward: v.pipe(v.string(), v.check(value => TOKYO_23_WARDS.includes(value), '請選擇東京23區。')),
  addressZhTw: text('所在地', 500),
  layout: text('格局', 50),
  floorAreaSqm: positiveArea,
  landAreaSqm: positiveArea,
  buildingAreaSqm: positiveArea,
  builtOn: v.pipe(v.string(), v.regex(/^\d{4}-(0[1-9]|1[0-2])$/, '築年月格式須為 YYYY-MM。'), v.check(value => value >= '1800-01', '築年月無效。')),
  structure: optionalText,
  floorNumber: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(-20), v.maxValue(200), v.check(value => value !== 0, '所在樓層不可為零。')))),
  totalFloors: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(200)))),
  landRights: v.optional(v.nullable(v.picklist(['所有權', '借地權', '定期借地權', '舊法借地權'], '土地權利無效。'))),
  managementFeeYen: fee,
  repairReserveYen: fee,
  transactionMode: v.optional(v.nullable(v.picklist(['仲介', '賣主', '代理'], '交易型態無效。'))),
  equipmentZhTw: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(2000)))),
  nextUpdateOn: v.pipe(v.string(), v.check(isCalendarDate, '下次更新日須為有效的 YYYY-MM-DD 日期。'), v.check(value => value >= '2000-01-01' && value <= '2100-12-31', '下次更新日須介於2000年至2100年。')),
  transitEntries: v.pipe(v.array(v.object({
    stationId: text('車站', 100),
    walkingMinutes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(180, '步行時間不可超過180分鐘。')),
  })), v.maxLength(10, '交通最多10筆。'), v.check(entries => new Set(entries.map(entry => entry.stationId)).size === entries.length, '車站不可重複。')),
})

export type AdminPropertyInput = v.InferOutput<typeof adminPropertyInputSchema>

export function tokyoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now)
}

export function propertyDateError(input: Pick<AdminPropertyInput, 'buildStatus' | 'builtOn'>, now = new Date()): string | null {
  const month = tokyoDate(now).slice(0, 7)
  if (input.builtOn > `${Number(month.slice(0, 4)) + 5}-12`)
    return '築年月不得超過未來5年。'
  if (input.buildStatus === 'resale' && input.builtOn > month)
    return '中古物件的築年月不可在未來。'
  return null
}

export interface AdminPropertyListItem {
  id: string
  propertyNumber: string
  titleZhTw: string
  status: 'draft' | 'published' | 'withdrawn'
  ward: string
  nextUpdateOn: string
  updatedAt: string
}

export interface AdminTransitEntry {
  id: string
  stationId: string
  walkingMinutes: number
}

export interface AdminImageSummary {
  id: string
  isCover: boolean
  kind: 'photo' | 'floor_plan'
  position: number
  altZhTw: string
}

export type AdminPropertyDetail = Required<Omit<AdminPropertyInput, 'transitEntries' | 'landRights' | 'transactionMode'>> & {
  landRights: string | null
  transactionMode: string | null
  transitEntries: AdminTransitEntry[]
  images: AdminImageSummary[]
}

export const adminImagesInputSchema = v.object({
  photos: v.pipe(v.array(v.object({ id: text('圖片識別碼', 100), altZhTw: text('圖片說明', 200) })), v.maxLength(20), v.check(photos => new Set(photos.map(photo => photo.id)).size === photos.length, '照片不可重複。')),
  coverImageId: v.nullable(text('封面識別碼', 100)),
  floorPlanId: v.optional(v.nullable(text('格局圖識別碼', 100))),
  floorPlanAltZhTw: v.optional(text('格局圖說明', 200)),
})

export type AdminImagesInput = v.InferOutput<typeof adminImagesInputSchema>

export const adminImageRecoverySchema = v.object({
  objectKey: v.pipe(v.string(), v.regex(/^[a-z0-9]{24}$/, '復原檔案識別碼無效。')),
  token: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/, '復原憑證無效。')),
})

export type AdminImageRecovery = v.InferOutput<typeof adminImageRecoverySchema>

export const adminImageRecoveryErrorSchema = v.object({
  data: v.object({ data: v.object({ cleanupQueued: v.literal(false), recovery: adminImageRecoverySchema }) }),
})

export interface AdminAgencyOperationScope {
  agencyId: string
  epoch: number
}

export function createAgencyViewScope(readAgencyId: () => string | undefined) {
  const openedBy = readAgencyId()
  let epoch = 0
  let active = !!openedBy
  return {
    capture(): AdminAgencyOperationScope | undefined {
      const agencyId = readAgencyId()
      if (!active || !agencyId || agencyId !== openedBy)
        return undefined
      return { agencyId, epoch }
    },
    isCurrent(scope: AdminAgencyOperationScope | undefined): boolean {
      return active && !!scope && scope.agencyId === openedBy && scope.epoch === epoch && readAgencyId() === openedBy
    },
    ownsView(): boolean {
      return active && readAgencyId() === openedBy
    },
    retire() {
      active = false
      epoch++
    },
  }
}

export function publicationErrors(input: AdminPropertyInput, images: AdminImageSummary[]): string[] {
  const errors: string[] = []
  if (!input.structure)
    errors.push('結構')
  if (input.totalFloors == null)
    errors.push('總樓層')
  if (!input.landRights)
    errors.push('土地權利')
  if (!input.transactionMode)
    errors.push('交易型態')
  if (input.propertyType === 'condominium') {
    if (input.floorAreaSqm == null)
      errors.push('專有面積')
    if (input.floorNumber == null)
      errors.push('所在樓層')
    if (input.managementFeeYen == null)
      errors.push('管理費，無費用請填0')
    if (input.repairReserveYen == null)
      errors.push('修繕積立金，無費用請填0')
  }
  else {
    if (input.landAreaSqm == null)
      errors.push('土地面積')
    if (input.buildingAreaSqm == null)
      errors.push('建物面積')
  }
  if (!input.transitEntries.length)
    errors.push('至少一筆交通')
  const photos = images.filter(image => image.kind === 'photo')
  if (!photos.length || photos.length > 20)
    errors.push('1至20張照片')
  if (images.filter(image => image.kind === 'floor_plan').length !== 1)
    errors.push('一張格局圖')
  if (photos.filter(image => image.isCover).length !== 1)
    errors.push('一張照片封面')
  if (images.some(image => !image.altZhTw.trim()))
    errors.push('圖片說明')
  return errors
}

export function propertyColumns(input: AdminPropertyInput) {
  return {
    status: input.status,
    propertyType: input.propertyType,
    buildStatus: input.buildStatus,
    titleZhTw: input.titleZhTw,
    descriptionZhTw: input.descriptionZhTw,
    priceYen: input.priceYen,
    ward: input.ward,
    addressZhTw: input.addressZhTw,
    layout: input.layout,
    floorAreaSqm: input.propertyType === 'condominium' ? input.floorAreaSqm ?? null : null,
    landAreaSqm: input.propertyType === 'detached_house' ? input.landAreaSqm ?? null : null,
    buildingAreaSqm: input.propertyType === 'detached_house' ? input.buildingAreaSqm ?? null : null,
    builtOn: input.builtOn,
    structure: input.structure ?? null,
    floorNumber: input.propertyType === 'condominium' ? input.floorNumber ?? null : null,
    totalFloors: input.totalFloors ?? null,
    landRights: input.landRights ?? null,
    managementFeeYen: input.propertyType === 'condominium' ? input.managementFeeYen ?? null : null,
    repairReserveYen: input.propertyType === 'condominium' ? input.repairReserveYen ?? null : null,
    transactionMode: input.transactionMode ?? null,
    equipmentZhTw: input.equipmentZhTw ?? null,
    nextUpdateOn: input.nextUpdateOn,
  }
}
