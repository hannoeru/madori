import { createId } from '@paralleldrive/cuid2'
import { propertyColumns } from '../../../shared/admin-property'
import { useDatabase } from '../../database/client'
import { properties, propertyTransitEntries } from '../../database/schema'
import { parsePropertyInput, validatePublication } from '../../utils/admin-property'

export default defineEventHandler(async (event) => {
  const { user } = await requireAgencySession(event)
  const input = await parsePropertyInput(event)
  if (input.status === 'withdrawn')
    throw createError({ statusCode: 400, statusMessage: '新增物件請先儲存為草稿。' })
  await validatePublication(event, input)
  const database = useDatabase(event)
  const propertyId = createId()
  const insert = database.insert(properties).values({ id: propertyId, propertyNumber: createId(), agencyId: user.id, ...propertyColumns(input) })
  if (input.transitEntries.length) {
    await database.batch([insert, database.insert(propertyTransitEntries).values(input.transitEntries.map(entry => ({ propertyId, ...entry })))])
  }
  else {
    await insert
  }
  return { id: propertyId }
})
