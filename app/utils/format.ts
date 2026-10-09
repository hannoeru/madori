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

export interface PropertyAreas {
  propertyType: string
  floorAreaSqm: number | null
  landAreaSqm: number | null
  buildingAreaSqm: number | null
}

export function formatPropertyArea(property: PropertyAreas): string {
  if (property.propertyType === 'condominium')
    return property.floorAreaSqm == null ? '—' : formatArea(property.floorAreaSqm)
  if (property.landAreaSqm == null)
    return '—'
  const land = `土地 ${formatArea(property.landAreaSqm)}`
  const building = property.buildingAreaSqm == null ? '' : ` / 建物 ${property.buildingAreaSqm} m²`
  return land + building
}

export function formatStationName(nameZhTw: string, nameJa: string): string {
  return nameJa && nameJa !== nameZhTw ? `${nameZhTw}（${nameJa}）` : nameZhTw
}

export function formatBuiltOn(builtOn: string): string {
  return builtOn ? `${builtOn.slice(0, 4)}年築` : ''
}

export function coverImageId(images: Array<{ id: string, isCover: boolean }>): string | undefined {
  return (images.find(image => image.isCover) ?? images[0])?.id
}
