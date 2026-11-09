import { isError } from 'h3'
import * as v from 'valibot'
import { adminImageRecoverySchema } from '../../../shared/admin-property'
import { recoverFailedUpload } from '../../utils/property-upload-recovery'
import { useImagesBucket } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { user } = await requireAgencySession(event)
  const parsed = v.safeParse(adminImageRecoverySchema, await readBody<unknown>(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '復原資料無效。' })
  const database = event.context.cloudflare?.env.DB
  if (!database)
    throw createError({ statusCode: 503, statusMessage: '資料庫不可用，尚未確認檔案已清除。請保留復原資料後重試。' })
  try {
    await recoverFailedUpload({ database, bucket: useImagesBucket(event), agencyId: user.id, recovery: parsed.output })
  }
  catch (error) {
    const statusCode = isError(error) ? error.statusCode : 503
    const statusMessage = isError(error) ? error.statusMessage : '無法確認檔案清除完成。請保留復原資料後重試。'
    setResponseStatus(event, statusCode)
    return { statusCode, statusMessage }
  }
  return { ok: true }
})
