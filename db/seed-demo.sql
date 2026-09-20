INSERT OR IGNORE INTO agencies (id, name, email, license, line_url, created_at, updated_at) VALUES
  ('agency-demo-taipei', '台日置產顧問', 'demo-taipei@example.com', '經紀業字第001234號', 'https://line.me/ti/p/demo-taipei', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('agency-demo-tokyo', '東京灣不動產株式会社', 'demo-tokyo@example.com', '宅建業 東京都知事(1)第100000号', 'https://line.me/ti/p/demo-tokyo', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');

INSERT OR IGNORE INTO properties (id, property_number, agency_id, status, property_type, build_status, title_zh_tw, description_zh_tw, price_yen, ward, address_zh_tw, layout, floor_area_sqm, land_area_sqm, building_area_sqm, built_on, structure, floor_number, total_floors, land_rights, management_fee_yen, repair_reserve_yen, transaction_mode, equipment_zh_tw, next_update_on, published_at, withdrawn_at, created_at, updated_at) VALUES
  ('prop-demo-1', 'MD-DEMO-001', 'agency-demo-taipei', 'published', 'condominium', 'resale', '澀谷站步行4分鐘｜高樓層 2LDK', '採光良好的高樓層公寓，眺望開闊。步行4分鐘到澀谷站，生活機能完善。', 78000000, '澀谷區', '東京都澀谷區神南一丁目2-3', '2LDK', 55.6, NULL, NULL, '2018-03', 'RC', 12, 20, '所有權', 14500, 9800, '仲介', NULL, '2026-12-31', '2026-09-10T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
  ('prop-demo-2', 'MD-DEMO-002', 'agency-demo-tokyo', 'published', 'condominium', 'resale', '中目黑站步行3分鐘｜1LDK', '近賞櫻名所目黑川，安靜住宅區。步行3分鐘到中目黑站。', 48000000, '目黑區', '東京都目黑區上目黑二丁目5', '1LDK', 38.2, NULL, NULL, '2019-06', 'RC', 5, 9, '所有權', 10800, 7200, '仲介', NULL, '2026-12-31', '2026-09-10T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
  ('prop-demo-3', 'MD-DEMO-003', 'agency-demo-taipei', 'published', 'detached_house', 'resale', '自由之丘徒步6分鐘｜靜巷獨棟住宅', '綠意環繞的靜巷獨棟住宅，附車位。適合三代同堂。', 118000000, '世田谷區', '東京都世田谷區奥沢三丁目12', '3LDK', NULL, 80.5, 105.2, '2015-10', '木造', NULL, NULL, '所有權', NULL, NULL, '仲介', NULL, '2026-12-31', '2026-09-10T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
  ('prop-demo-4', 'MD-DEMO-004', 'agency-demo-tokyo', 'published', 'condominium', 'resale', '品川站步行8分鐘｜3LDK 塔樓', '高層塔樓，眺望東京灣。步行8分鐘到品川站，直達羽田機場。', 128000000, '港區', '東京都港區港南二丁目16', '3LDK', 72.8, NULL, NULL, '2020-12', 'SRC', 22, 30, '所有權', 19800, 12000, '賣主', NULL, '2026-12-31', '2026-09-10T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z');

INSERT OR IGNORE INTO property_transit_entries (id, property_id, station_id, walking_minutes) VALUES
  ('tr-demo-1a', 'prop-demo-1', 'st-yamanote-shibuya', 4),
  ('tr-demo-1b', 'prop-demo-1', 'st-hanzomon-shibuya', 4),
  ('tr-demo-2a', 'prop-demo-2', 'st-toyoko-nakameguro', 3),
  ('tr-demo-2b', 'prop-demo-2', 'st-hibiya-nakameguro', 3),
  ('tr-demo-3a', 'prop-demo-3', 'st-toyoko-jiyugaoka', 6),
  ('tr-demo-4a', 'prop-demo-4', 'st-yamanote-shinagawa', 8);