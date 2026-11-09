import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { compileFunction } from 'node:vm'
import ts from 'typescript'
import * as Vue from 'vue'
import * as requestError from '../app/utils/request-error.ts'
import * as inquiry from '../shared/inquiry.ts'

const { parse, compileScript } = createRequire(import.meta.resolve('vue'))('@vue/compiler-sfc')

function compilePage(role) {
  const path = role === 'buyer' ? 'buyer' : 'admin'
  const filename = new URL(`../app/pages/${path}/inquiries.vue`, import.meta.url).pathname
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const compiled = compileScript(descriptor, { id: `inquiry-${role}-view-test`, inlineTemplate: true })
  return ts.transpileModule(compiled.content, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
  }).outputText
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
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

const account = (role, id) => ({ id, role, name: `${role} ${id}`, email: `${role}-${id}@example.invalid` })
function history(owner, change = {}) {
  return {
    items: [{ id: `inquiry-${owner}`, propertyId: null, propertyTitle: `Property ${owner}`, propertyNumber: `LOCAL-${owner}`, agencyName: `Agency ${owner}`, buyerName: `Buyer ${owner}`, buyerEmail: `private-${owner}@example.invalid`, message: `private message ${owner}`, notificationStatus: 'failed', notifiedAt: null, readAt: null, createdAt: '2026-10-09T12:00:00Z', ...change }],
    total: 1,
    page: 1,
    pageSize: 20,
  }
}

async function mountedPage(t, role) {
  const user = Vue.ref(account(role, 'a'))
  const loggedIn = Vue.ref(true)
  const ready = Vue.ref(true)
  const requests = []
  const entries = new Map()
  let currentKey
  const mounted = deferred()
  const request = (path, options = {}) => {
    const pending = deferred()
    requests.push({ ...pending, path, owner: user.value?.id, method: options.method ?? 'GET', query: Vue.toValue(options.query?.page) })
    return pending.promise
  }
  function asyncData(keySource, handler, options = {}) {
    const key = Vue.computed(() => Vue.toValue(keySource))
    currentKey = key
    function entry(value) {
      if (!entries.has(value))
        entries.set(value, { data: Vue.shallowRef(), status: Vue.ref('idle'), error: Vue.shallowRef() })
      return entries.get(value)
    }
    async function execute(value = key.value) {
      const current = entry(value)
      if (options.enabled !== undefined && !Vue.toValue(options.enabled))
        return
      current.status.value = 'pending'
      try {
        current.data.value = await handler({}, { signal: new AbortController().signal })
        current.error.value = undefined
        current.status.value = 'success'
      }
      catch (error) {
        current.error.value = error
        current.status.value = 'error'
      }
    }
    const refs = Object.fromEntries(['data', 'status', 'error'].map(name => [name, Vue.computed({ get: () => entry(key.value)[name].value, set: value => entry(key.value)[name].value = value })]))
    const result = { ...refs, refresh: () => execute(), clear: () => clearData(key.value) }
    Vue.watch(key, (value, previous) => {
      entry(value).data.value = entry(previous).data.value
      void execute(value)
    }, { flush: 'sync' })
    if (options.watch)
      Vue.watch(options.watch, () => void execute())
    void execute()
    return result
  }
  function clearData(key) {
    const keys = typeof key === 'function' ? [...entries.keys()].filter(key) : [key]
    for (const value of keys) {
      const entry = entries.get(value)
      if (entry) {
        entry.data.value = undefined
        entry.error.value = undefined
        entry.status.value = 'idle'
      }
    }
  }
  function useFetch(path, options) {
    return Promise.resolve(asyncData(options.key ?? `unscoped:${path}`, () => request(path, options), { ...options, watch: [options.query.page] }))
  }
  const require = (specifier) => {
    if (specifier === 'vue')
      return Vue
    if (specifier === '#shared/inquiry')
      return inquiry
    if (specifier === '../../utils/request-error')
      return requestError
    throw new Error(`Unexpected page import: ${specifier}`)
  }
  const module = { exports: {} }
  const autoImports = ['ref', 'shallowRef', 'reactive', 'computed', 'watch', 'onBeforeUnmount', 'onScopeDispose']
  const names = ['module', 'exports', 'require', 'definePageMeta', 'useSeoMeta', 'useUserSession', 'useFetch', 'useAsyncData', 'useRequestFetch', 'clearNuxtData', '$fetch', ...autoImports]
  const load = compileFunction(compilePage(role), names)
  load(module, module.exports, require, () => {}, () => {}, () => ({ user, loggedIn, ready }), useFetch, asyncData, () => request, clearData, request, ...autoImports.map(name => Vue[name]))
  const app = renderer.createApp({ render: () => Vue.h(Vue.Suspense, null, { default: () => Vue.h(module.exports.default) }) })
  for (const name of ['BuyerDashboardShell', 'AdminDashboardShell', 'UButton', 'UAlert', 'UCard', 'UBadge', 'UPagination']) {
    app.component(name, Vue.defineComponent({
      name,
      inheritAttrs: false,
      setup(_props, { attrs, slots }) {
        if (name.endsWith('DashboardShell'))
          Vue.onMounted(() => mounted.resolve())
        return () => Vue.h(name, { ...attrs }, Object.entries(slots).map(([key, slot]) => Vue.h('section', { key }, slot())))
      },
    }))
  }
  const root = node('root')
  app.mount(root)
  t.after(() => app.unmount())
  await mounted.promise
  function all(tag, target = root) {
    return [...(target.tag === tag ? [target] : []), ...target.children.flatMap(child => all(tag, child))]
  }
  function text(target = root) {
    return target.text + target.children.map(child => text(child)).join('')
  }
  async function settle(pending, value, failure = false) {
    if (failure)
      pending.reject(value)
    else
      pending.resolve(value)
    await pending.promise.catch(() => {})
    await Vue.nextTick()
    await Vue.nextTick()
  }
  return {
    user,
    loggedIn,
    ready,
    requests,
    all,
    text,
    settle,
    entries,
    key: () => currentKey.value,
    cached: () => entries.get(currentKey.value).data.value,
    reuseCached(value) {
      entries.get(currentKey.value).data.value = value
      entries.get(currentKey.value).status.value = 'success'
    },
    button(label) {
      const button = all('UButton').find(button => text(button).includes(label))
      assert.ok(button, `expected ${label} button`)
      return button
    },
  }
}

