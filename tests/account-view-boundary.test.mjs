import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { compileFunction } from 'node:vm'
import ts from 'typescript'
import * as Vue from 'vue'

const requireVue = createRequire(import.meta.resolve('vue'))
const { parse, compileScript } = requireVue('@vue/compiler-sfc')
const { renderToString } = requireVue('@vue/server-renderer')
const filename = new URL('../app/components/AccountViewBoundary.vue', import.meta.url).pathname
const componentSource = readFileSync(filename, 'utf8')
const { descriptor } = parse(componentSource, { filename })
const compiled = compileScript(descriptor, { id: 'account-view-boundary-test', inlineTemplate: true })
const source = ts.transpileModule(compiled.content.replaceAll('import.meta.client', 'isClient'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
}).outputText
const nuxtRoot = new URL('./', import.meta.resolve('nuxt/package.json'))
const asyncSource = readFileSync(new URL('dist/app/composables/asyncData.js', nuxtRoot), 'utf8')
const routeSource = readFileSync(new URL('dist/pages/runtime/utils.js', nuxtRoot), 'utf8')

function declarations(source, names) {
  const parsed = ts.createSourceFile('installed-nuxt.js', source, ts.ScriptTarget.ESNext, true)
  const found = parsed.statements.filter(statement =>
    ts.isFunctionDeclaration(statement)
      ? names.includes(statement.name?.text)
      : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.getText(parsed))),
  )
  assert.equal(found.length, names.length, 'every tested Nuxt declaration must exist in the installed source')
  return found.map(statement => statement.getText(parsed)).join('\n')
}

const cancellationSource = declarations(asyncSource, ['clearNuxtData', 'clearNuxtDataByKey', 'buildAsyncData', 'mergeAbortSignals', 'getDefaultCachedData', 'pick'])
const nuxtFunctions = compileFunction(`${cancellationSource.replaceAll('import.meta.client', 'true').replaceAll('import.meta.server', 'false').replaceAll('import.meta.dev', 'false').replaceAll('import.meta.prerender', 'false')}; return { clearNuxtData, buildAsyncData }`, [
  'useNuxtApp',
  'toArray',
  'ref',
  'shallowRef',
  'computed',
  'toRef',
  'unref',
  'toValue',
  'nextTick',
  'debounceTick',
  'createError',
  'pendingWhenIdle',
  'purgeCachedData',
  'granularCachedData',
])

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function asyncCache() {
  const nuxtApp = {
    isHydrating: false,
    payload: { data: Vue.reactive({}), _errors: Vue.reactive({}) },
    static: { data: {} },
    _asyncData: {},
    _asyncDataPromises: {},
    hook: () => () => {},
  }
  const actual = nuxtFunctions(() => nuxtApp, value => Array.isArray(value) ? value : [value], Vue.ref, Vue.shallowRef, Vue.computed, Vue.toRef, Vue.unref, Vue.toValue, Vue.nextTick, fn => fn, error => error, false, true, false)
  const requests = []
  const clearCalls = []
  function entry(key, owner, cached) {
    if (nuxtApp._asyncData[key]?._init)
      return nuxtApp._asyncData[key]
    const current = actual.buildAsyncData(nuxtApp, key, (_app, { signal }) => {
      const request = { ...deferred(), owner, signal, key }
      requests.push(request)
      return request.promise
    }, { default: () => undefined, getCachedData: () => undefined, enabled: true, dedupe: 'cancel', deep: false }, cached)
    nuxtApp._asyncData[key] = current
    return current
  }
  function read(key, owner) {
    const current = entry(key, owner)
    current._deps++
    Vue.onScopeDispose(() => {
      current._deps--
      if (current._deps === 0)
        current._off()
    })
    const promise = current.execute()
    requests.at(-1).operation = promise
    return { current, promise }
  }
  function clear(keys) {
    clearCalls.push([...keys])
    actual.clearNuxtData(keys)
  }
  function seed(key, value) {
    entry(key, 'seed', value)
    nuxtApp.payload.data[key] = value
  }
  return { nuxtApp, requests, clearCalls, clear, seed, read, actual, entry }
}

