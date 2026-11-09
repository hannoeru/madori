import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { adminImagesInputSchema } from '../../../../../shared/admin-property'
import { propertyImages } from '../../../../database/schema'
import { ownedProperty } from '../../../../utils/admin-property'
import { saveImageSettings } from '../../../../utils/property-image-settings'

export default defineEventHandler(async (event) => {
  const { database, property } = await ownedProperty(event)
  const parsed = v.safeParse(adminImagesInputSchema, await readBody<unknown>(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '圖片資料無效。' })
  const input = parsed.output
  const existing = await database.select().from(propertyImages).where(eq(propertyImages.propertyId, property.id))
  const photos = existing.filter(image => image.kind === 'photo')
  if (input.photos.length !== photos.length || input.photos.some(photo => !photos.some(image => image.id === photo.id)))
    throw createError({ statusCode: 400, statusMessage: '排序須包含此物件的所有照片，且不得含其他物件的圖片。' })
  if ((photos.length && !input.coverImageId) || (input.coverImageId && !photos.some(photo => photo.id === input.coverImageId)))
    throw createError({ statusCode: 400, statusMessage: '請從此物件的照片選擇一張封面。' })
  const floorPlan = existing.find(image => image.kind === 'floor_plan')
  if (input.floorPlanAltZhTw && !input.floorPlanId)
    throw createError({ statusCode: 400, statusMessage: '請提供要更新的格局圖識別碼。' })
  if (input.floorPlanAltZhTw && floorPlan?.id !== input.floorPlanId)
    throw createError({ statusCode: 409, statusMessage: '格局圖已變更，請重新載入後再修改說明。' })
  const db = event.context.cloudflare?.env.DB
  if (!db)
    throw createError({ statusCode: 500, statusMessage: '資料庫不可用。' })
  try {
    await saveImageSettings({ database: db, propertyId: property.id, input })
  }
  catch {
    throw createError({ statusCode: 409, statusMessage: '圖片已變更，請重新載入後再修改。' })
  }
  return { ok: true, cleanupPending: false }
})