for (const role of ['buyer', 'agency']) {
  test(`compiled ${role} Inquiry view clears previous identity data during a live session switch`, async (t) => {
    const ui = await mountedPage(t, role)
    await ui.settle(ui.requests[0], history('a'))
    assert.ok(ui.text().includes('private message a'))
    if (role === 'agency')
      assert.ok(ui.text().includes('private-a@example.invalid'))
    const keyA = ui.key()
    const cachedA = ui.cached()
    ui.user.value = account(role, 'b')
    await Vue.nextTick()
    assert.ok(!ui.text().includes('private message a'), 'B must not see the retained A message')
    assert.ok(!ui.text().includes('private-a@example.invalid'))
    assert.notEqual(ui.key(), keyA)
    assert.ok(ui.key().includes('b'))
    ui.reuseCached(cachedA)
    await Vue.nextTick()
    assert.ok(!ui.text().includes('private message a'), 'owner gating also rejects retained cache values')
    await ui.settle(ui.requests.findLast(request => request.owner === 'b'), history('b'))
    assert.ok(ui.text().includes('private message b'))
  })

  for (const oldOutcome of ['success', 'failure']) {
    test(`compiled ${role} Inquiry view rejects lost ${oldOutcome} across same-tick A to B to A`, async (t) => {
      const ui = await mountedPage(t, role)
      await ui.settle(ui.requests[0], history('a'))
      const oldKey = ui.key()
      const cachedA = ui.cached()
      const oldRefresh = ui.button('重新整理').props.onClick()
      const oldRequest = ui.requests.at(-1)
      ui.user.value = account(role, 'b')
      ui.user.value = account(role, 'a')
      await Vue.nextTick()
      const newRequest = ui.requests.at(-1)
      assert.notEqual(ui.key(), oldKey, 'returning to the same ID must create a new identity epoch')
      assert.ok(!ui.text().includes('private message a'))
      ui.reuseCached(cachedA)
      await Vue.nextTick()
      assert.ok(!ui.text().includes('private message a'), 'same-owner cache from an old epoch must not be displayed')
      assert.ok(!ui.text().includes('private-a@example.invalid'))
      await ui.settle(newRequest, history('a', { message: 'Fresh A message', buyerEmail: 'fresh-a@example.invalid' }))
      assert.ok(ui.text().includes('Fresh A message'))
      if (oldOutcome === 'success')
        await ui.settle(oldRequest, history('a', { message: 'Lost private A message' }))
      else
        await ui.settle(oldRequest, new Error('Lost private A failure'), true)
      await oldRefresh
      await Vue.nextTick()
      assert.ok(ui.text().includes('Fresh A message'))
      assert.ok(!ui.text().includes('Lost private A'))
      assert.equal(ui.entries.get(oldKey).data.value, null, 'the stale handler cannot repopulate private cached data')
      assert.equal(ui.entries.get(oldKey).error.value, undefined)
    })
  }

  for (const loss of ['logout', 'role', 'readiness']) {
    test(`compiled ${role} Inquiry view hides data and ignores a pending response after ${loss} loss`, async (t) => {
      const ui = await mountedPage(t, role)
      await ui.settle(ui.requests[0], history('a'))
      const oldKey = ui.key()
      const oldRefresh = ui.button('重新整理').props.onClick()
      const pending = ui.requests.at(-1)
      const count = ui.requests.length
      if (loss === 'logout')
        ui.loggedIn.value = false
      else if (loss === 'role')
        ui.user.value = account(role === 'buyer' ? 'agency' : 'buyer', 'a')
      else
        ui.ready.value = false
      assert.equal(ui.entries.get(oldKey).data.value, undefined, 'private cache clears synchronously')
      await Vue.nextTick()
      assert.equal(ui.all('UCard').length, 0)
      assert.ok(!ui.text().includes('private-a@example.invalid'))
      assert.equal(ui.requests.length, count, 'a lost identity cannot start a private request')
      await ui.settle(pending, history('a', { message: 'Lost private A message' }))
      await oldRefresh
      await Vue.nextTick()
      assert.equal(ui.all('UCard').length, 0)
      assert.ok(!ui.text().includes('Lost private A message'))
      assert.equal(ui.button('重新整理').props.disabled, true)
    })
  }

  test(`compiled ${role} Inquiry view resets pagination and clears all previous-owner page caches`, async (t) => {
    const ui = await mountedPage(t, role)
    await ui.settle(ui.requests[0], { ...history('a'), total: 41 })
    const firstKey = ui.key()
    ui.all('UPagination')[0].props['onUpdate:page'](2)
    await Vue.nextTick()
    const secondKey = ui.key()
    assert.equal(ui.requests.at(-1).query, 2)
    await ui.settle(ui.requests.at(-1), { ...history('a', { message: 'Private A page two' }), page: 2, total: 41 })
    ui.user.value = account(role, 'b')
    assert.equal(ui.entries.get(firstKey).data.value, undefined)
    assert.equal(ui.entries.get(secondKey).data.value, undefined)
    await Vue.nextTick()
    assert.equal(ui.requests.at(-1).query, 1)
    assert.equal(ui.requests.at(-1).owner, 'b')
    assert.ok(!ui.text().includes('Private A page two'))
  })
}

