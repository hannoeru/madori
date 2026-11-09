import * as v from 'valibot'
import { propertySummarySchema } from './property'

export const savedPropertySchema = v.variant('kind', [
  v.object({
    kind: v.literal('available'),
    propertyId: v.string(),
    createdAt: v.string(),
    property: propertySummarySchema,
  }),
  v.object({
    kind: v.literal('unavailable'),
    propertyId: v.string(),
    createdAt: v.string(),
  }),
])

export const savedPropertiesSchema = v.object({ items: v.array(savedPropertySchema) })
export type SavedProperty = v.InferOutput<typeof savedPropertySchema>
export type SavedProperties = v.InferOutput<typeof savedPropertiesSchema>
