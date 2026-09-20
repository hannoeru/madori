# Research: Japanese Buy/Sell (売買) Residential Property Portals

## Summary

The four dominant buy/sell residential portals in Japan are **SUUMO** (Recruit), **at home** (At Home Co.), **LIFULL HOME'S** (LIFULL Co.), and **Yahoo!不動産** (LY Corp.), with **goo 住宅・不動産** as a smaller data-syndicated player. All four expose the same core listing anatomy: a header summary (price, 間取り, 専有面積, 築年数, 所在階/階建), a photo gallery, a floor-plan (間取り図) image, a 物件概要 table, an equipment (設備) list, a 周辺環境/map section, and an inquiring-agency footer. The reusable, cross-portal required field set is stable (price, layout, exclusive floor area, address, transit, building age, floor, structure, land rights, monthly costs, transaction mode), which maps directly onto Madori's glossary (Property, Applicable fact, Transit entry, Floor plan, Property photo).

## Portal landscape (primary sources)

1. **SUUMO** — operated by Recruit. Buy/sell entry point `https://suumo.jp/ms/chuko/`; official field glossary "住まいを買う 情報の見方" at `https://suumo.jp/edit/joho_mikata/index.html`.
2. **at home** — operated by At Home Co. Official field glossary "情報の見方（物件詳細：買う：マンション）" at `https://www.athome.co.jp/smt/guide2/ks.html`; agent-side input spec published on ATBB at `https://atbb.athome.jp/info/info/urmansion_1.html`.
3. **LIFULL HOME'S** — operated by LIFULL Co. Search page `https://www.homes.co.jp/mansion/chuko/`; agent-side "LIFULL HOME'S PRO / Manager" at `https://www.homes.co.jp/pro/`.
4. **Yahoo!不動産** — operated by LY Corp. Official field glossary "物件情報の見方" at `https://realestate.yahoo.co.jp/used/mansion/view/`.
5. **goo 住宅・不動産** — NTT-based syndicated portal; official field glossary "情報の見方（中古マンション）" at `https://house.goo.ne.jp/info/house_coif_um01.html`.

## 1. Required data fields (per listing)

