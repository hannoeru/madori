import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { computed, createRenderer, h, nextTick, onScopeDispose, ref, Suspense, useId, watch } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(url)))
        return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
})
const { createAgencyViewScope } = await import('../shared/admin-property.ts')
const { requestErrorMessage } = await import('../app/utils/request-error.ts')
Object.assign(globalThis, { computed, ref, watch, onScopeDispose, nextTick, useId, requestErrorMessage })

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const recovery = { objectKey: 'abcdefghijklmnopqrstuvwx', token: 'a'.repeat(64) }
const failure = { data: { statusMessage: '舊公司私密錯誤', data: { cleanupQueued: false, recovery } } }
const images = [{ id: 'photo-a', kind: 'photo', position: 0, isCover: true, altZhTw: '本機示範照片' }]
const detail = {
  propertyType: 'condominium',
  buildStatus: 'resale',
  status: 'draft',
  titleZhTw: '本機示範',
  descriptionZhTw: '本機測試',
  priceYen: 1,
  ward: '目黑區',
  addressZhTw: '本機示範地址',
  layout: '2LDK',
  floorAreaSqm: 58.3,
  landAreaSqm: null,
  buildingAreaSqm: null,
  builtOn: '2010-01',
  structure: 'RC',
  floorNumber: 1,
  totalFloors: 2,
  landRights: '所有權',
  managementFeeYen: 0,
  repairReserveYen: 0,
  transactionMode: '仲介',
  equipmentZhTw: null,
  nextUpdateOn: '2027-01-01',
  transitEntries: [{ id: 'entry-a', stationId: 'station-a', walkingMinutes: 1 }],
  images,
}
const components = new Map()

async function compiledComponent(name) {
  if (components.has(name))
    return components.get(name)
  const { parse, compileScript } = createRequire(import.meta.resolve('vue'))('@vue/compiler-sfc')
  const file = new URL(`../app/components/${name}.vue`, import.meta.url)
  const { descriptor } = parse(readFileSync(file, 'utf8'))
  let source = compileScript(descriptor, { id: `agency-${name}-scope` }).content
  for (const [alias, url] of [
    ['vue', import.meta.resolve('vue')],
    ['valibot', import.meta.resolve('valibot')],
    ['#shared/admin-property', import.meta.resolve('../shared/admin-property.ts')],
    ['#shared/tokyo', import.meta.resolve('../shared/tokyo.ts')],
  ])
    source = source.replaceAll(`from '${alias}'`, `from '${url}'`)
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  components.set(name, component)
  return component
}

async function mountView(name, session, props = {}, { onBusy, initialResponse, initialEntered } = {}) {
  const component = await compiledComponent(name)
  const ready = deferred()
  const refreshEntered = deferred()
  const refreshResponse = deferred()
  let refreshes = 0
  let clears = 0
  const queries = []
  globalThis.useUserSession = () => ({ user: session })
  globalThis.useFetch = async (url, options) => {
    const path = typeof url === 'function' ? url() : url
    queries.push({ path, key: options?.key })
    if (initialResponse) {
      initialEntered?.resolve()
      await initialResponse.promise
    }
    return {
      data: ref(path === '/api/stations' ? { lines: [], stations: [] } : path === '/api/admin/media-cleanup' ? { pendingCount: 1 } : detail),
      error: ref(undefined),
      clear() { clears++ },
      async refresh() {
        refreshes++
        refreshEntered.resolve()
        await refreshResponse.promise
      },
    }
  }
  const wrapped = { ...component, setup(input, context) {
    const setup = component.setup(input, context)
    if (setup instanceof Promise) {
      return setup.then((state) => {
        ready.resolve(state)
        return () => null
      })
    }
    ready.resolve(setup)
    return () => null
  } }
  const renderer = createRenderer({
    createElement: () => ({}),
    createComment: () => ({}),
    createText: () => ({}),
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    patchProp() {},
    parentNode: () => null,
    nextSibling: () => null,
  })
  const app = renderer.createApp({ render: () => h(Suspense, null, { default: () => h(wrapped, { ...props, onBusy }) }) })
  app.mount({})
  const state = await ready.promise
  await nextTick()
  return {
    state,
    unmount: () => app.unmount(),
    queries,
    refreshEntered,
    refreshResponse,
    get refreshes() { return refreshes },
    get clears() { return clears },
  }
}

