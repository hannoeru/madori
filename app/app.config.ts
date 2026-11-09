export default defineAppConfig({
  ui: {
    colors: {
      primary: 'forest',
      neutral: 'zinc',
    },
    button: { slots: { base: 'min-h-11 min-w-11' } },
    input: { slots: { base: 'min-h-11' } },
    select: { slots: { base: 'min-h-11' } },
    selectMenu: { slots: { base: 'min-h-11' } },
    navigationMenu: { slots: { link: 'min-h-11' } },
  },
})
