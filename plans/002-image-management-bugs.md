# Plan 002: Fix the failed-upload retry and make cover replacement atomic

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before the next step. If a STOP condition occurs, stop and report. Do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2d3bfef..HEAD -- app/components/AdminPropertyImages.vue 'server/api/admin/properties/[id]/images/[imageId].delete.ts' tests/site.test.mjs`
> Earlier plans in `plans/README.md` can change these files. If a file changed, compare the "Current state" excerpts with the live code. If the excerpted code is different, treat this as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-worker-tests-in-ci.md
- **Category**: bug
- **Planned at**: commit `2d3bfef`, 2026-11-10

## Why this matters

There are two defects in image management. First, the file input is cleared only after a successful upload. After a failed upload, the Owner picks the same file again and the browser fires no change event, so nothing happens. Second, deleting the cover photo uses two separate database writes. If the second write fails, a Published Listing has photos but no cover, and its card shows an empty image.

## Current state

`app/components/AdminPropertyImages.vue:33-46`:

```ts
function upload(event: Event, kind: PropertyImage['kind']) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  return run(async () => {
    for (const [index, file] of files.entries()) {
      busyLabel.value = `上傳中 ${index + 1}／${files.length}`
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kind)
      await $fetch(`/api/admin/properties/${props.propertyId}/images`, { method: 'POST', body })
    }
    input.value = ''
  })
}
```

`server/api/admin/properties/[id]/images/[imageId].delete.ts:18-21`:

```ts
  await database.delete(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, property.id)))
  if (image.isCover && photosLeft[0])
    await database.update(propertyImages).set({ isCover: true }).where(eq(propertyImages.id, photosLeft[0].id))
  await useImagesBucket(event).delete(imageId)
```

`database.batch([...])` is the existing atomic pattern. See `server/api/admin/properties/[id].delete.ts`.

Repository conventions: Nuxt 4 with Cloudflare Workers, antfu ESLint style (no semicolons, single quotes), no code comments unless they explain a constraint. User-facing text is Traditional Chinese. Vocabulary from `CONTEXT.md`: **Owner** is the logged-in agent, **Customer** is a visitor, **Listing** is a home, **Draft** and **Published Listing** are its states, **Property photo** and **Floor plan** are its images.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Worker tests | `pnpm test:worker` | exit 0, 0 skipped |

## Scope

**In scope**: the three files in the drift check.

**Out of scope**: the image upload route, image resizing (plan 003), the delete rule for the last photo.

## Git workflow

- This repository commits directly on `main`, by the maintainer's instruction. Do not create a branch.
- Use one Conventional Commits message, for example `fix: retry failed image uploads and replace covers atomically`.
- Do NOT push or deploy unless the operator tells you to.
- Do not stage `docs/research/screenshots/`. These files are untracked on purpose.
- Never print or commit the values of `.env` or `.dev.vars`.

## Steps

### Step 1: Clear the input before the upload starts

In `upload`, move `input.value = ''` to the line after `const files = ...`, and remove it from inside `run`. The `File` objects in `files` stay valid after the input is cleared.

**Verify**: `grep -n "input.value = ''\|return run(async () => {\|const files = Array" app/components/AdminPropertyImages.vue | head -3` -> the lines are in this order: `const files`, `input.value = ''`, `return run`.

### Step 2: Make the delete atomic

Replace the first three excerpted lines of the delete route with:

```ts
  const removeImage = database.delete(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, property.id)))
  if (image.isCover && photosLeft[0])
    await database.batch([removeImage, database.update(propertyImages).set({ isCover: true }).where(eq(propertyImages.id, photosLeft[0].id))])
  else
    await removeImage
```

Keep the R2 delete after these lines.

**Verify**: `pnpm typecheck` -> exit 0.

### Step 3: Add a regression test

In `tests/site.test.mjs`, add this test after the existing last test:

```js
test('deleting the cover photo makes the next photo the cover', options, async () => {
  const cookie = await login()
  const created = await (await request('/api/admin/properties', { method: 'POST', ...json(draft) }, cookie)).json()
  const adminPath = `/api/admin/properties/${created.id}`
  const bytes = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
  const first = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()
  const second = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()

  assert.equal((await request(`${adminPath}/images/${first.id}`, { method: 'DELETE' }, cookie)).status, 200)
  const detail = await (await request(adminPath, {}, cookie)).json()
  assert.deepEqual(detail.images.map(image => [image.id, image.isCover]), [[second.id, true]])

  assert.equal((await request(adminPath, { method: 'DELETE' }, cookie)).status, 200)
})
```

**Verify**: `pnpm test:worker 2>&1 | grep -E '^ℹ (pass|fail|skipped)'` -> one more passed test than before, `fail 0`, `skipped 0`.

## Test plan

The new API test covers cover promotion. The failure path of `batch` and the browser retry have no automated test, because the repository has no fault injection and no browser test runner. Steps 1 and 2 are verified by source order and types.

## Done criteria

- [ ] `pnpm lint` and `pnpm typecheck` exit 0
- [ ] `pnpm test:worker` exits 0 with the new test passing
- [ ] `git status --short` shows only in-scope files and the untracked `docs/research/screenshots/`
- [ ] `plans/README.md` status row updated

## STOP conditions

- `database.batch` rejects the mixed delete and update types and a simple change does not fix the type error.
- The new test fails because the cover is not promoted.

## Maintenance notes

If photo reordering is added later, the "next photo" rule must follow the new order.
