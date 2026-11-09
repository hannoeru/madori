import type { PropertyFacts } from '#shared/property'

export function formatManPrice(yen: number): string {
  return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 4 }).format(yen / 10000)}萬日圓`
}

export function formatYen(yen: number): string {
  return `${new Intl.NumberFormat('zh-TW').format(yen)}日圓`
}

export function formatArea(sqm: number): string {
  return `${sqm} m²（約 ${(sqm * 0.3025).toFixed(1)} 坪）`
}

export function formatPropertyArea(property: Pick<PropertyFacts, 'propertyType' | 'floorAreaSqm' | 'landAreaSqm' | 'buildingAreaSqm'>): string {
  if (property.propertyType === 'condominium')
    return property.floorAreaSqm == null ? '面積未提供' : formatArea(property.floorAreaSqm)
  if (property.landAreaSqm == null)
    return '面積未提供'
  const building = property.buildingAreaSqm == null ? '' : `，建物 ${formatArea(property.buildingAreaSqm)}`
  return `土地 ${formatArea(property.landAreaSqm)}${building}`
}

export function formatBuiltOn(builtOn: string): string {
  return `${builtOn.slice(0, 4)}年${Number(builtOn.slice(5, 7))}月`
}

export const propertyTypeLabels = { condominium: '公寓', detached_house: '獨棟住宅' }