function node(tag, text = '') {
  return { tag, text, props: {}, children: [], parent: null }
}

const renderer = Vue.createRenderer({
  createElement: tag => node(tag),
  createText: text => node('#text', text),
  createComment: text => node('#comment', text),
  setText: (target, text) => target.text = text,
  setElementText: (target, text) => target.text = text,
  parentNode: target => target.parent,
  nextSibling: target => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _previous, value) => target.props[key] = value,
  insert(target, parent, anchor = null) {
    if (target.parent)
      target.parent.children.splice(target.parent.children.indexOf(target), 1)
    target.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0)
      parent.children.push(target)
    else
      parent.children.splice(index, 0, target)
  },
  remove(target) {
    target.parent.children.splice(target.parent.children.indexOf(target), 1)
    target.parent = null
  },
})

const identity = (id, role = 'buyer') => ({ id, role, name: `${role} ${id}` })

function boundary({ user, route, cache, redirects, isClient = true }) {
  const module = { exports: {} }
  const autoImports = ['ref', 'computed', 'watch']
  const load = compileFunction(source, ['module', 'exports', 'require', 'isClient', 'useUserSession', 'useNuxtApp', 'useRouter', 'clearNuxtData', 'navigateTo', ...autoImports])
  load(module, module.exports, (specifier) => {
    assert.equal(specifier, 'vue')
    return Vue
  }, isClient, () => ({ user }), () => cache.nuxtApp, () => ({ currentRoute: route }), cache.clear, (path, options) => {
    redirects.push({ path, options })
    return Promise.resolve()
  }, ...autoImports.map(name => Vue[name]))
  return module.exports.default
}

function mount(t, { initialUser = identity('a'), path = '/buyer/inquiries', hydrating = false } = {}) {
  const user = Vue.ref(initialUser)
  const route = Vue.ref({ path, query: { page: '1' } })
  const cache = asyncCache()
  cache.nuxtApp.isHydrating = hydrating
  const redirects = []
  const mounts = []
  const disposed = []
  const branch = Vue.shallowRef()
  let sequence = 0
  const StatefulPage = Vue.defineComponent({
    setup() {
      const owner = user.value ? `${user.value.role}:${user.value.id}` : 'guest'
      const draft = Vue.ref('')
      const error = Vue.ref('')
      const page = Vue.ref(1)
      const { current } = cache.read('private-data', owner)
      Vue.onScopeDispose(() => disposed.push(owner))
      return () => Vue.h('private-page', { owner, draft: draft.value, error: error.value, page: page.value, onDraft: value => draft.value = value, onError: value => error.value = value, onPage: value => page.value = value }, String(current.data.value ?? ''))
    },
  })
  const PendingPage = Vue.defineComponent({
    async setup() {
      const owner = user.value ? `${user.value.role}:${user.value.id}` : 'guest'
      const { current, promise } = cache.read('pending-private-data', owner)
      await promise
      return () => Vue.h('pending-result', { owner }, String(current.data.value ?? ''))
    },
  })
  branch.value = StatefulPage
  const NuxtPage = Vue.defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs }) {
      const id = ++sequence
      mounts.push({ id, key: Vue.getCurrentInstance().vnode.key, attrs: { ...attrs }, owner: user.value?.id })
      return () => Vue.h(Vue.Suspense, { timeout: -1 }, {
        default: () => Vue.h(branch.value),
        fallback: () => Vue.h('waiting'),
      })
    },
  })
  const root = node('root')
  const app = renderer.createApp(boundary({ user, route, cache, redirects }))
  app.component('NuxtPage', NuxtPage)
  app.mount(root)
  t.after(() => app.unmount())
  function all(tag, target = root) {
    return [...(target.tag === tag ? [target] : []), ...target.children.flatMap(child => all(tag, child))]
  }
  const text = (target = root) => target.text + target.children.map(child => text(child)).join('')
  async function complete(request, value, failure = false) {
    if (failure)
      request.reject(new Error(value))
    else
      request.resolve(value)
    await request.operation
    await Vue.nextTick()
    await Vue.nextTick()
  }
  return { user, route, cache, redirects, mounts, disposed, branch, PendingPage, all, text, complete }
}

