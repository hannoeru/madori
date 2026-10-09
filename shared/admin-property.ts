import * as v from 'valibot'

const transitEntryInputSchema = v.object({
  stationId: v.string(),
  walkingMinutes: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

const nullableNumber = v.nullable(v.number())
const nullableString = v.nullable(v.string())

export const adminPropertyInputSchema = v.object({
  propertyType: v.picklist(['condominium', 'detached_house']),
  buildStatus: v.picklist(['new', 'resale']),
  status: v.picklist(['draft', 'published', 'withdrawn']),
  titleZhTw: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  descriptionZhTw: v.pipe(v.string(), v.trim(), v.minLength(1)),
  priceYen: v.pipe(v.number(), v.integer(), v.minValue(1)),
  ward: v.pipe(v.string(), v.trim(), v.minLength(1)),
  addressZhTw: v.pipe(v.string(), v.trim(), v.minLength(1)),
  layout: v.pipe(v.string(), v.trim(), v.minLength(1)),
  floorAreaSqm: v.optional(nullableNumber),
  landAreaSqm: v.optional(nullableNumber),
  buildingAreaSqm: v.optional(nullableNumber),
  builtOn: v.pipe(v.string(), v.trim(), v.minLength(1)),
  structure: v.optional(nullableString),
  floorNumber: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  totalFloors: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  landRights: v.optional(nullableString),
  managementFeeYen: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  repairReserveYen: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  transactionMode: v.optional(nullableString),
  equipmentZhTw: v.optional(nullableString),
  nextUpdateOn: v.pipe(v.string(), v.trim(), v.minLength(1)),
  transitEntries: v.array(transitEntryInputSchema),
})

export type AdminPropertyInput = v.InferOutput<typeof adminPropertyInputSchema>

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
}

export interface AdminPropertyDetail {
  propertyType: 'condominium' | 'detached_house'
  buildStatus: 'new' | 'resale'
  status: 'draft' | 'published' | 'withdrawn'
  titleZhTw: string
  descriptionZhTw: string
  priceYen: number
  ward: string
  addressZhTw: string
  layout: string
  floorAreaSqm: number | null
  landAreaSqm: number | null
  buildingAreaSqm: number | null
  builtOn: string
  structure: string | null
  floorNumber: number | null
  totalFloors: number | null
  landRights: string | null
  managementFeeYen: number | null
  repairReserveYen: number | null
  transactionMode: string | null
  equipmentZhTw: string | null
  nextUpdateOn: string
  transitEntries: AdminTransitEntry[]
  images: AdminImageSummary[]
}

export function propertyTypeAreaError(input: AdminPropertyInput): string | null {
  if (input.propertyType === 'condominium' && input.floorAreaSqm == null)
    return '公寓需填寫專有面積。'
  if (input.propertyType === 'detached_house' && (input.landAreaSqm == null || input.buildingAreaSqm == null))
    return '獨棟住宅需填寫土地面積與建物面積。'
  return null
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
    floorAreaSqm: input.floorAreaSqm ?? null,
    landAreaSqm: input.landAreaSqm ?? null,
    buildingAreaSqm: input.buildingAreaSqm ?? null,
    builtOn: input.builtOn,
    structure: input.structure ?? null,
    floorNumber: input.floorNumber ?? null,
    totalFloors: input.totalFloors ?? null,
    landRights: input.landRights ?? null,
    managementFeeYen: input.managementFeeYen ?? null,
    repairReserveYen: input.repairReserveYen ?? null,
    transactionMode: input.transactionMode ?? null,
    equipmentZhTw: input.equipmentZhTw ?? null,
    nextUpdateOn: input.nextUpdateOn,
  }
}
