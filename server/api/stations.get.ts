import { asc } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { lines, stations } from '../database/schema'

export default defineEventHandler(async (event) => {
  const database = useDatabase(event)
  const lineRows = await database.select({ id: lines.id, nameZhTw: lines.nameZhTw }).from(lines).orderBy(asc(lines.nameJa))
  const stationRows = await database.select({ id: stations.id, lineId: stations.lineId, nameZhTw: stations.nameZhTw }).from(stations).orderBy(asc(stations.nameJa))
  return { lines: lineRows, stations: stationRows }
})