for (const oldOutcome of ['success', 'failure']) {
  test(`compiled Agency read action rejects stale ${oldOutcome} and cleanup across A to B to A`, async (t) => {
    const ui = await mountedPage(t, 'agency')
    const first = history('a')
    await ui.settle(ui.requests[0], first)
    const oldCallback = ui.button('標示已讀').props.onClick
    const oldRead = oldCallback()
    const oldRequest = ui.requests.at(-1)
    assert.equal(oldRequest.method, 'PATCH')
    ui.user.value = account('agency', 'b')
    ui.user.value = account('agency', 'a')
    await Vue.nextTick()
    const fresh = history('a', { message: 'Fresh Agency A message' })
    await ui.settle(ui.requests.at(-1), fresh)
    assert.equal(ui.button('標示已讀').props.loading, false)
    await oldCallback()
    assert.equal(ui.requests.filter(request => request.method === 'PATCH').length, 1, 'a retained row callback cannot mutate a new inbox')
    const newRead = ui.button('標示已讀').props.onClick()
    const newRequest = ui.requests.at(-1)
    await Vue.nextTick()
    assert.equal(ui.button('標示已讀').props.loading, true)
    if (oldOutcome === 'success')
      await ui.settle(oldRequest, { id: 'inquiry-a', readAt: '2026-10-09T12:01:00Z' })
    else
      await ui.settle(oldRequest, { data: { statusMessage: 'Old private Agency A failure' } }, true)
    await oldRead
    await Vue.nextTick()
    assert.equal(first.items[0].readAt, null, 'a stale response must not mutate its detached row')
    assert.equal(fresh.items[0].readAt, null)
    assert.equal(ui.button('標示已讀').props.loading, true, 'old finally cannot unlock the new read request for the same ID')
    assert.ok(!ui.all('UAlert').some(alert => alert.props.title === 'Old private Agency A failure'))
    await ui.button('標示已讀').props.onClick()
    assert.equal(ui.requests.filter(request => request.method === 'PATCH').length, 2)
    await ui.settle(newRequest, { id: 'inquiry-a', readAt: '2026-10-09T12:02:00Z' })
    await newRead
    await Vue.nextTick()
    assert.equal(fresh.items[0].readAt, '2026-10-09T12:02:00Z')
    assert.ok(ui.text().includes('已讀時間'))
  })
}

