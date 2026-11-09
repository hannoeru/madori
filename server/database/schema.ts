import type { TransitEntry } from '../../shared/property'
import { createId } from '@paralleldrive/cuid2'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const properties = sqliteTable('properties', {
  id: text().primaryKey().$defaultFn(createId),
  status: text({ enum: ['draft', 'published'] }).notNull(),
  propertyType: text('property_type', { enum: ['condominium', 'detached_house'] }).notNull(),
  buildStatus: text('build_status', { enum: ['new', 'resale'] }).notNull(),
  titleZhTw: text('title_zh_tw').notNull(),
  descriptionZhTw: text('description_zh_tw').notNull(),
  priceYen: integer('price_yen').notNull(),
  ward: text().notNull(),
  addressZhTw: text('address_zh_tw').notNull(),
  layout: text().notNull(),
  floorAreaSqm: real('floor_area_sqm'),
  landAreaSqm: real('land_area_sqm'),
  buildingAreaSqm: real('building_area_sqm'),
  builtOn: text('built_on').notNull(),
  structure: text(),
  floorNumber: integer('floor_number'),
  totalFloors: integer('total_floors'),
  landRights: text('land_rights'),
  managementFeeYen: integer('management_fee_yen'),
  repairReserveYen: integer('repair_reserve_yen'),
  equipmentZhTw: text('equipment_zh_tw'),
  transit: text({ mode: 'json' }).$type<TransitEntry[]>().notNull(),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
}, table => [
  index('properties_status_idx').on(table.status, table.publishedAt),
])

export const propertyImages = sqliteTable('property_images', {
  id: text().primaryKey().$defaultFn(createId),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  kind: text({ enum: ['floor_plan', 'photo'] }).notNull(),
  position: integer().notNull(),
  isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
}, table => [
  uniqueIndex('property_images_position_idx').on(table.propertyId, table.kind, table.position),
])
