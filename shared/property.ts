import * as v from 'valibot'
import { TOKYO_23_WARDS } from './tokyo'

const optionalNumber = v.optional(v.pipe(v.string(), v.trim(), v.transform(value => value === '' ? undefined : Number(value)), v.optional(v.pipe(v.number('請輸入有效數字。'), v.finite('請輸入有效數字。'), v.minValue(0, '數值不能小於 0。'), v.maxValue(1_000_000_000_000, '數值過大。')))))

export const propertyQuerySchema = v.pipe(v.object({
  ward: v.optional(v.picklist(TOKYO_23_WARDS)),
  propertyType: v.optional(v.picklist(['condominium', 'detached_house'])),
  buildStatus: v.optional(v.picklist(['new', 'resale'])),
  layout: v.optional(v.string()),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minFloorArea: optionalNumber,
  maxFloorArea: optionalNumber,
  lineId: v.optional(v.string()),
  stationId: v.optional(v.string()),
  maxAgeYears: v.pipe(optionalNumber, v.check(value => value === undefined || (Number.isInteger(value) && value <= 200), '屋齡請輸入 0 到 200 之間的整數。')),
  maxWalkingMinutes: v.pipe(optionalNumber, v.check(value => value === undefined || (Number.isInteger(value) && value <= 120), '步行分鐘請輸入 0 到 120 之間的整數。')),
  sort: v.optional(v.picklist(['newest', 'price_asc', 'price_desc', 'area_desc'])),
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1), v.maxValue(10000)), '1'),
  pageSize: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1), v.maxValue(24)), '12'),
}), v.forward(v.check(query => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, '最高價格不可低於最低價格。'), ['maxPrice']), v.forward(v.check(query => query.minFloorArea === undefined || query.maxFloorArea === undefined || query.minFloorArea <= query.maxFloorArea, '最大面積不可低於最小面積。'), ['maxFloorArea']))

export const propertyImageSummarySchema = v.object({
  id: v.string(),
  isCover: v.boolean(),
  kind: v.picklist(['photo', 'floor_plan']),
  position: v.number(),
  altZhTw: v.string(),
})

export const propertyTransitEntrySchema = v.object({
  id: v.string(),
  stationNameZhTw: v.string(),
  walkingMinutes: v.number(),
})

export const propertySummarySchema = v.object({
  id: v.string(),
  titleZhTw: v.string(),
  priceYen: v.number(),
  ward: v.string(),
  layout: v.string(),
  floorAreaSqm: v.nullable(v.number()),
  landAreaSqm: v.nullable(v.number()),
  buildingAreaSqm: v.nullable(v.number()),
  builtOn: v.string(),
  propertyType: v.picklist(['condominium', 'detached_house']),
  images: v.array(propertyImageSummarySchema),
  transitEntries: v.array(propertyTransitEntrySchema),
})

export const propertyDetailSchema = v.object({
  id: v.string(),
  titleZhTw: v.string(),
  descriptionZhTw: v.string(),
  priceYen: v.number(),
  ward: v.string(),
  addressZhTw: v.string(),
  layout: v.string(),
  floorAreaSqm: v.nullable(v.number()),
  landAreaSqm: v.nullable(v.number()),
  buildingAreaSqm: v.nullable(v.number()),
  builtOn: v.string(),
  structure: v.nullable(v.string()),
  floorNumber: v.nullable(v.number()),
  totalFloors: v.nullable(v.number()),
  landRights: v.nullable(v.string()),
  managementFeeYen: v.nullable(v.number()),
  repairReserveYen: v.nullable(v.number()),
  transactionMode: v.nullable(v.string()),
  equipmentZhTw: v.nullable(v.string()),
  propertyType: v.picklist(['condominium', 'detached_house']),
  buildStatus: v.picklist(['new', 'resale']),
  nextUpdateOn: v.string(),
  updatedAt: v.string(),
  images: v.array(propertyImageSummarySchema),
  agency: v.object({
    name: v.string(),
    license: v.string(),
    lineUrl: v.string(),
  }),
  transitEntries: v.array(v.object({
    id: v.string(),
    lineNameZhTw: v.string(),
    stationNameZhTw: v.string(),
    lineNameJa: v.string(),
    stationNameJa: v.string(),
    walkingMinutes: v.number(),
  })),
})

export const propertySearchResultsSchema = v.object({
  items: v.array(propertySummarySchema),
  total: v.number(),
  page: v.number(),
  pageSize: v.number(),
})

export type PropertySearchResults = v.InferOutput<typeof propertySearchResultsSchema>
export type PropertySearchForm = Partial<v.InferInput<typeof propertyQuerySchema>>
export type PropertyDetail = v.InferOutput<typeof propertyDetailSchema>
export type PropertyQuery = v.InferOutput<typeof propertyQuerySchema>
export type PropertySummary = v.InferOutput<typeof propertySummarySchema>
