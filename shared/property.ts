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
  slug: v.string(),
  titleZhTw: v.string(),
  priceYen: v.number(),
  ward: v.string(),
  layout: v.string(),
  floorAreaSqm: v.number(),
  builtOn: v.string(),
  propertyType: v.picklist(['condominium', 'detached_house']),
  images: v.array(propertyImageSummarySchema),
  transitEntries: v.array(propertyTransitEntrySchema),
})

export type PropertyQuery = v.InferOutput<typeof propertyQuerySchema>
export type PropertySummary = v.InferOutput<typeof propertySummarySchema>
