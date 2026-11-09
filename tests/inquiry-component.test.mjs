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
const filename = new URL('../app/components/PropertyInquiry.vue', import.meta.url).pathname
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const compiled = compileScript(descriptor, { id: 'inquiry-privacy-test', inlineTemplate: true })
const source = ts.transpileModule(compiled.content, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
}).outputText

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

function uiComponent(name) {
  return Vue.defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => Vue.h(name, { ...attrs }, name === 'UModal' && !attrs.open
        ? []
        : Object.entries(slots).map(([key, slot]) => Vue.h('section', { key }, slot())))
    },
  })
}

const buyer = id => ({ id, role: 'buyer', name: `Buyer ${id}`, email: `${id}@example.invalid` })
const response = id => ({ id, notificationStatus: 'failed', createdAt: '2026-10-09T12:00:00Z' })

function mountedInquiry(t) {
  const user = Vue.ref(buyer('a'))
  const loggedIn = Vue.ref(true)
  const ready = Vue.ref(true)
  const requests = []
  const require = (specifier) => {
    if (specifier === 'vue')
      return Vue
    if (specifier === '#shared/inquiry')
      return inquiry
    if (specifier === '../utils/request-error')
      return requestError
    throw new Error(`Unexpected component import: ${specifier}`)
  }
  const fetch = (path, options) => {
    assert.equal(path, '/api/buyer/inquiries')
    const pending = deferred()
    requests.push({ ...pending, body: structuredClone(options.body) })
    return pending.promise
  }
  const module = { exports: {} }
  const autoImports = ['ref', 'shallowRef', 'reactive', 'computed', 'watch', 'useId', 'onBeforeUnmount']
  const load = compileFunction(source, ['module', 'exports', 'require', 'useUserSession', '$fetch', ...autoImports])
  load(module, module.exports, require, () => ({ user, loggedIn, ready }), fetch, ...autoImports.map(name => Vue[name]))
  const root = node('root')
  const app = renderer.createApp(module.exports.default, { propertyId: 'property-a', propertyTitle: 'Published Property A' })
  for (const name of ['UButton', 'UModal', 'UForm', 'UFormField', 'UTextarea', 'UAlert'])
    app.component(name, uiComponent(name))
  app.mount(root)
  t.after(() => app.unmount())

  function all(tag, target = root) {
    return [...(target.tag === tag ? [target] : []), ...target.children.flatMap(child => all(tag, child))]
  }
  const one = tag => assertOne(all(tag), tag)
  async function open() {
    await Vue.nextTick()
    const trigger = all('UButton').find(button => button.props.onClick && !button.props.form)
    assert.ok(trigger)
    trigger.props.onClick()
    await Vue.nextTick()
  }
  async function message(value) {
    one('UTextarea').props['onUpdate:modelValue'](value)
    await Vue.nextTick()
  }
  function submit() {
    return one('UForm').props.onSubmit()
  }
  function isSubmitting() {
    return all('UButton').find(button => button.props.form)?.props.loading ?? false
  }
  return { user, loggedIn, ready, requests, all, one, open, message, submit, isSubmitting, app }
}

function assertOne(nodes, tag) {
  assert.equal(nodes.length, 1, `expected one ${tag}`)
  return nodes[0]
}

test('compiled PropertyInquiry clears private draft and ignores an old response when Buyer changes', async (t) => {
  const ui = mountedInquiry(t)
  await ui.open()
  await ui.message('Private message from Buyer A')
  const pending = ui.submit()
  assert.equal(ui.requests.length, 1)
  await Vue.nextTick()
  assert.equal(ui.isSubmitting(), true)

  ui.user.value = buyer('b')
  await Vue.nextTick()
  assert.equal(ui.one('UModal').props.open, false, 'Buyer change closes the modal')
  await ui.open()
  assert.equal(ui.one('UTextarea').props.modelValue, '')
  assert.equal(ui.isSubmitting(), false)
  await ui.message('Private message from Buyer B')
  const newer = ui.submit()
  const newKey = ui.requests[1].body.submissionKey
  assert.notEqual(newKey, ui.requests[0].body.submissionKey)
  ui.requests[0].resolve(response('inquiry-a'))
  await pending
  await Vue.nextTick()
  assert.equal(ui.one('UTextarea').props.modelValue, 'Private message from Buyer B')
  assert.equal(ui.isSubmitting(), true, 'old finally must not unlock Buyer B submission')
  assert.ok(!ui.all('UAlert').some(alert => alert.props.title === '諮詢已儲存'))

  ui.requests[1].resolve(response('inquiry-b'))
  await newer
  await Vue.nextTick()
  assert.ok(ui.all('UAlert').some(alert => alert.props.title === '諮詢已儲存'))
})

