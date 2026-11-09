import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from 'nuxt'

const cwd = fileURLToPath(new URL('../', import.meta.url))

test('production scans application icons into its local bundle without an external fallback', async () => {
  const nuxt = await loadNuxt({ cwd, dev: false })
  try {
    assert.equal(nuxt.options.icon.clientBundle?.scan, true)
    assert.equal(nuxt.options.icon.fallbackToApi, false)
    assert.deepEqual(nuxt.options.icon.serverBundle.collections, ['lucide', 'simple-icons'])
  }
  finally {
    await nuxt.close()
  }
})

test('production keeps Vue server-prefetch ID boundaries on the client', async () => {
  const nuxt = await loadNuxt({ cwd, dev: false })
  try {
    const client = nuxt.options.optimization.treeShake.composables.client
    assert.ok(!Object.values(client).flat().includes('onServerPrefetch'))
    assert.ok(client.vue.includes('onRenderTracked'))
    assert.ok(client.vue.includes('onRenderTriggered'))
  }
  finally {
    await nuxt.close()
  }
})
