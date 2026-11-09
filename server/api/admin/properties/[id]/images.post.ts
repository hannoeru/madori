import { createId } from '@paralleldrive/cuid2'
import { isError } from 'h3'
import { ownedProperty } from '../../../../utils/admin-property'
import { readImageUpload } from '../../../../utils/property-image'
import { cleanupForAgency, queueFloorPlanDeletion } from '../../../../utils/property-media-cleanup'
import { compensateFailedUpload, createUploadRecoveryToken } from '../../../../utils/property-upload-recovery'
import { useImagesBucket } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { property, user } = await ownedProperty(event)
  const upload = await readImageUpload(event)
  const bucket = useImagesBucket(event)
  const imageId = createId()
  const recovery = { objectKey: imageId, token: createUploadRecoveryToken() }
  const db = event.context.cloudflare?.env.DB
  if (!db)
    throw createError({ statusCode: 500, statusMessage: '資料庫不可用。' })
  try {
    await bucket.put(imageId, upload.bytes, {
      httpMetadata: { contentType: upload.contentType },
      customMetadata: { agencyId: user.id, uploadRecoveryToken: recovery.token },
    })
    const insert = db.prepare(`INSERT INTO property_images (id, property_id, object_key, kind, position, is_cover, alt_zh_tw, created_at)
      SELECT ?, id, ?, ?, (SELECT coalesce(max(position), -1) + 1 FROM property_images WHERE property_id = ? AND kind = ?), 0, ?, ?
      FROM properties WHERE id = ? AND agency_id = ?
      AND (? = 'floor_plan' OR (SELECT count(*) FROM property_images WHERE property_id = ? AND kind = 'photo') < 20)`)
      .bind(imageId, imageId, upload.kind, property.id, upload.kind, upload.alt, new Date().toISOString(), property.id, user.id, upload.kind, property.id)
    const cover = db.prepare(`UPDATE property_images SET is_cover = CASE WHEN id = ? THEN 1 ELSE 0 END
      WHERE property_id = ? AND kind = 'photo' AND EXISTS (SELECT 1 FROM property_images WHERE id = ?)
      AND (? = 'true' OR NOT EXISTS (SELECT 1 FROM property_images WHERE property_id = ? AND is_cover = 1))`)
      .bind(imageId, property.id, imageId, upload.isCover, property.id)
    const results = upload.kind === 'floor_plan'
      ? await db.batch([queueFloorPlanDeletion(db, property.id, user.id), db.prepare('DELETE FROM property_images WHERE property_id = ? AND kind = \'floor_plan\'').bind(property.id), insert])
      : await db.batch([insert, cover])
    const inserted = upload.kind === 'floor_plan' ? results[2] : results[0]
    if (!inserted?.meta.changes)
      throw createError({ statusCode: 409, statusMessage: '照片最多20張，或物件已移除。請重新載入。' })
  }
  catch (error) {
    const cleanup = await compensateFailedUpload({ database: db, bucket, agencyId: user.id, recovery })
    const message = isError(error) ? error.statusMessage : '無法確認圖片儲存結果。請重新載入物件。'
    const statusMessage = cleanup.cleanupStatus === 'linked'
      ? '圖片已連結至物件，未刪除檔案。請重新載入確認儲存結果。'
      : cleanup.cleanupStatus === 'recovery_required'
        ? `${message} 暫存檔案未確認已排入清除佇列，且尚未確認已清除。請下載並保留復原資料，再重試此檔案清除；一般佇列重試無法保證處理此檔案。`
        : cleanup.cleanupPending
          ? `${message} 暫存檔案仍待清除，請至所有物件清單重試圖片清除。`
          : `${message} 暫存檔案清除已完成。`
    const statusCode = isError(error) ? error.statusCode : 500
    setResponseStatus(event, statusCode)
    return { statusCode, statusMessage, data: cleanup }
  }
  return { id: imageId, kind: upload.kind, ...await cleanupForAgency(event, user.id) }
})
