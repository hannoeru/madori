export default defineAppConfig({
  ui: {
    colors: {
      primary: 'ai',
      neutral: 'slate',
    },
    button: { slots: { base: 'min-h-11 min-w-11' } },
    input: { slots: { base: 'min-h-11' } },
    select: { slots: { base: 'min-h-11' } },
  },
  agent: {
    name: '（請填入房仲姓名）',
    company: '（請填入公司名稱）',
    license: '（請填入宅地建物取引業免許號碼）',
    lineUrl: 'https://line.me/',
    intro: '我在東京協助台灣買方購屋。從挑選物件、確認費用到安排看屋，都用中文和你溝通。',
  },
})
