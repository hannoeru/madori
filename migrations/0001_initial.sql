CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  property_number TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'withdrawn')),
  property_type TEXT NOT NULL CHECK (property_type IN ('condominium', 'detached_house')),
  build_status TEXT NOT NULL CHECK (build_status IN ('new', 'resale')),
  title_zh_tw TEXT NOT NULL,
  description_zh_tw TEXT NOT NULL,
  price_yen INTEGER NOT NULL CHECK (price_yen > 0),
  ward TEXT NOT NULL,
  address_zh_tw TEXT NOT NULL,
  layout TEXT NOT NULL,
  floor_area_sqm REAL NOT NULL CHECK (floor_area_sqm > 0),
  built_on TEXT NOT NULL,
  next_update_on TEXT NOT NULL,
  published_at TEXT,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE property_transit_entries (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  line_name_zh_tw TEXT NOT NULL,
  station_name_zh_tw TEXT NOT NULL,
  walking_minutes INTEGER NOT NULL CHECK (walking_minutes >= 0)
);

CREATE TABLE property_images (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('floor_plan', 'photo')),
  position INTEGER NOT NULL CHECK (position >= 0),
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  alt_zh_tw TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(property_id, kind, position)
);

CREATE INDEX properties_public_search_idx ON properties(status, ward, property_type, build_status, price_yen, floor_area_sqm);
CREATE INDEX listing_transit_search_idx ON property_transit_entries(station_name_zh_tw, walking_minutes, property_id);
CREATE INDEX properties_freshness_idx ON properties(status, next_update_on);
