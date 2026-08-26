import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  updatedAt: text('updated_at').notNull()
}, table => [
  index('properties_public_search_idx').on(table.status, table.ward, table.propertyType, table.buildStatus, table.priceYen, table.floorAreaSqm),
  index('properties_freshness_idx').on(table.status, table.nextUpdateOn)
])

export const propertyTransitEntries = sqliteTable('property_transit_entries', {
  id: text().primaryKey(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  lineNameZhTw: text('line_name_zh_tw').notNull(),
  stationNameZhTw: text('station_name_zh_tw').notNull(),
  walkingMinutes: integer('walking_minutes').notNull()
}, table => [index('property_transit_search_idx').on(table.stationNameZhTw, table.walkingMinutes, table.propertyId)])

export const propertyImages = sqliteTable('property_images', {
  id: text().primaryKey(),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull().unique(),
  kind: text({ enum: ['floor_plan', 'photo'] }).notNull(),
  position: integer().notNull(),
  isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
  altZhTw: text('alt_zh_tw').notNull(),
  createdAt: text('created_at').notNull()
}, table => [uniqueIndex('property_images_position_idx').on(table.propertyId, table.kind, table.position)])