The agent-side **ATBB 売マンション input spec** (mandatory fields an agent must supply) is the closest proxy to a "required data model" and lists: 物件種目 (売マンション/売公団/売公社/売タウンハウス/売リゾートマンション; 「新築」ラベルは完成後1年未満・未使用のみ可), マンション名, 物件所在地, 交通, 間取タイプ, 価格, 構造・規模, 専有面積, バルコニー面積, 間取詳細, 土地権利, 用途地域, 竣工年月, 向き(主要採光面), 管理形態・管理員, 施工会社, 管理費, 修繕積立金, 取引(態様), 引渡, 駐車場, 設備, 特記事項, 手数料(報酬). [ATBB 売マンション入力仕様](https://atbb.athome.jp/info/info/urmansion_1.html)

Consolidated cross-portal field inventory (Japanese term → English → evidence):

### Core identity & price
- **価格 (price)** — sale price, tax-inclusive where applicable, broker fee excluded (仲介手数料は含みません). [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **平米単価 / 坪単価 (unit price)** — per-m² and per-坪 price. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **物件番号 (listing ID)** — portal's unique ID, required when contacting the agent. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **物件種目 (property type)** — resale/new condo, detached house, land. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **マンション名・部屋番号 / 物件名 (building name + unit number)** — optional display. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [ATBB](https://atbb.athome.jp/info/info/urmansion_1.html)

### Layout & area
- **間取り (layout)** — notation: leading digit = bedrooms (excl. living/dining), K/DK/LDK, S/N=納戸/サービスルーム. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/view/)
- **専有面積 (exclusive floor area)** — condo; 壁芯 vs 登記簿(内法) for resale; balcony/porch excluded. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html); [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/view/)
- **土地面積 (land area)** — detached house/land; 私道負担 excluded. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **建物面積 (総床 total floor area)** — detached house. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **バルコニー面積 (balcony area)** — not included in 専有面積. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **敷地面積 / 私道負担面積** — [at home](https://www.athome.co.jp/smt/guide2/ks.html)

### Location & transit (Madori "Transit entry")
- **所在地 (address)** — 地番 often omitted; street display. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO](https://suumo.jp/edit/joho_mikata/index.html)
- **交通 (transit)** — nearest station + rail line + 徒歩分 (80 m = 1 min, rounded up); bus options; multiple lines. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [ATBB](https://atbb.athome.jp/info/info/urmansion_1.html)

### Building facts
- **築年月 / 築年数 (completion year-month / building age)** — 竣工年月. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO 物件詳細例](https://suumo.jp/ms/chuko/tokyo/sc_shibuya/nc_20414493/)
- **所在階 / 階建 (floor / total floors)** — e.g. "4階/RC6階建". [SUUMO 物件詳細例](https://suumo.jp/ms/chuko/tokyo/sc_shibuya/nc_20414493/); [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/view/)
- **構造 (structure)** — S/鉄骨造, RC, SRC, PC, HPC, 軽量鉄骨, ALC, 木造. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **主要採光面 / 向き (main sun exposure)** — e.g. 南東. [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/view/); [ATBB](https://atbb.athome.jp/info/info/urmansion_1.html)
- **総戸数 (total units)** — [at home](https://www.athome.co.jp/smt/guide2/ks.html); [LIFULL](https://www.homes.co.jp/mansion/b-1286620000034/)

### Rights, costs, transaction
- **土地権利 (land rights)** — 所有権 or 借地権 variants; lease period, 地代, 権利金, 保証金. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [ATBB](https://atbb.athome.jp/info/info/urmansion_1.html); [LIFULL](https://www.homes.co.jp/mansion/b-1286620000034/)
- **管理費等 (monthly maintenance)** — 修繕積立金 excluded. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **修繕積立金 (repair reserve fund)** — monthly. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [LIFULL](https://www.homes.co.jp/mansion/b-35007870000106/)
- **駐車場 / バイク置き場 / 駐輪場** — availability, vacancy, rent. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **取引態様 (transaction mode)** — 仲介/売主/代理. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **現況 (current status)** — [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **引渡し (handover)** — 即時/相談/更地渡し/現況渡し. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **リフォーム / リノベーション (renovation)** — [at home](https://www.athome.co.jp/smt/guide2/ks.html); [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/detail_corp/b0024769988/)

### Regulatory / condition facts
- **用途地域 (zoning, 13 types)** — [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **都市計画 / 建ぺい率 / 容積率 / 接道状況 / 地目 / 地勢 / セットバック / 建築確認番号** — [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO](https://suumo.jp/edit/joho_mikata/index.html)
- **管理形態 / 管理員勤務形態** — 全部委託/一部委託/自主管理; 常駐/日勤/巡回/不在. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **瑕疵保証 / 瑕疵保険 (defect warranty/insurance)** — [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **評価・証明書 (inspection/certificates)** — 建物状況調査, 耐震基準適合証明書, フラット35適合証明書. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
- **省エネ性能ラベル / エネルギー消費性能 / 断熱性能 / 目安光熱費 / ZEH水準 / BELS / 安心R住宅 / 長期優良住宅 / フラット35** — [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [at home](https://www.athome.co.jp/smt/guide2/ks.html)

### Freshness & attribution
- **情報公開日 / 更新日 / 次回更新予定日** — [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO](https://suumo.jp/edit/joho_mikata/index.html); [Yahoo!不動産](https://realestate.yahoo.co.jp/used/mansion/detail_corp/b0024769988/)
- **掲載不動産会社 (listing agency)** — name, license, contact, message. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
- **施工会社 / 分譲会社 / 管理会社** — [ATBB](https://atbb.athome.jp/info/info/urmansion_1.html); [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)

## 2. Media

- **Property photos** — ordered room/feature photos; LIFULL captions by room: 間取り(図), リビング/ダイニング, 外観, バルコニー, キッチン, 浴室, トイレ, 洗面, 周辺, その他. [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
- **Floor plan (間取り図)** — dedicated image with "間取り内訳" text (room count, 専有面積, バルコニー面積, 駐車場, 備考). [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
- **Photo limits** — LIFULL: up to 30 photos + 360° パノラマ画像. [LIFULL 掲載プラン](https://inquiry.homes.co.jp/businesspartner/)
- **Video/movie** — SUUMO "ムービーありのみ表示"; LIFULL 会社紹介ムービー, スマート内見. [SUUMO](https://suumo.jp/ms/chuko/kanagawa/ek_38610/nj_133/nj_152/); [LIFULL](https://inquiry.homes.co.jp/businesspartner/)
- **Image disclaimers** — 完成予想図, 同形状同仕様写真, 類似外観同仕様写真; furniture excluded unless stated. [SUUMO](https://suumo.jp/edit/joho_mikata/index.html)
- **図面ダウンロード** — agent-facing B2B. [LIFULL B2B](https://www.homes.co.jp/pro/bb/)

## 3. Search filters

- **Area / ward (都道府県・市区町村・東京23区)** — + 地図から探す. [SUUMO](https://suumo.jp/ms/); [LIFULL](https://www.homes.co.jp/mansion/chuko/)
- **Rail line & station (沿線・駅)** — up to 3 stations; 路線図から探す. [LIFULL](https://www.homes.co.jp/mansion/chuko/)
- **Commute time & transfers** — 10–90 min buckets, 乗換なし/1回/2回以内. [LIFULL](https://www.homes.co.jp/mansion/chuko/)
- **Walk time (駅徒歩)** — e.g. 駅徒歩5分以内. [SUUMO 関東中古マンション](https://suumo.jp/ms/chuko/kanto/)
- **Price range (価格帯)** — buckets 2000万円未満/台 etc.; min/max. [SUUMO](https://suumo.jp/ms/); [at home](https://www.athome.co.jp/mansion/chuko/)
- **Layout (間取り)** — ワンルーム/1K/…/5K以上. [SUUMO](https://suumo.jp/ms/)
- **Area (専有面積/広さ)** — min/max. [at home](https://www.athome.co.jp/mansion/chuko/)
- **Building age (築年数)** — 築5年以内/10年以内/20年以内 buckets. [at home](https://www.athome.co.jp/mansion/chuko/)
- **こだわり (feature) filters** — ペット可, リフォーム済, リノベーション済, 南向き/陽当り良好, 最上階, 角部屋, 2階以上, 駅徒歩5分以内, 収納充実, 浴室乾燥機, 床暖房, オール電化, セキュリティ充実, ルーフバルコニー付, 専用庭付, 和室あり, LDK15畳以上, 平坦地, 即引渡可, タワーマンション(20階以上), 高級マンション(8000万円以上), 高速ネット. [SUUMO](https://suumo.jp/ms/); [SUUMO 関東中古マンション](https://suumo.jp/ms/chuko/kanto/)
- **Sort** — 新着・更新順, 所在地順, 価格順, 専有面積順, 間取り順, 築年月順, ムービーありのみ. [SUUMO](https://suumo.jp/ms/chuko/kanagawa/ek_38610/nj_133/nj_152/)

## 4. Detail-page sections

1. **Header summary** — price, 支払い目安/ローン試算, 間取り+専有面積, 築年数, 所在階/階建, 交通, 住所, 主要採光面, 管理費, 修繕積立金. [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
2. **Photo gallery** — room-captioned photos + 間取り図. [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
3. **間取り内訳 / 部屋情報** — room-by-room breakdown. [LIFULL](https://www.homes.co.jp/mansion/b-1319160000354/)
4. **物件概要 table** — price, 管理費等, 修繕積立金, 所在地, 交通, 築年月, 構造, 専有面積, 間取り, バルコニー, 所在階, 総戸数, 土地権利, 用途地域, 都市計画, 建ぺい率, 容積率, 取引態様, 現況, 引渡し, 物件番号, 掲載会社. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [LIFULL](https://www.homes.co.jp/mansion/b-35007870000106/)
5. **設備 list** — バス・トイレ/キッチン/セキュリティ/収納/設備・サービス/TV・通信/その他. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
6. **特記事項 / アピールポイント / コメント** — agent narrative. [at home](https://www.athome.co.jp/smt/guide2/ks.html)
7. **周辺環境・地図** — stations, schools, supermarkets. [LIFULL](https://www.homes.co.jp/about/service/usage/); [SUUMO](https://suumo.jp/edit/beginner/guide/ikkodate_kounyu.html)
8. **問い合わせ先 / 掲載不動産会社** — contact + 資料請求/見学予約. [at home](https://www.athome.co.jp/smt/guide2/ks.html); [SUUMO](https://suumo.jp/edit/beginner/guide/ikkodate_kounyu.html)
9. **Freshness footer** — 情報公開日/更新日/次回更新予定日/物件番号. [at home](https://www.athome.co.jp/smt/guide2/ks.html)

## 5. Agency-side (estate-agent) capabilities

**SUUMO** — 審査 → "SUUMO入稿・分析システム（売買）" (ID/PW) + JDS to register listings (objects, photos, video) and receive 反響; batch ingestion. [SUUMO 事業者向け](https://business.suumo.jp/guide/baibai.html); [SUUMO 掲載の流れ](https://suumo.jp/edit/oudan/welcome/)

**at home** — **ATBB** platform: 加盟/利用店 register and publish (B2B→B2C), same-day publication, **一括登録システム** batch transfer, CRM, website tools, 査定 data. [ATBB](https://business.athome.jp/service/atbb/); [一括登録システム](https://business.athome.jp/service/ikkatsu_system/); [ネットワーク](https://www.athome.co.jp/corporate/service/business/)

**LIFULL HOME'S** — **PRO / Manager**: company registration (免許番号 mandatory), 物件管理 → 取扱い物件一覧 → 編集 → 「登録して公開/非公開」; up to 30 photos + パノラマ, スタッフコメント; **B2B** unlimited posting + 図面ダウンロード. [PRO](https://www.homes.co.jp/pro/); [掲載プラン](https://inquiry.homes.co.jp/businesspartner/); [B2B](https://www.homes.co.jp/pro/bb/); [Manager flow](https://www.mlit.go.jp/totikensangyo/const/content/001305388.pdf)

Cross-portal pattern: **審査 → 契約 → 入稿/管理ツールで登録(基本情報+写真+動画+設備) → 公開/非公開制御 → 反響受領 → 一括入稿で複数ポータル連動**. This confirms Madori's multi-agency marketplace model mirrors established behavior.

## Cross-portal mapping to Madori data model

| Portal concept | Madori glossary term |
| --- | --- |
| 交通 (駅 + 路線 + 徒歩分) | Transit entry |
| 間取り図 | Floor plan (the one required image) |
| 物件写真（ordered） | Property photo (ordered 1–20) |
| 専有面積 vs 土地面積/建物面積 | Applicable fact |
| 物件概要 required fields | Property facts (Applicable) |
| 検索条件 | Search (shareable Buyer query) |
| 公開/非公開, 次回更新予定日 | Published Property / Withdrawn Listing / Freshness review queue |

## Sources

### Kept (primary)
- SUUMO 「住まいを買う 情報の見方」 https://suumo.jp/edit/joho_mikata/index.html
- SUUMO 中古マンション物件詳細例 https://suumo.jp/ms/chuko/tokyo/sc_shibuya/nc_20414493/
- SUUMO マンション購入検索 https://suumo.jp/ms/
- SUUMO 関東中古マンション https://suumo.jp/ms/chuko/kanto/
- SUUMO 事業者向け 売買掲載 https://business.suumo.jp/guide/baibai.html
- at home「情報の見方（物件詳細：買う：マンション）」 https://www.athome.co.jp/smt/guide2/ks.html
- at home「情報の見方（検索結果画面）」 https://www.athome.co.jp/guide3/ks.html
- ATBB 売マンション入力仕様 https://atbb.athome.jp/info/info/urmansion_1.html
- ATBB 紹介 https://business.athome.jp/service/atbb/
- at home 一括登録システム https://business.athome.jp/service/ikkatsu_system/
- LIFULL HOME'S 中古マンション検索 https://www.homes.co.jp/mansion/chuko/
- LIFULL 物件詳細例（ライオンズマンション城下） https://www.homes.co.jp/mansion/b-1319160000354/
- LIFULL 物件詳細例（ライフヒルズ中山） https://www.homes.co.jp/mansion/b-1286620000034/
- LIFULL 物件詳細例（ランドステージ雑司が谷） https://www.homes.co.jp/mansion/b-35007870000106/
- LIFULL HOME'S PRO https://www.homes.co.jp/pro/
- LIFULL 掲載プラン https://inquiry.homes.co.jp/businesspartner/
- LIFULL HOME'S B2B https://www.homes.co.jp/pro/bb/
- LIFULL Manager 物件管理フロー (国土交通省掲載 PDF) https://www.mlit.go.jp/totikensangyo/const/content/001305388.pdf
- Yahoo!不動産「物件情報の見方」 https://realestate.yahoo.co.jp/used/mansion/view/
- Yahoo!不動産 中古マンション https://realestate.yahoo.co.jp/used/mansion/
- Yahoo!不動産 物件詳細例 https://realestate.yahoo.co.jp/used/mansion/detail_corp/b0024769988/
- goo 住宅・不動産「情報の見方（中古マンション）」 https://house.goo.ne.jp/info/house_coif_um01.html

### Dropped
- room-match.jp, fine-estate.info, iimon.co.jp, aoyama-e.com, housingbazar.jp, kaisen-choice.blog, sumu-lab.com, Good!Apps, Play Store/App Store listings — secondary commentary/SEO write-ups, not primary sources.
- lifullhomes-satei.jp (プライスマップ), nikkei.com — valuation/press, outside listing-data-model scope.

## Gaps

1. **Agent-side edit depth** — SUUMO/LIFULL/ATBB login consoles are gated; only public marketing pages + one public PDF manual were accessible. Next: request official 入稿システム manuals from each portal's sales desk.
2. **Exact field requiredness per portal** — ATBB published its mandatory spec; SUUMO/LIFULL requiredness inferred from glossaries + listing pages.
3. **Yahoo!不動産 data provenance** — syndicated vs. direct agent intake not confirmed; its agency tooling not researched.
4. **Search filter parameters** — taxonomies confirmed, but exact facet parameter lists not exhaustively captured from dynamic forms.