<script setup lang="ts">
useSeoMeta({ title: '東京購屋指南｜Madori', description: '看懂東京住宅的格局、面積、土地權利與每月費用。以繁體中文整理詢問房仲前需要確認的資訊。' })
const steps = [
  { title: '先整理你的生活條件', description: '確認用途、可負擔預算、希望居住的區域與步行到車站的時間。不要只用物件總價決定預算。' },
  { title: '比較物件與持有成本', description: '一起查看照片、格局圖、專有或建物面積、屋齡、管理費及修繕積立金。請向房仲確認缺少的資訊。' },
  { title: '詢問刊登房仲公司', description: '確認物件是否仍可購買、能否看屋、交易型態、土地權利與預計交屋時間。留下你希望了解的具體問題。' },
  { title: '確認文件、費用與資格', description: '簽約前由合格專業人員說明重要事項與契約。請確認資金安排、稅費、仲介費及付款時程，不以網站估算代替正式文件。' },
]
</script>

<template>
  <div>
    <MarketHeader />
    <main id="main-content">
      <UContainer class="py-10 sm:py-16">
        <UBreadcrumb :items="[{ label: '首頁', to: '/' }, { label: '購屋指南' }]" />
        <header class="max-w-3xl py-8">
          <p class="text-xs tracking-widest text-muted">
            BEFORE YOU BUY
          </p><h1 class="market-heading mt-3 text-4xl leading-normal sm:text-5xl">
            先看懂資訊，<br>再決定下一步。
          </h1><p class="mt-5 text-lg text-muted">
            日本房屋資訊有自己的用語。從格局到每月費用，用熟悉的語言整理看屋前需要知道的事。
          </p>
        </header>
        <UAlert icon="i-lucide-info" color="neutral" variant="soft" title="這是一般資訊，不是個別交易建議。" description="費用、貸款資格、法律及稅務義務依物件與個人情況而異。請向房仲、金融機構及合格法律或稅務專業人員確認。" />
        <section class="mt-12" aria-labelledby="facts-title">
          <h2 id="facts-title" class="market-heading text-3xl">
            物件資訊，這樣看。
          </h2>
          <div class="mt-6 grid gap-6 md:grid-cols-2">
            <UCard>
              <h3 class="text-xl font-semibold">
                格局・LDK 是什麼？
              </h3><p class="mt-3 text-muted">
                L 是客廳、D 是餐廳、K 是廚房。2LDK 通常表示兩個房間加上客餐廳與廚房空間。S 表示服務室或儲藏空間，不應當作符合居室要求的房間。
              </p><p class="mt-3 text-sm text-muted">
                LDK 不表示浴室數量。請一起查看格局圖，並向房仲確認每個空間的用途。
              </p>
            </UCard>
            <UCard>
              <h3 class="text-xl font-semibold">
                面積・平方公尺與坪
              </h3><p class="mt-3 text-muted">
                1 坪約為 3.3058 平方公尺。Madori 顯示平方公尺與約略坪數，方便比較。公寓的專有面積與獨棟住宅的土地、建物面積是不同項目。
              </p><p class="mt-3 text-sm text-muted">
                日本公寓的專有面積不包含陽台或玄關外的門廊。不要直接視為台灣含公設的權狀坪數。
              </p>
            </UCard>
            <UCard>
              <h3 class="text-xl font-semibold">
                費用・總價之外還有什麼？
              </h3><p class="mt-3 text-muted">
                物件價格不等於購屋總支出。請取得仲介費、登記相關費用、稅費及其他交易費用的明細。公寓另需確認每月管理費與修繕積立金。
              </p><p class="mt-3 text-sm text-muted">
                修繕積立金用於大樓修繕準備，與管理費不同。請確認未來調整、修繕計畫與是否有額外支出。
              </p>
            </UCard>
            <UCard>
              <h3 class="text-xl font-semibold">
                權利・所有權與借地權
              </h3><p class="mt-3 text-muted">
                土地權利會影響使用條件、費用與未來安排。看到借地權或定期借地權時，請確認契約期間、地租、更新條件及期滿處理。
              </p><p class="mt-3 text-sm text-muted">
                沒有標示的資訊不代表沒有風險。請閱讀正式文件，不只看物件簡介。
              </p>
            </UCard>
            <UCard>
              <h3 class="text-xl font-semibold">
                交通・步行分鐘不是通勤時間
              </h3><p class="mt-3 text-muted">
                日本物件廣告的步行時間以道路距離換算，常用 80 公尺約 1 分鐘。實際行走、紅綠燈、月台與轉乘需要另行確認。
              </p><p class="mt-3 text-sm text-muted">
                先選擇車站與路線，再實際檢查到目的地的通勤路徑。
              </p>
            </UCard>
            <UCard>
              <h3 class="text-xl font-semibold">
                資訊・看清更新與交易型態
              </h3><p class="mt-3 text-muted">
                確認物件更新日期、下次更新日期，以及刊登公司的許可字號。仲介、賣主與代理表示不同交易角色。
              </p><p class="mt-3 text-sm text-muted">
                Madori 帳號註冊不等於執照審核。請自行確認公司資料與物件狀態，並保留正式交易文件。
              </p>
            </UCard>
          </div>
        </section>
        <section class="mt-14" aria-labelledby="process-title">
          <h2 id="process-title" class="market-heading text-3xl">
            從找房到簽約前的確認。
          </h2><ol class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <li v-for="(step, index) in steps" :key="step.title" class="border-t border-default pt-5">
              <p class="text-sm font-semibold text-primary">
                0{{ index + 1 }}
              </p><h3 class="mt-3 text-lg font-semibold">
                {{ step.title }}
              </h3><p class="mt-3 text-sm leading-relaxed text-muted">
                {{ step.description }}
              </p>
            </li>
          </ol>
        </section>
        <section class="mt-14 rounded-md border border-default bg-elevated p-6 sm:p-8" aria-labelledby="sources-title">
          <h2 id="sources-title" class="text-xl font-semibold">
            資料來源與使用限制
          </h2><p class="mt-3 text-sm text-muted">
            本頁整理一般物件用語，不提供投資收益、費用或簽證承諾。購屋不應被視為取得居留資格的方式。以交易當時的官方規定及專業確認為準。
          </p><ul class="mt-5 space-y-3 text-sm">
            <li>
              <ULink to="https://suumo.jp/edit/joho_mikata/index.html" target="_blank" rel="noopener noreferrer" class="text-primary underline">
                SUUMO・官方物件資訊用語說明
              </ULink>
            </li><li>
              <ULink to="https://www.sinyijapan.com/tw" target="_blank" rel="noopener noreferrer" class="text-primary underline">
                信義日本・日本購屋常見問題與資訊
              </ULink>
            </li>
          </ul>
        </section>
        <div class="mt-10">
          <UButton to="/search" size="lg" trailing-icon="i-lucide-arrow-right">
            開始探索東京物件
          </UButton>
        </div>
      </UContainer>
    </main>
    <MarketFooter />
  </div>
</template>
