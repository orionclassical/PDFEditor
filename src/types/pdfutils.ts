import type { PageSize, TextElement } from './types'

export const getScaleForPageCount = (count: number): number => {
  if (count <= 4) return 1.2
  if (count <= 8) return 1.0
  if (count <= 16) return 0.8
  return 0.65
}

export const getPageSizeDimensions = (size: PageSize): [number, number] => {
  const sizes: Record<PageSize, [number, number]> = {
    a4:    [210, 297],
    '8x11': [203.2, 279.4],
    '8x13': [203.2, 330.2],
    '8x14': [203.2, 355.6],
  }
  return sizes[size]
}

export const renderTextOverlayOnCanvas = (
  context: CanvasRenderingContext2D,
  texts: TextElement[]
): void => {
  context.fillStyle = '#000000'
  context.textBaseline = 'top'
  texts.forEach((textItem) => {
    context.font = `${textItem.bold ? 'bold ' : ''}${textItem.fontSize}px Arial`
    const lines = textItem.text.split('\n')
    lines.forEach((line, index) => {
      context.fillText(line, textItem.x, textItem.y + index * textItem.fontSize * 1.2)
    })
  })
}