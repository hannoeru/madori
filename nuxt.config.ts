// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
  ],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true,
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
})
