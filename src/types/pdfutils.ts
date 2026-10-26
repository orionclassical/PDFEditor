import type { PageSize } from './types'

export const getPageSizeDimensions = (size: PageSize): [number, number] => {
  const sizes: Record<PageSize, [number, number]> = {
    original: [210, 297],
    a4:       [210, 297],
    '8x11':   [203.2, 279.4],
    '8x13':   [203.2, 330.2],
    '8x14':   [203.2, 355.6],
  }
  return sizes[size]
}