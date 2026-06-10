import type { PageSize, TextElement } from './types'

export const getScaleForPageCount = (count: number): number => {
  if (count <= 4) return 1.2
  if (count <= 8) return 1.0
  if (count <= 16) return 0.8
  return 0.65
}

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

export const renderTextOverlayOnCanvas = (
  context: CanvasRenderingContext2D,
  texts: TextElement[],
  // canvasWidth and displayWidth let us convert stored coords to canvas coords
  canvasWidth: number,
  displayWidth: number,
): void => {
  // Ratio between the export canvas pixel size and the display pixel size
  // stored x/y are already in canvas pixels (screen coords / displayScale)
  // so we just draw them directly — no extra conversion needed.
  // We keep the ratio param for future use but the coords are already correct.
  context.fillStyle = '#000000'
  // Use 'top' baseline to match CSS `line-height` from top of element
  context.textBaseline = 'top'

  texts.forEach((textItem) => {
    const weight = textItem.bold ? 'bold ' : ''
    context.font = `${weight}${textItem.fontSize}px Arial`
    const lines = textItem.text.split('\n')
    lines.forEach((line, index) => {
      context.fillText(line, textItem.x + 5, textItem.y + 4) // This is where the position of text when exported
    })

    // Draw underline manually since canvas has no text-decoration
    if (textItem.underline) {
      context.font = `${weight}${textItem.fontSize}px Arial`
      const lineY = textItem.y + textItem.fontSize * 1.05
      lines.forEach((line, index) => {
        const metrics = context.measureText(line)
        const y = lineY + index * textItem.fontSize * 1.2
        context.fillRect(textItem.x, y, metrics.width, Math.max(1, textItem.fontSize * 0.07))
      })
    }
  })
}