for (const oldOutcome of ['success', 'failure']) {
  test(`compiled PropertyInquiry rejects stale ${oldOutcome} across same-tick A to B to A changes`, async (t) => {
    const ui = mountedInquiry(t)
    await ui.open()
    await ui.message('First Buyer A draft')
    const oldSubmit = ui.submit()
    const oldKey = ui.requests[0].body.submissionKey

    ui.user.value = buyer('b')
    ui.user.value = buyer('a')
    await Vue.nextTick()
    assert.equal(ui.one('UModal').props.open, false, 'each identity transition invalidates the old draft, even in one tick')
    await ui.open()
    assert.equal(ui.one('UTextarea').props.modelValue, '')
    await ui.message('New Buyer A draft')
    const newSubmit = ui.submit()
    assert.notEqual(ui.requests[1].body.submissionKey, oldKey)
    if (oldOutcome === 'success')
      ui.requests[0].resolve(response('old-inquiry-a'))
    else
      ui.requests[0].reject({ data: { statusMessage: 'Private error from the old Buyer A request' } })
    await oldSubmit
    await Vue.nextTick()

    assert.equal(ui.isSubmitting(), true)
    assert.equal(ui.one('UTextarea').props.modelValue, 'New Buyer A draft')
    assert.ok(!ui.all('UAlert').some(alert => alert.props.title === '諮詢已儲存' || alert.props.title.includes('Private error')))
    assert.equal(ui.requests.length, 2)
    await ui.submit()
    assert.equal(ui.requests.length, 2, 'an old finally cannot permit a duplicate newer submission')

    ui.requests[1].resolve(response('new-inquiry-a'))
    await newSubmit
    await Vue.nextTick()
    assert.ok(ui.all('UAlert').some(alert => alert.props.title === '諮詢已儲存'))
  })
}

test('compiled PropertyInquiry retains same-Buyer retries but clears failure and confirmation on logout', async (t) => {
  const ui = mountedInquiry(t)
  await ui.open()
  await ui.message('Buyer A retry draft')
  const firstSubmit = ui.submit()
  ui.requests[0].reject({ data: { statusMessage: 'Private Buyer A failure' } })
  await firstSubmit
  await Vue.nextTick()
  assert.equal(ui.one('UTextarea').props.modelValue, 'Buyer A retry draft')
  assert.ok(ui.all('UAlert').some(alert => alert.props.title === 'Private Buyer A failure'))

  const retry = ui.submit()
  assert.deepEqual(ui.requests[1].body, ui.requests[0].body, 'same identity retains the submission key and message')
  const oldFormSubmit = ui.one('UForm').props.onSubmit
  ui.loggedIn.value = false
  await Vue.nextTick()
  assert.equal(ui.one('UModal').props.open, false)
  assert.equal(ui.all('UTextarea').length, 0)
  assert.equal(ui.all('UAlert').length, 0)
  await oldFormSubmit()
  assert.equal(ui.requests.length, 2, 'a stale form callback cannot submit while logged out')
  ui.requests[1].reject({ data: { statusMessage: 'Old request failed after logout' } })
  await retry
  await Vue.nextTick()
  assert.equal(ui.all('UAlert').length, 0)

  ui.loggedIn.value = true
  await ui.open()
  assert.equal(ui.one('UTextarea').props.modelValue, '')
  await ui.message('New login draft')
  const newSubmit = ui.submit()
  assert.notEqual(ui.requests[2].body.submissionKey, ui.requests[0].body.submissionKey)
  ui.requests[2].resolve(response('confirmed-new-login'))
  await newSubmit
  await Vue.nextTick()
  assert.ok(ui.all('UAlert').some(alert => alert.props.title === '諮詢已儲存'))

  ui.loggedIn.value = false
  await Vue.nextTick()
  assert.equal(ui.one('UModal').props.open, false)
  assert.equal(ui.all('UAlert').length, 0)
  ui.loggedIn.value = true
  await ui.open()
  assert.equal(ui.one('UTextarea').props.modelValue, '', 'a confirmed Inquiry cannot return after another login')
  assert.equal(ui.isSubmitting(), false)
})

for (const nextIdentity of ['guest', 'agency']) {
  test(`compiled PropertyInquiry ignores a pending success after switching to ${nextIdentity}`, async (t) => {
    const ui = mountedInquiry(t)
    await ui.open()
    await ui.message('Private Buyer A draft')
    const oldSubmit = ui.submit()
    if (nextIdentity === 'guest')
      ui.user.value = null
    else
      ui.user.value = { ...buyer('a'), role: 'agency' }
    await Vue.nextTick()
    assert.equal(ui.one('UModal').props.open, false)
    ui.requests[0].resolve(response('old-private-inquiry'))
    await oldSubmit
    await Vue.nextTick()
    assert.equal(ui.all('UAlert').length, 0)
    ui.user.value = buyer('b')
    await ui.open()
    assert.equal(ui.one('UTextarea').props.modelValue, '')
    assert.equal(ui.isSubmitting(), false)
  })
}