test('the root integrates the boundary without overriding Nuxt page-key behavior', () => {
  const app = readFileSync(new URL('../app/app.vue', import.meta.url), 'utf8')
  assert.ok(app.includes('<AccountViewBoundary />'))
  assert.ok(!app.includes('<NuxtPage'))
  assert.ok(!componentSource.includes('page-key') && !componentSource.includes('pageKey'))
  const names = ['ROUTE_KEY_PARENTHESES_RE', 'ROUTE_KEY_SYMBOLS_RE', 'ROUTE_KEY_NORMAL_RE', 'interpolatePath', 'generateRouteKey']
  const generate = compileFunction(`${declarations(routeSource, names)}; return generateRouteKey`)()
  const Component = { type: {} }
  const route = { path: '/buyer/inquiries', params: {}, query: { page: '1' }, matched: [{ path: '/buyer/inquiries', components: { default: Component.type }, meta: {} }] }
  assert.equal(generate({ Component, route }), '/buyer/inquiries')
  route.query.page = '2'
  assert.equal(generate({ Component, route }), '/buyer/inquiries')
  route.matched[0].meta.key = current => current.query.page
  assert.equal(generate({ Component, route }), '2')
  assert.equal(generate({ Component, route }, current => `${current.path}:${current.query.page}`), '/buyer/inquiries:2')
})

test('same-principal changes preserve local state, query behavior, and the async cache', async (t) => {
  const ui = mount(t)
  await ui.complete(ui.cache.requests[0], 'Buyer A private history')
  const page = ui.all('private-page')[0]
  page.props.onDraft('Buyer A private draft')
  page.props.onError('Buyer A error')
  page.props.onPage(3)
  ui.user.value = { ...identity('a'), name: 'Changed display name' }
  ui.route.value = { ...ui.route.value, query: { page: '2' } }
  await Vue.nextTick()
  assert.equal(ui.mounts.length, 1)
  assert.equal(ui.mounts[0].key, 0)
  assert.deepEqual(ui.mounts[0].attrs, {})
  assert.equal(ui.cache.clearCalls.length, 0)
  assert.equal(ui.all('private-page')[0].props.draft, 'Buyer A private draft')
  assert.equal(ui.all('private-page')[0].props.error, 'Buyer A error')
  assert.equal(ui.all('private-page')[0].props.page, 3)
  assert.ok(ui.text().includes('Buyer A private history'))
})

test('a Buyer change synchronously clears all cache keys before the new page starts', async (t) => {
  const ui = mount(t)
  await ui.complete(ui.cache.requests[0], 'Buyer A private history')
  ui.all('private-page')[0].props.onDraft('Buyer A private draft')
  ui.cache.seed('other-private-cache', 'Another private result')
  ui.cache.nuxtApp.payload.data['payload-only'] = 'Hydrated private result'
  ui.user.value = identity('b')
  assert.equal(ui.cache.clearCalls.length, 1)
  assert.deepEqual(new Set(ui.cache.clearCalls[0]), new Set(['private-data', 'other-private-cache', 'payload-only']))
  assert.equal(ui.cache.nuxtApp._asyncData['private-data'].data.value, undefined)
  assert.equal(ui.cache.nuxtApp._asyncData['other-private-cache'].data.value, undefined)
  assert.equal(ui.cache.nuxtApp.payload.data['payload-only'], undefined)
  await Vue.nextTick()
  assert.equal(ui.mounts.length, 2)
  assert.equal(ui.mounts[1].key, 1)
  assert.equal(ui.disposed.length, 1)
  assert.equal(ui.cache.requests[1].owner, 'buyer:b')
  assert.equal(ui.all('private-page')[0].props.draft, '')
  assert.equal(ui.all('private-page')[0].props.error, '')
  assert.equal(ui.all('private-page')[0].props.page, 1)
  assert.ok(!ui.text().includes('Buyer A'))
  await ui.complete(ui.cache.requests[1], 'Buyer B private history')
  assert.ok(ui.text().includes('Buyer B private history'))
})

