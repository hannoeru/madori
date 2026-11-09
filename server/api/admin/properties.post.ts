import { propertyColumns } from '../../../shared/property'
import { useDatabase } from '../../database/client'
import { properties } from '../../database/schema'
import { assertPublishable, parsePropertyInput } from '../../utils/admin-property'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const input = await parsePropertyInput(event)
  await assertPublishable(event, input)
  const [created] = await useDatabase(event).insert(properties).values(propertyColumns(input)).returning({ id: properties.id })
  return created
})
