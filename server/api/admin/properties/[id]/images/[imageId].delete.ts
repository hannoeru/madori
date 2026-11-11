import { and, asc, eq } from 'drizzle-orm'
import { propertyImages } from '../../../../../database/schema'
import { ownerProperty } from '../../../../../utils/admin-property'
import { useImagesBucket } from '../../../../../utils/storage'

export default defineEventHandler(async (event) => {
  const { database, property } = await ownerProperty(event)
  const imageId = getRouterParam(event, 'imageId') ?? ''
  const images = await database.select().from(propertyImages).where(eq(propertyImages.propertyId, property.id)).orderBy(asc(propertyImages.position))
  const image = images.find(item => item.id === imageId)
  if (!image)
    throw createError({ statusCode: 404, statusMessage: '找不到此圖片。' })

  const photosLeft = images.filter(item => item.kind === 'photo' && item.id !== imageId)
  if (image.kind === 'photo' && property.status === 'published' && !photosLeft.length)
    throw createError({ statusCode: 409, statusMessage: '已發布物件至少要有一張照片。請先改為草稿。' })

  const removeImage = database.delete(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, property.id)))
  if (image.isCover && photosLeft[0])
    await database.batch([removeImage, database.update(propertyImages).set({ isCover: true }).where(eq(propertyImages.id, photosLeft[0].id))])
  else
    await removeImage
  await useImagesBucket(event).delete(imageId)
  return { ok: true }
})