for (const failure of [false, true]) {
  test(`the whole NuxtPage remount removes an old Suspense branch and ignores late ${failure ? 'failure' : 'success'}`, async (t) => {
    const ui = mount(t)
    await ui.complete(ui.cache.requests[0], 'Buyer A private history')
    ui.all('private-page')[0].props.onDraft('Buyer A private draft')
    ui.branch.value = ui.PendingPage
    await Vue.nextTick()
    const oldRequest = ui.cache.requests[1]
    assert.ok(ui.text().includes('Buyer A private history'), 'the real Suspense retains its old resolved branch while the new branch is pending')
    assert.equal(Object.hasOwn(ui.cache.nuxtApp.payload.data, 'pending-private-data'), false)
    ui.user.value = identity('b')
    assert.ok(ui.cache.clearCalls[0].includes('pending-private-data'), 'initial pending data absent from payload is included explicitly')
    assert.equal(ui.cache.nuxtApp._asyncDataPromises['pending-private-data'], undefined)
    await Vue.nextTick()
    assert.equal(ui.all('private-page').length, 0, 'keying the entire NuxtPage removes its old Suspense branch')
    assert.ok(!ui.text().includes('Buyer A'))
    const newRequest = ui.cache.requests[2]
    assert.equal(newRequest.owner, 'buyer:b')
    if (failure) {
      oldRequest.reject(new Error('Buyer A late private error'))
      await Vue.nextTick()
    }
    else {
      await ui.complete(oldRequest, 'Buyer A late private data')
    }
    assert.ok(!ui.text().includes('Buyer A'))
    assert.equal(ui.cache.nuxtApp.payload.data['pending-private-data'], undefined)
    assert.equal(ui.cache.nuxtApp._asyncData['pending-private-data'].error.value, undefined)
    assert.equal(ui.cache.nuxtApp._asyncData['pending-private-data'].status.value, 'pending')
    await ui.complete(newRequest, 'Buyer B pending history')
    await oldRequest.operation
    assert.ok(ui.text().includes('Buyer B pending history'))
  })
}

test('same-tick Buyer A to B to A invalidates the old view and pending request twice', async (t) => {
  const ui = mount(t)
  const oldRequest = ui.cache.requests[0]
  ui.all('private-page')[0].props.onDraft('Old Buyer A draft')
  ui.user.value = identity('b')
  ui.user.value = identity('a')
  assert.equal(ui.cache.clearCalls.length, 2)
  await Vue.nextTick()
  assert.equal(ui.mounts.length, 2)
  assert.equal(ui.mounts[1].key, 2)
  assert.equal(ui.all('private-page')[0].props.draft, '')
  const newRequest = ui.cache.requests[1]
  await ui.complete(oldRequest, 'Old Buyer A private data')
  assert.ok(!ui.text().includes('Old Buyer A'))
  assert.equal(ui.cache.nuxtApp._asyncData['private-data'].status.value, 'pending')
  await ui.complete(newRequest, 'New Buyer A private data')
  assert.ok(ui.text().includes('New Buyer A private data'))
})

