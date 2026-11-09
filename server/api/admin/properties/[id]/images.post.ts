import { createId } from '@paralleldrive/cuid2'
import { and, eq, max } from 'drizzle-orm'
import { propertyImages } from '../../../../database/schema'
import { ownerProperty } from '../../../../utils/admin-property'
import { useImagesBucket } from '../../../../utils/storage'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS = 20

function imageContentType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47)
    return 'image/png'
  return null
}

export default defineEventHandler(async (event) => {
  const { database, property } = await ownerProperty(event)
  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file')?.data
  const kind = form?.find(part => part.name === 'kind')?.data.toString()
  if (!file || (kind !== 'photo' && kind !== 'floor_plan'))
    throw createError({ statusCode: 400, statusMessage: '請選擇圖片。' })
  if (file.length > MAX_IMAGE_BYTES)
    throw createError({ statusCode: 400, statusMessage: '單張圖片最多 10 MB。' })
  const contentType = imageContentType(file)
  if (!contentType)
    throw createError({ statusCode: 400, statusMessage: '僅接受 JPEG 或 PNG 圖片。' })

  const existing = await database.select().from(propertyImages).where(and(eq(propertyImages.propertyId, property.id), eq(propertyImages.kind, kind)))
  if (kind === 'photo' && existing.length >= MAX_PHOTOS)
    throw createError({ statusCode: 400, statusMessage: `照片最多 ${MAX_PHOTOS} 張。` })
  const [last] = await database.select({ position: max(propertyImages.position) }).from(propertyImages).where(and(eq(propertyImages.propertyId, property.id), eq(propertyImages.kind, kind)))

  const bucket = useImagesBucket(event)
  const id = createId()
  await bucket.put(id, file, { httpMetadata: { contentType } })
  const insert = database.insert(propertyImages).values({
    id,
    propertyId: property.id,
    kind,
    position: (last?.position ?? -1) + 1,
    isCover: kind === 'photo' && existing.length === 0,
  })
  try {
    if (kind === 'floor_plan')
      await database.batch([database.delete(propertyImages).where(and(eq(propertyImages.propertyId, property.id), eq(propertyImages.kind, 'floor_plan'))), insert])
    else
      await insert
  }
  catch (error) {
    await bucket.delete(id)
    throw error
  }
  if (kind === 'floor_plan' && existing.length)
    await bucket.delete(existing.map(image => image.id))
  return { id }
})
