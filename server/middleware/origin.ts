export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(event.method))
    return

  const origin = getHeader(event, 'origin')
  const expected = import.meta.dev ? getRequestURL(event).origin : new URL(useRuntimeConfig(event).appUrl).origin
  if (origin && origin !== expected)
    throw createError({ statusCode: 403, statusMessage: '不允許此來源的請求。' })
})
