import type { AdminImageRecovery } from '../../shared/admin-property'
import { createHash, timingSafeEqual } from 'node:crypto'
import { queueUploadCompensation, retryImageCleanup } from './property-media-cleanup'

export function createUploadRecoveryToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function imageIsLinked(database: D1Database, objectKey: string): Promise<boolean> {
  const result = await database.prepare('SELECT id FROM property_images WHERE object_key = ? LIMIT 1').bind(objectKey).all()
  return result.results.length > 0
}

type UploadCompensation
  = { cleanupStatus: 'queued', cleanupQueued: true, cleanupPending: boolean }
    | { cleanupStatus: 'removed' | 'linked', cleanupQueued: false, cleanupPending: false }
    | { cleanupStatus: 'recovery_required', cleanupQueued: false, cleanupPending: true, recovery: AdminImageRecovery }

export async function compensateFailedUpload({ database, bucket, agencyId, recovery }: {
  database: D1Database
  bucket: Pick<R2Bucket, 'delete'>
  agencyId: string
  recovery: AdminImageRecovery
}): Promise<UploadCompensation> {
  try {
    if (await imageIsLinked(database, recovery.objectKey))
      return { cleanupStatus: 'linked', cleanupQueued: false, cleanupPending: false }
  }
  catch {}
  let queued = false
  try {
    await queueUploadCompensation(database, agencyId, recovery.objectKey)
    queued = true
  }
  catch {}
  if (queued)
    return { cleanupStatus: 'queued', cleanupQueued: true, ...await retryImageCleanup({ database, bucket, agencyId }) }
  try {
    if (await imageIsLinked(database, recovery.objectKey))
      return { cleanupStatus: 'linked', cleanupQueued: false, cleanupPending: false }
    await bucket.delete(recovery.objectKey)
    return { cleanupStatus: 'removed', cleanupQueued: false, cleanupPending: false }
  }
  catch {
    return { cleanupStatus: 'recovery_required', cleanupQueued: false, cleanupPending: true, recovery }
  }
}

export async function recoverFailedUpload({ database, bucket, agencyId, recovery }: {
  database: D1Database
  bucket: Pick<R2Bucket, 'head' | 'delete'>
  agencyId: string
  recovery: AdminImageRecovery
}): Promise<void> {
  const object = await bucket.head(recovery.objectKey)
  const expected = object?.customMetadata?.uploadRecoveryToken
  if (!object || object.customMetadata?.agencyId !== agencyId || !expected
    || !timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(recovery.token).digest())) {
    throw createError({ statusCode: 404, statusMessage: '找不到可驗證的復原檔案，或復原資料無效。' })
  }
  if (await imageIsLinked(database, recovery.objectKey))
    throw createError({ statusCode: 409, statusMessage: '此檔案已連結至物件，不可透過上傳復原刪除。請重新載入物件。' })
  await bucket.delete(recovery.objectKey)
}
