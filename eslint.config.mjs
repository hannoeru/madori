// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    vue: true,
    typescript: true,
  }),
  {
    ignores: [
      'migrations/**',
      '.pi/**',
      '.pi-subagents/**',
      '.audit/**',
      'plans/**',
      'pnpm-workspace.yaml',
      'worker-configuration.d.ts',
    ],
  },
  {
    files: ['tests/**/*.mjs'],
    rules: { 'test/no-import-node-test': 'off' },
  },
  {
    rules: {
      'nuxt/nuxt-config-keys-order': 'error',
    },
  },
)
