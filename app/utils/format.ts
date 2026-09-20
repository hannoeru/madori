export function formatManPrice(yen: number): string {
  const man = Math.round(yen / 10000)
  if (man < 1)
    return `${new Intl.NumberFormat('zh-TW').format(yen)}日圓`
  return `${new Intl.NumberFormat('zh-TW').format(man)}萬日圓`
}

export function formatYen(yen: number): string {
  return `${new Intl.NumberFormat('zh-TW').format(yen)}日圓`
}

export function formatArea(sqm: number): string {
  const tsubo = sqm * 0.3025
  return `${sqm} m²（約 ${tsubo.toFixed(1)} 坪）`
}

export function formatPropertyArea(propertyType: string, floorAreaSqm: number | null, landAreaSqm: number | null, buildingAreaSqm: number | null): string {
  if (propertyType === 'condominium')
    return floorAreaSqm == null ? '—' : formatArea(floorAreaSqm)
  if (landAreaSqm == null)
    return '—'
  const land = `土地 ${formatArea(landAreaSqm)}`
  const building = buildingAreaSqm == null ? '' : ` / 建物 ${buildingAreaSqm} m²`
  return land + building
}

export function formatStationName(nameZhTw: string, nameJa: string): string {
  return nameJa && nameJa !== nameZhTw ? `${nameZhTw}（${nameJa}）` : nameZhTw
}

export function formatBuiltOn(builtOn: string): string {
  return builtOn ? `${builtOn.slice(0, 4)}年築` : ''
}