test('compiled Agency inbox reconciles an accepted read after refresh returns a replacement unread row', async (t) => {
  const ui = await mountedPage(t, 'agency')
  const initial = history('a')
  await ui.settle(ui.requests[0], initial)
  const oldCallback = ui.button('標示已讀').props.onClick
  const markRead = oldCallback()
  const patch = ui.requests.at(-1)
  assert.equal(patch.method, 'PATCH')

  const refresh = ui.button('重新整理').props.onClick()
  const replacement = history('a', { message: 'Same Agency refreshed message' })
  await ui.settle(ui.requests.at(-1), replacement)
  await refresh
  assert.equal(replacement.items[0].readAt, null)
  assert.equal(ui.button('標示已讀').props.loading, true)

  const readAt = '2026-10-09T12:03:00Z'
  await ui.settle(patch, { id: 'inquiry-a', readAt })
  await markRead
  await Vue.nextTick()
  assert.equal(replacement.items[0].readAt, readAt, 'accepted read must reconcile the current-owner row by ID')
  assert.equal(initial.items[0].readAt, null, 'the detached row is not the accepted result target')
  assert.ok(ui.text().includes('Same Agency refreshed message'))
  assert.ok(ui.text().includes('已讀時間'))
  assert.ok(!ui.all('UButton').some(button => ui.text(button).includes('標示已讀')))
  await oldCallback()
  assert.equal(ui.requests.filter(request => request.method === 'PATCH').length, 1, 'a detached callback remains denied after acceptance')
})

test('compiled Agency inbox preserves an accepted read when a held unread GET completes afterward', async (t) => {
  const ui = await mountedPage(t, 'agency')
  const initial = history('a')
  await ui.settle(ui.requests[0], initial)
  const markRead = ui.button('標示已讀').props.onClick()
  const patch = ui.requests.at(-1)
  const refresh = ui.button('重新整理').props.onClick()
  const heldGet = ui.requests.at(-1)
  const unreadSnapshot = history('a', { message: 'Held unread GET message' })
  assert.equal(unreadSnapshot.items[0].readAt, null)
  assert.equal(heldGet.method, 'GET')

  const readAt = '2026-10-09T12:04:00Z'
  await ui.settle(patch, { id: 'inquiry-a', readAt })
  await markRead
  assert.equal(initial.items[0].readAt, readAt)
  await ui.settle(heldGet, unreadSnapshot)
  await refresh
  await Vue.nextTick()
  assert.equal(unreadSnapshot.items[0].readAt, readAt, 'late GET must retain the accepted read timestamp')
  assert.ok(ui.text().includes('Held unread GET message'))
  assert.ok(ui.text().includes('已讀時間'))
  assert.ok(!ui.all('UButton').some(button => ui.text(button).includes('標示已讀')))
  assert.equal(ui.requests.length, 3, 'reconciliation needs no extra PATCH, GET, or polling')
})

test('compiled Agency inbox clears a private read error and guards a replaced inbox row', async (t) => {
  const ui = await mountedPage(t, 'agency')
  await ui.settle(ui.requests[0], history('a'))
  const firstRead = ui.button('標示已讀').props.onClick()
  await ui.settle(ui.requests.at(-1), { data: { statusMessage: 'Private Agency A failure' } }, true)
  await firstRead
  await Vue.nextTick()
  assert.ok(ui.all('UAlert').some(alert => alert.props.title === 'Private Agency A failure'))
  ui.user.value = account('agency', 'b')
  await Vue.nextTick()
  assert.ok(!ui.all('UAlert').some(alert => alert.props.title === 'Private Agency A failure'))
  await ui.settle(ui.requests.at(-1), history('b'))
  const oldCallback = ui.button('標示已讀').props.onClick
  const oldRead = oldCallback()
  const oldRequest = ui.requests.at(-1)
  const refresh = ui.button('重新整理').props.onClick()
  const fresh = history('b')
  await ui.settle(ui.requests.at(-1), fresh)
  await refresh
  await ui.settle(oldRequest, { data: { statusMessage: 'Error for replaced inbox row' } }, true)
  await oldRead
  await Vue.nextTick()
  assert.ok(!ui.all('UAlert').some(alert => alert.props.title === 'Error for replaced inbox row'))
  const count = ui.requests.length
  await oldCallback()
  assert.equal(ui.requests.length, count, 'a callback for a detached row cannot send a new mutation')
  assert.equal(fresh.items[0].readAt, null)
})
