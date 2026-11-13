// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    function keepHydrationIdBoundaries(_options, nuxt) {
      const client = nuxt.options.optimization.treeShake.composables.client
      if (client.vue) {
        // Vue uses this hook to align SSR and hydration ID boundaries.
        client.vue = client.vue.filter(name => name !== 'onServerPrefetch')
      }
    },
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
  ],

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      titleTemplate: '%s',
    },
  },

  css: ['~/assets/css/main.css'],

  site: {
    defaultLocale: 'zh-TW',
    name: '瑞哥看房',
    url: 'https://madori.yohaku.ink',
  },

  colorMode: { preference: 'light', fallback: 'light' },

  runtimeConfig: {
    appUrl: 'https://madori.yohaku.ink',
    adminPassword: '',
  },

  routeRules: {
    '/api/auth/**': { headers: { 'Cache-Control': 'no-store' } },
    '/api/admin/**': { headers: { 'Cache-Control': 'no-store' } },
    '/admin/**': {
      robots: false,
      headers: { 'Cache-Control': 'no-store' },
    },
    '/login': {
      robots: false,
    },
  },

  compatibilityDate: '2026-08-26',

  nitro: {
    preset: 'cloudflare_module',
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  icon: {
    clientBundle: { scan: true },
    serverBundle: false,
    fallbackToApi: false,
  },

  ogImage: { enabled: false },

  sitemap: {
    sources: ['/api/sitemap-urls'],
  },
})
