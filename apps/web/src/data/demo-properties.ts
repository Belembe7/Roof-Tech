export { demoProperties } from '@roof-tech/shared/demo-properties'
export type { DemoProperty, PropertyType } from '@roof-tech/shared/demo-properties'

export function formatMeticais(value: number) {
  return new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 }).format(value) + ' MT'
}
