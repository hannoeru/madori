import { createId } from '@paralleldrive/cuid2'
import { and, desc, eq } from 'drizzle-orm'
import { getRouterParam, readMultipartFormData } from 'h3'
import { useDatabase } from '../../../../database/client'
import { properties, propertyImages } from '../../../../database/schema'
import { useImagesBucket } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })

  const database = useDatabase(event)
  const [property] = await database.select({ id: properties.id }).from(properties).where(and(eq(properties.id, id), eq(properties.agencyId, user.id))).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const parts = await readMultipartFormData(event)
  if (!parts)
    throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片。' })

  const file = parts.find(part => part.name === 'file')
  const rawKind = parts.find(part => part.name === 'kind')?.data.toString() ?? 'photo'
  const alt = parts.find(part => part.name === 'alt')?.data.toString().trim() ?? ''
  const isCover = parts.find(part => part.name === 'isCover')?.data.toString() === 'true'

  if (!file || !file.filename)
    throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片。' })
  if (rawKind !== 'floor_plan' && rawKind !== 'photo')
    throw createError({ statusCode: 400, statusMessage: '圖片類型無效。' })
  if (file.data.byteLength === 0)
    throw createError({ statusCode: 400, statusMessage: '上傳的圖片為空。' })

  const kind = rawKind
  const bucket = useImagesBucket(event)
  const imageId = createId()

  const [last] = await database
    .select({ position: propertyImages.position })
    .from(propertyImages)
    .where(and(eq(propertyImages.propertyId, id), eq(propertyImages.kind, kind)))
    .orderBy(desc(propertyImages.position))
    .limit(1)
  const position = (last?.position ?? 0) + 1

  await bucket.put(imageId, new Uint8Array(file.data), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

  if (isCover)
    await database.update(propertyImages).set({ isCover: false }).where(eq(propertyImages.propertyId, id))

  await database.insert(propertyImages).values({
    id: imageId,
    propertyId: id,
    objectKey: imageId,
    kind,
    position,
    isCover,
    altZhTw: alt || '圖片',
    createdAt: new Date().toISOString(),
  })

  return { id: imageId, isCover }
})
