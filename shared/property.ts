import * as v from 'valibot'

const optionalNumber = v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(0)))

export const propertyQuerySchema = v.object({
  ward: v.optional(v.string()),
  propertyType: v.optional(v.picklist(['condominium', 'detached_house'])),
  buildStatus: v.optional(v.picklist(['new', 'resale'])),
  layout: v.optional(v.string()),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minFloorArea: optionalNumber,
  maxFloorArea: optionalNumber,
  station: v.optional(v.string()),
  maxWalkingMinutes: optionalNumber,
})

export const propertyImageSummarySchema = v.object({
  id: v.string(),
  isCover: v.boolean(),
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
  transitEntries: v.array(v.object({
    id: v.string(),
    lineNameZhTw: v.string(),
    stationNameZhTw: v.string(),
    lineNameJa: v.string(),
    stationNameJa: v.string(),
    walkingMinutes: v.number(),
  })),
})

export type PropertyDetail = v.InferOutput<typeof propertyDetailSchema>
export type PropertyQuery = v.InferOutput<typeof propertyQuerySchema>
export type PropertySummary = v.InferOutput<typeof propertySummarySchema>
