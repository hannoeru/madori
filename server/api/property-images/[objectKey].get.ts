import { getRouterParam } from 'h3'
import { useImagesBucket } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const objectKey = getRouterParam(event, 'objectKey')
  if (!objectKey)
    throw createError({ statusCode: 400, statusMessage: '缺少圖片識別碼。' })

  const bucket = useImagesBucket(event)
  const object = await bucket.get(objectKey)
  if (!object)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片。' })

  setResponseHeader(event, 'content-type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return object.body
})
