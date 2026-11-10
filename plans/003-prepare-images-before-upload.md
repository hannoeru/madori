# Plan 003: Shrink photos and remove their metadata before upload

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before the next step. If a STOP condition occurs, stop and report. Do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2d3bfef..HEAD -- app/components/AdminPropertyImages.vue app/utils/prepare-image.ts`
> Earlier plans in `plans/README.md` can change these files. If a file changed, compare the "Current state" excerpts with the live code. If the excerpted code is different, treat this as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/002-image-management-bugs.md (same component)
- **Category**: perf
- **Planned at**: commit `2d3bfef`, 2026-11-10

## Why this matters

Photos are stored and served exactly as uploaded. A Customer on a phone can download originals of up to 10 MB for each card. Phone photos can also contain GPS location, which becomes public. The site has no stored real photos yet, so this must land before the Owner uploads them: it does not change images that are already stored.

Cloudflare Workers do not have an image library here, so the browser does the work. Drawing an image on a canvas and exporting it creates a new file with no EXIF metadata.

## Current state

- `app/components/AdminPropertyImages.vue` uploads the original `file` (the loop inside `upload`):

```ts
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kind)
```

- The help text is at line 75 of that file: `JPEG 或 PNG，單張最多 10 MB，最多 20 張照片。圖片選好後會立即儲存。`
- `server/api/admin/properties/[id]/images.post.ts` accepts JPEG or PNG by magic bytes, up to 10 MB, and stores the bytes unchanged. It needs no change. Only the logged-in Owner can call it.
- `app/components/PropertyCard.vue` and `app/pages/properties/[id].vue` load `/api/property-images/<id>`. They need no change.
- `app/utils/` files are auto-imported by Nuxt. Example: `app/utils/request-error.ts`.
- Errors thrown inside `run(...)` show the fallback message `圖片操作失敗，請重試。`.

Repository conventions: Nuxt 4 with Cloudflare Workers, antfu ESLint style (no semicolons, single quotes), no code comments unless they explain a constraint. User-facing text is Traditional Chinese. Vocabulary from `CONTEXT.md`: **Owner** is the logged-in agent, **Customer** is a visitor, **Listing** is a home, **Draft** and **Published Listing** are its states, **Property photo** and **Floor plan** are its images.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Worker tests | `pnpm test:worker` | exit 0, 0 skipped |

## Suggested executor toolkit

Step 4 needs a real browser. Use the `agent-browser` tool if you have it.

## Scope

**In scope**: `app/utils/prepare-image.ts` (create), `app/components/AdminPropertyImages.vue`.

**Out of scope**: the server upload route, a thumbnail or second image size, any new dependency, and the `accept` attributes.

## Git workflow

- This repository commits directly on `main`, by the maintainer's instruction. Do not create a branch.
- Use one Conventional Commits message, for example `feat: shrink images and strip metadata before upload`.
- Do NOT push or deploy unless the operator tells you to.
- Do not stage `docs/research/screenshots/`. These files are untracked on purpose.
- Never print or commit the values of `.env` or `.dev.vars`.

## Steps

### Step 1: Create `app/utils/prepare-image.ts`

```ts
const MAX_EDGE = 1600

export async function prepareImage(file: File, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Canvas is unavailable')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/jpeg', quality)
  })
}
```

The white fill is necessary because JPEG has no transparency.

**Verify**: `pnpm typecheck` -> exit 0.

### Step 2: Upload the prepared image

In the `upload` loop, replace `body.append('file', file)` with:

```ts
      body.append('file', await prepareImage(file, kind === 'photo' ? 0.82 : 0.92), 'image.jpg')
```

The Floor plan uses higher quality because it has small text.

**Verify**: `grep -c "prepareImage(file" app/components/AdminPropertyImages.vue` -> `1`.

### Step 3: Update the help text

Replace the text at line 75 with: `JPEG 或 PNG，最多 20 張照片。上傳前會自動縮小並移除拍攝位置等資料。圖片選好後會立即儲存。`

**Verify**: `grep -c "10 MB" app/components/AdminPropertyImages.vue` -> `0`.

### Step 4: Check in a real browser

1. Run `NUXT_ADMIN_PASSWORD=<a random value> pnpm dev --port 3010`. Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3010/login` returns 200.
2. In the browser, log in at `/login`, create a Draft at `/admin/properties/new`, and stay on its edit page.
3. Run this in the page. It creates a 4000 x 3000 PNG and sends it through the real file input:

```js
const c = document.createElement('canvas'); c.width = 4000; c.height = 3000
c.getContext('2d').fillRect(0, 0, 4000, 3000)
const blob = await new Promise(r => c.toBlob(r, 'image/png'))
const t = new DataTransfer(); t.items.add(new File([blob], 'big.png', { type: 'image/png' }))
const input = document.querySelector('input[aria-label="新增照片"]')
input.files = t.files; input.dispatchEvent(new Event('change', { bubbles: true }))
```

4. Poll `/api/admin/properties/<id>` until `images` has one item. Then load `/api/property-images/<image id>`.

**Verify**: the response has `content-type: image/jpeg` although the input was PNG, which proves that the file was re-encoded. The loaded image has `naturalWidth` 1600 and `naturalHeight` 1200.

5. Delete the test Draft in the page, and stop the dev server.

## Test plan

`createImageBitmap` and canvas need a real browser, and the repository has no browser test runner. Do not add one in this plan. Step 4 is the check. `pnpm test:worker` confirms that the server flow still works.

## Done criteria

- [ ] `pnpm lint` and `pnpm typecheck` exit 0
- [ ] `pnpm test:worker` exits 0
- [ ] Step 4 gave `image/jpeg` and 1600 x 1200
- [ ] The test Draft is deleted
- [ ] `git status --short` shows only in-scope files and the untracked `docs/research/screenshots/`
- [ ] `plans/README.md` status row updated

## STOP conditions

- You have no way to run a real browser. Commit nothing, and set the status to BLOCKED with this reason.
- `createImageBitmap` rejects the `imageOrientation` option in the browser.
- The upload returns a 400 error for the prepared image.

## Maintenance notes

- A Customer's phone still downloads the 1600 px file for each card. If the Listing count grows, add a smaller card image. It was deferred because it needs a second stored object per photo.
- The server does not enforce this size. This is acceptable because only the Owner can upload.