function invalidate(session, mode, frame) {
  if (mode === 'disposal') {
    frame.unmount()
    return
  }
  session.value = { id: 'agency-b', role: 'agency' }
  if (mode === 'round-trip')
    session.value = { id: 'agency-a', role: 'agency' }
}

function fillCreate(state) {
  for (const [key, value] of Object.entries(detail)) {
    if (!(key in state))
      continue
    state[key].value = key === 'transitEntries'
      ? value.map(entry => ({ stationId: entry.stationId, walkingMinutes: String(entry.walkingMinutes) }))
      : typeof value === 'number' ? String(value) : value ?? ''
  }
}

test('Agency view scopes retire permanently and reject old principal/epoch captures', () => {
  let agencyId = 'agency-a'
  const view = createAgencyViewScope(() => agencyId)
  const first = view.capture()
  assert.equal(view.isCurrent(first), true)
  agencyId = 'agency-b'
  assert.equal(view.isCurrent(first), false)
  view.retire()
  agencyId = 'agency-a'
  assert.equal(view.isCurrent(first), false)
  assert.equal(view.capture(), undefined)
  assert.equal(view.ownsView(), false)
  assert.equal(createAgencyViewScope(() => undefined).isCurrent(undefined), false)
})

test('compiled Form callbacks discard late submit/create/delete/reload results and deferred events', { timeout: 15000 }, async () => {
  for (const operation of ['submit', 'create', 'delete', 'reload']) {
    for (const mode of ['switch', 'round-trip', 'disposal']) {
      for (const outcome of ['success', 'failure']) {
        const session = ref({ id: 'agency-a', role: 'agency' })
        const response = deferred()
        const calls = []
        const navigation = []
        globalThis.$fetch = (path, options) => {
          calls.push({ path, options })
          return response.promise
        }
        globalThis.useRouter = () => ({
          async push(path) { navigation.push(path) },
        })
        const frame = await mountView('AdminPropertyForm', session, operation === 'create' ? {} : { propertyId: 'property-a' })
        if (operation === 'create')
          fillCreate(frame.state)
        const start = () => operation === 'delete' ? frame.state.removeProperty() : operation === 'reload' ? frame.state.reloadImages() : frame.state.submit()
        const pending = start()
        assert.equal(calls.length, 1, `${operation} must reach the actual request`)
        invalidate(session, mode, frame)
        frame.state.saving.value = true
        frame.state.error.value = '較新操作錯誤'
        frame.state.success.value = '較新操作訊息'
        frame.state.images.value = [{ ...images[0], id: 'newer-image' }]
        if (outcome === 'success')
          response.resolve({ id: 'old-created-property', images: [{ ...images[0], id: 'old-image' }] })
        else
          response.reject(failure)
        await pending
        assert.deepEqual(navigation, [])
        assert.equal(frame.state.saving.value, true)
        assert.equal(frame.state.error.value, '較新操作錯誤')
        assert.equal(frame.state.success.value, '較新操作訊息')
        assert.equal(frame.state.images.value[0].id, 'newer-image')
        await start()
        assert.equal(calls.length, 1, 'a deferred old handler cannot start another request')
        if (mode !== 'disposal')
          frame.unmount()
      }
    }
  }
})

test('compiled Form setup cannot start a private request after a stale station response', { timeout: 15000 }, async () => {
  const session = ref({ id: 'agency-a', role: 'agency' })
  const response = deferred()
  const entered = deferred()
  const mounting = mountView('AdminPropertyForm', session, { propertyId: 'property-a' }, { initialResponse: response, initialEntered: entered })
  await entered.promise
  session.value = { id: 'agency-b', role: 'agency' }
  response.resolve()
  const frame = await mounting
  assert.deepEqual(frame.queries.map(query => query.path), ['/api/stations'])
  assert.equal(frame.state.loaded.value, false)
  frame.unmount()
})

