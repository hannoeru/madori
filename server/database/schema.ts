import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const agencies = sqliteTable('agencies', {
  id: text().primaryKey().$defaultFn(createId),
  name: text().notNull(),
  email: text().notNull().unique(),
  license: text().notNull(),
  lineUrl: text('line_url').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
})

export const buyers = sqliteTable('buyers', {
  id: text().primaryKey().$defaultFn(createId),
  name: text().notNull(),
  email: text().notNull().unique(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const authTokens = sqliteTable('auth_tokens', {
  id: text().primaryKey().$defaultFn(createId),
  email: text().notNull(),
  role: text({ enum: ['agency', 'buyer'] }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, table => [
  index('auth_tokens_identity_idx').on(table.email, table.role),
  check('auth_tokens_role_check', sql`${table.role} IN ('agency', 'buyer')`),
])

export const lines = sqliteTable('lines', {
  id: text().primaryKey().$defaultFn(createId),
  nameJa: text('name_ja').notNull().unique(),
  nameZhTw: text('name_zh_tw').notNull(),
})

export const stations = sqliteTable('stations', {
  id: text().primaryKey().$defaultFn(createId),
  lineId: text('line_id').notNull().references(() => lines.id, { onDelete: 'cascade' }),
  nameJa: text('name_ja').notNull(),
  nameZhTw: text('name_zh_tw').notNull(),
}, table => [
  uniqueIndex('stations_line_name_idx').on(table.lineId, table.nameJa),
])

export const properties = sqliteTable('properties', {
  id: text().primaryKey().$defaultFn(createId),
  propertyNumber: text('property_number').notNull().unique(),
  agencyId: text('agency_id').notNull().references(() => agencies.id, { onDelete: 'restrict' }),
  status: text({ enum: ['draft', 'published', 'withdrawn'] }).notNull(),
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
  transactionMode: text('transaction_mode'),
  equipmentZhTw: text('equipment_zh_tw'),
  nextUpdateOn: text('next_update_on').notNull(),
  publishedAt: text('published_at'),
  withdrawnAt: text('withdrawn_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
}, table => [
  check('properties_status_check', sql`${table.status} IN ('draft', 'published', 'withdrawn')`),
  check('properties_type_check', sql`${table.propertyType} IN ('condominium', 'detached_house')`),
  check('properties_build_status_check', sql`${table.buildStatus} IN ('new', 'resale')`),
  check('properties_price_check', sql`${table.priceYen} > 0`),
  check('properties_floor_area_check', sql`${table.floorAreaSqm} IS NULL OR ${table.floorAreaSqm} > 0`),
  check('properties_land_area_check', sql`${table.landAreaSqm} IS NULL OR ${table.landAreaSqm} > 0`),
  check('properties_building_area_check', sql`${table.buildingAreaSqm} IS NULL OR ${table.buildingAreaSqm} > 0`),
  check('properties_fee_check', sql`${table.managementFeeYen} IS NULL OR ${table.managementFeeYen} >= 0`),
  check('properties_reserve_check', sql`${table.repairReserveYen} IS NULL OR ${table.repairReserveYen} >= 0`),
  index('properties_public_search_idx').on(table.status, table.ward, table.propertyType, table.buildStatus, table.priceYen, table.floorAreaSqm),
  index('properties_freshness_idx').on(table.status, table.nextUpdateOn),
  index('properties_agency_idx').on(table.agencyId),
])

export const savedProperties = sqliteTable('saved_properties', {
  buyerId: text('buyer_id').notNull().references(() => buyers.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, table => [
  primaryKey({ columns: [table.buyerId, table.propertyId] }),
])

export const inquiries = sqliteTable('inquiries', {
  id: text().primaryKey().$defaultFn(createId),
  buyerId: text('buyer_id').notNull().references(() => buyers.id, { onDelete: 'restrict' }),
  agencyId: text('agency_id').notNull().references(() => agencies.id, { onDelete: 'restrict' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  submissionKey: text('submission_key').notNull(),
  propertyTitle: text('property_title').notNull(),
  propertyNumber: text('property_number').notNull(),
  buyerName: text('buyer_name').notNull(),
  buyerEmail: text('buyer_email').notNull(),
  message: text().notNull(),
  notificationStatus: text('notification_status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
  notificationError: text('notification_error'),
  notifiedAt: text('notified_at'),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, table => [
  uniqueIndex('inquiries_submission_idx').on(table.buyerId, table.submissionKey),
  index('inquiries_buyer_idx').on(table.buyerId, table.createdAt),
  index('inquiries_agency_idx').on(table.agencyId, table.createdAt),
  check('inquiries_notification_check', sql`${table.notificationStatus} IN ('pending', 'sent', 'failed')`),
])

export const propertyTransitEntries = sqliteTable('property_transit_entries', {
  id: text().primaryKey().$defaultFn(createId),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  stationId: text('station_id').notNull().references(() => stations.id, { onDelete: 'restrict' }),
  walkingMinutes: integer('walking_minutes').notNull(),
}, table => [
  check('property_transit_walk_check', sql`${table.walkingMinutes} >= 0`),
  index('property_transit_search_idx').on(table.stationId, table.walkingMinutes, table.propertyId),
])

export const pendingImageDeletions = sqliteTable('pending_image_deletions', {
  objectKey: text('object_key').primaryKey(),
  agencyId: text('agency_id').notNull().references(() => agencies.id, { onDelete: 'restrict' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, table => [
  index('pending_image_deletions_agency_idx').on(table.agencyId),
])

export const propertyImages = sqliteTable('property_images', {
  id: text().primaryKey().$defaultFn(createId),
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
