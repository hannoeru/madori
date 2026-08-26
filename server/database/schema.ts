import { sql } from 'drizzle-orm'
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const properties = sqliteTable('properties', {
  id: text().primaryKey(),
  propertyNumber: text('property_number').notNull().unique(),
  slug: text().notNull().unique(),
  status: text({ enum: ['draft', 'published', 'withdrawn'] }).notNull(),
  propertyType: text('property_type', { enum: ['condominium', 'detached_house'] }).notNull(),
  buildStatus: text('build_status', { enum: ['new', 'resale'] }).notNull(),
  titleZhTw: text('title_zh_tw').notNull(),
  descriptionZhTw: text('description_zh_tw').notNull(),
  priceYen: integer('price_yen').notNull(),
  ward: text().notNull(),
  addressZhTw: text('address_zh_tw').notNull(),
  layout: text().notNull(),
  floorAreaSqm: real('floor_area_sqm').notNull(),
  builtOn: text('built_on').notNull(),
  nextUpdateOn: text('next_update_on').notNull(),
  publishedAt: text('published_at'),
  withdrawnAt: text('withdrawn_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  check('properties_status_check', sql`${table.status} IN ('draft', 'published', 'withdrawn')`),
  check('properties_type_check', sql`${table.propertyType} IN ('condominium', 'detached_house')`),
  check('properties_build_status_check', sql`${table.buildStatus} IN ('new', 'resale')`),
  check('properties_price_check', sql`${table.priceYen} > 0`),
  check('properties_area_check', sql`${table.floorAreaSqm} > 0`),
  index('properties_public_search_idx').on(table.status, table.ward, table.propertyType, table.buildStatus, table.priceYen, table.floorAreaSqm),
  index('properties_freshness_idx').on(table.status, table.nextUpdateOn),
])

export const propertyTransitEntries = sqliteTable('property_transit_entries', {
  id: text().primaryKey(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  lineNameZhTw: text('line_name_zh_tw').notNull(),
  stationNameZhTw: text('station_name_zh_tw').notNull(),
  walkingMinutes: integer('walking_minutes').notNull(),
}, table => [
  check('property_transit_walk_check', sql`${table.walkingMinutes} >= 0`),
  index('property_transit_search_idx').on(table.stationNameZhTw, table.walkingMinutes, table.propertyId),
])

export const propertyImages = sqliteTable('property_images', {
  id: text().primaryKey(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull().unique(),
  kind: text({ enum: ['floor_plan', 'photo'] }).notNull(),
  position: integer().notNull(),
  isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
  altZhTw: text('alt_zh_tw').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  check('property_images_kind_check', sql`${table.kind} IN ('floor_plan', 'photo')`),
  check('property_images_position_check', sql`${table.position} >= 0`),
  uniqueIndex('property_images_position_idx').on(table.propertyId, table.kind, table.position),
])
