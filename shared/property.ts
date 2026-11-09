import * as v from 'valibot'
import { TOKYO_23_WARDS } from './tokyo'

const text = (label: string, max: number) => v.pipe(v.string(), v.trim(), v.minLength(1, `請填寫${label}。`), v.maxLength(max, `${label}過長。`))
const optionalText = (max: number) => v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(max)))
const area = v.nullable(v.pipe(v.number('請輸入數字。'), v.finite('請輸入數字。'), v.minValue(0.01, '面積必須大於零。')))
const fee = v.nullable(v.pipe(v.number('請輸入數字。'), v.integer('請輸入整數。'), v.minValue(0, '費用不可小於零。')))
const floors = v.nullable(v.pipe(v.number('請輸入數字。'), v.integer('請輸入整數。'), v.minValue(-20), v.maxValue(200)))

export const transitEntrySchema = v.object({
  line: text('路線', 50),
  station: text('車站', 50),
  walkingMinutes: v.pipe(v.number('請輸入步行分鐘。'), v.integer('請輸入整數。'), v.minValue(0), v.maxValue(180)),
})

export type TransitEntry = v.InferOutput<typeof transitEntrySchema>

export const propertyInputSchema = v.object({
  status: v.picklist(['draft', 'published']),
  propertyType: v.picklist(['condominium', 'detached_house']),
  buildStatus: v.picklist(['new', 'resale']),
  titleZhTw: text('標題', 200),
  descriptionZhTw: text('物件說明', 20000),
  priceYen: v.pipe(v.number('請輸入價格。'), v.integer('請輸入整數。'), v.minValue(1, '價格必須大於零。')),
  ward: v.picklist(TOKYO_23_WARDS, '請選擇東京23區。'),
  addressZhTw: text('所在地', 500),
  layout: text('格局', 50),
  floorAreaSqm: area,
  landAreaSqm: area,
  buildingAreaSqm: area,
  builtOn: v.pipe(v.string(), v.regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, '請選擇築年月。')),
  structure: optionalText(200),
  floorNumber: floors,
  totalFloors: floors,
  landRights: optionalText(50),
  managementFeeYen: fee,
  repairReserveYen: fee,
  equipmentZhTw: optionalText(2000),
  transit: v.pipe(v.array(transitEntrySchema), v.maxLength(5, '交通最多5筆。')),
})

export type PropertyInput = v.InferOutput<typeof propertyInputSchema>

export interface PropertyImage {
  id: string
  kind: 'photo' | 'floor_plan'
  isCover: boolean
}

export interface PropertyFacts {
  id: string
  propertyType: PropertyInput['propertyType']
  titleZhTw: string
  priceYen: number
  ward: string
  layout: string
  floorAreaSqm: number | null
  landAreaSqm: number | null
  buildingAreaSqm: number | null
  builtOn: string
  transit: TransitEntry[]
}

export interface PropertySummary extends PropertyFacts {
  coverImageId: string | null
  publishedAt: string | null
}

export interface PropertyDetail extends PropertyFacts {
  buildStatus: PropertyInput['buildStatus']
  descriptionZhTw: string
  addressZhTw: string
  structure: string | null
  floorNumber: number | null
  totalFloors: number | null
  landRights: string | null
  managementFeeYen: number | null
  repairReserveYen: number | null
  equipmentZhTw: string | null
  updatedAt: string
  images: PropertyImage[]
}

export interface AdminPropertyListItem {
  id: string
  titleZhTw: string
  status: PropertyInput['status']
  ward: string
  priceYen: number
  updatedAt: string
}

export type AdminPropertyDetail = PropertyInput & { images: PropertyImage[] }

export function publicationErrors(input: Pick<PropertyInput, 'propertyType' | 'floorAreaSqm' | 'landAreaSqm' | 'buildingAreaSqm'>, images: Pick<PropertyImage, 'kind'>[]): string[] {
  const missing: string[] = []
  if (input.propertyType === 'condominium' && input.floorAreaSqm == null)
    missing.push('專有面積')
  if (input.propertyType === 'detached_house' && input.landAreaSqm == null)
    missing.push('土地面積')
  if (input.propertyType === 'detached_house' && input.buildingAreaSqm == null)
    missing.push('建物面積')
  if (!images.some(image => image.kind === 'photo'))
    missing.push('至少一張照片')
  return missing
}

export function propertyColumns(input: PropertyInput) {
  const condominium = input.propertyType === 'condominium'
  return {
    ...input,
    floorAreaSqm: condominium ? input.floorAreaSqm : null,
    floorNumber: condominium ? input.floorNumber : null,
    managementFeeYen: condominium ? input.managementFeeYen : null,
    repairReserveYen: condominium ? input.repairReserveYen : null,
    landAreaSqm: condominium ? null : input.landAreaSqm,
    buildingAreaSqm: condominium ? null : input.buildingAreaSqm,
  }
}
