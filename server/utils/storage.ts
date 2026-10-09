import type { H3Event } from 'h3'

export function useImagesBucket(event: H3Event): R2Bucket {
  const bucket = event.context.cloudflare?.env.LISTING_IMAGES
  if (!bucket)
    throw createError({ statusCode: 500, statusMessage: '圖片儲存服務不可用。' })
  return bucket
}