test('compiled Images discard stale mutation and parent-refresh callbacks without unlocking a newer operation', { timeout: 15000 }, async () => {
  for (const stage of ['mutation', 'refresh']) {
    for (const mode of ['switch', 'round-trip', 'disposal']) {
      for (const outcome of ['success', 'failure']) {
        const session = ref({ id: 'agency-a', role: 'agency' })
        const response = deferred()
        const reload = deferred()
        const entered = deferred()
        let refreshes = 0
        const events = []
        const frame = await mountView('AdminPropertyImages', session, {
          propertyId: 'property-a',
          images,
          async refreshImages() {
            refreshes++
            entered.resolve()
            await reload.promise
          },
        }, { onBusy: value => events.push(value) })
        frame.state.recoveries.value = [recovery]
        const pending = frame.state.run(() => stage === 'mutation' ? response.promise : Promise.resolve({ cleanupPending: false }), '舊公司成功')
        if (stage === 'refresh')
          await entered.promise
        invalidate(session, mode, frame)
        const eventCount = events.length
        frame.state.busy.value = true
        frame.state.error.value = '較新操作錯誤'
        frame.state.success.value = '較新操作訊息'
        const completing = stage === 'mutation' ? response : reload
        if (outcome === 'success')
          completing.resolve({ cleanupPending: false })
        else
          completing.reject(failure)
        await pending
        assert.equal(events.length, eventCount, 'old finally must not emit a busy reset')
        assert.equal(frame.state.busy.value, true)
        assert.equal(frame.state.error.value, '較新操作錯誤')
        assert.equal(frame.state.success.value, '較新操作訊息')
        assert.deepEqual(frame.state.recoveries.value, [])
        assert.equal(refreshes, stage === 'mutation' ? 0 : 1)
        await frame.state.run(async () => {
          assert.fail('old media view must not invoke another mutation')
        }, '不可執行')
        if (mode !== 'disposal')
          frame.unmount()
      }
    }
  }
})

test('compiled Media cleanup discards stale mutation/refresh callbacks and keeps newer busy state', { timeout: 15000 }, async () => {
  for (const stage of ['mutation', 'refresh']) {
    for (const mode of ['switch', 'round-trip', 'disposal']) {
      for (const outcome of ['success', 'failure']) {
        const session = ref({ id: 'agency-a', role: 'agency' })
        const response = deferred()
        let requests = 0
        globalThis.$fetch = () => {
          requests++
          return response.promise
        }
        const frame = await mountView('AdminMediaCleanup', session)
        const pending = frame.state.retry()
        if (stage === 'refresh') {
          response.resolve({ cleanupPending: false })
          await frame.refreshEntered.promise
        }
        invalidate(session, mode, frame)
        frame.state.busy.value = true
        frame.state.message.value = '較新操作訊息'
        const completing = stage === 'mutation' ? response : frame.refreshResponse
        if (outcome === 'success')
          completing.resolve({ cleanupPending: false })
        else
          completing.reject(failure)
        await pending
        assert.equal(frame.state.busy.value, true)
        assert.equal(frame.state.message.value, '較新操作訊息')
        assert.equal(frame.refreshes, stage === 'mutation' ? 0 : 1)
        assert.ok(frame.clears >= 1)
        await frame.state.retry()
        assert.equal(requests, 1)
        if (mode !== 'disposal')
          frame.unmount()
      }
    }
  }
})

test('compiled specific recovery drops stale callbacks and cannot download credentials from a retired view', { timeout: 15000 }, async () => {
  for (const mode of ['switch', 'round-trip', 'disposal']) {
    for (const outcome of ['success', 'failure']) {
      const session = ref({ id: 'agency-a', role: 'agency' })
      const response = deferred()
      let requests = 0
      globalThis.$fetch = () => {
        requests++
        return response.promise
      }
      const frame = await mountView('AdminUploadRecovery', session, { 'modelValue': [recovery], 'onUpdate:modelValue': () => {} })
      const pending = frame.state.retry(recovery)
      invalidate(session, mode, frame)
      frame.state.busyKey.value = 'newer-key'
      frame.state.message.value = '較新操作訊息'
      if (outcome === 'success')
        response.resolve({ ok: true })
      else
        response.reject(failure)
      await pending
      assert.equal(frame.state.busyKey.value, 'newer-key')
      assert.equal(frame.state.message.value, '較新操作訊息')
      await frame.state.retry(recovery)
      assert.equal(requests, 1)
      frame.state.download(recovery)
      if (mode !== 'disposal')
        frame.unmount()
    }
  }
})