for (const scenario of [
  { path: '/admin/properties/new', initial: identity('a', 'agency'), next: null, target: '/login' },
  { path: '/admin/properties/a', initial: identity('a', 'agency'), next: identity('a'), target: '/buyer' },
  { path: '/buyer/inquiries', initial: identity('a'), next: null, target: '/buyer/login' },
  { path: '/buyer/saved', initial: identity('a'), next: identity('a', 'agency'), target: '/admin' },
]) {
  test(`wrong-role transition gates ${scenario.path} and redirects only to ${scenario.target}`, async (t) => {
    const ui = mount(t, { initialUser: scenario.initial, path: scenario.path })
    ui.all('private-page')[0].props.onDraft('Private form draft')
    const oldRequest = ui.cache.requests[0]
    ui.user.value = scenario.next
    assert.deepEqual(ui.redirects, [{ path: scenario.target, options: { replace: true } }])
    await Vue.nextTick()
    assert.equal(ui.all('private-page').length, 0)
    assert.equal(ui.mounts.length, 1, 'no wrong-role page or request starts while redirection is pending')
    await ui.complete(oldRequest, 'Old private response')
    assert.ok(!ui.text().includes('Old private response'))
  })
}

test('the actual router path gates a wrong-role pending private navigation before child setup', async (t) => {
  const ui = mount(t, { initialUser: identity('a'), path: '/search' })
  ui.route.value = { path: '/ADMIN/properties/new/', query: {} }
  await Vue.nextTick()
  assert.equal(ui.all('private-page').length, 0)
  assert.deepEqual(ui.redirects, [{ path: '/buyer', options: { replace: true } }])
  assert.equal(ui.mounts.length, 1)
})

for (const path of ['/buyer/login', '/buyer/register/', '/login', '/register', '/search']) {
  test(`Guest can enter public account or marketplace path ${path}`, (t) => {
    const ui = mount(t, { initialUser: null, path })
    assert.equal(ui.mounts.length, 1)
    assert.equal(ui.redirects.length, 0)
    assert.equal(ui.cache.clearCalls.length, 0)
  })
}

test('SSR and hydrated client start with the same whole-page key and do not clear initial data', async (t) => {
  const user = Vue.ref(identity('a'))
  const route = Vue.ref({ path: '/buyer/inquiries' })
  const cache = asyncCache()
  cache.nuxtApp.isHydrating = true
  cache.seed('ssr-data', 'SSR private history')
  const redirects = []
  const keys = []
  const app = Vue.createSSRApp(boundary({ user, route, cache, redirects, isClient: false }))
  app.component('NuxtPage', Vue.defineComponent({ setup() {
    keys.push(Vue.getCurrentInstance().vnode.key)
    return () => Vue.h('p', 'SSR page')
  } }))
  assert.equal(await renderToString(app), '<p>SSR page</p>')
  assert.deepEqual(keys, [0])
  assert.equal(cache.clearCalls.length, 0)
  assert.equal(cache.nuxtApp.payload.data['ssr-data'], 'SSR private history')
  const client = mount(t, { hydrating: true })
  assert.equal(client.mounts[0].key, keys[0])
  assert.equal(client.cache.clearCalls.length, 0)
  client.cache.nuxtApp.isHydrating = false
  client.user.value = { ...identity('a'), name: 'Hydrated display name' }
  await Vue.nextTick()
  assert.equal(client.mounts.length, 1)
  assert.equal(client.cache.clearCalls.length, 0)
})

test('installed Nuxt clear behavior detaches pending operations rather than aborting transport', async () => {
  const cache = asyncCache()
  const entry = cache.entry('pending', 'buyer:a')
  const operation = entry.execute()
  const request = cache.requests[0]
  assert.equal(Object.hasOwn(cache.nuxtApp.payload.data, 'pending'), false)
  cache.actual.clearNuxtData()
  assert.equal(cache.nuxtApp._asyncDataPromises.pending, operation, 'no-argument clear enumerates only payload keys')
  cache.actual.clearNuxtData(['pending'])
  assert.equal(cache.nuxtApp._asyncDataPromises.pending, undefined)
  assert.equal(entry.status.value, 'idle')
  assert.equal(request.signal.aborted, false, 'installed clearNuxtData does not abort the transport controller')
  request.resolve('Old private result')
  await operation
  assert.equal(entry.data.value, undefined)
  assert.equal(cache.nuxtApp.payload.data.pending, undefined)
})
