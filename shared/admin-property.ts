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
  nextUpdateOn: v.pipe(v.string(), v.trim(), v.minLength(1)),
  transitEntries: v.array(transitEntryInputSchema),
})

export type AdminPropertyInput = v.InferOutput<typeof adminPropertyInputSchema>
