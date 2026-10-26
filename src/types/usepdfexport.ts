import { useState } from 'react'
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib'
import type { PageSize, PageTextsMap } from './types'
import { getPageSizeDimensions } from './pdfutils'

export function usePdfExport(
  file: File,
  pdfDocRef: React.MutableRefObject<any>,
  pageCount: number,
  pageTexts: PageTextsMap,
  selectedPageSize: PageSize
) {
  const [exporting, setExporting] = useState(false)

  const handleDone = async () => {
    if (!pdfDocRef.current || !pageCount) return

    setExporting(true)
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const pages = pdf.getPages()
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
      const measureCanvas = document.createElement('canvas')
      const measureContext = measureCanvas.getContext('2d')
      if (!measureContext) throw new Error('Unable to get text measurement context')

      for (let pageNum = 1; pageNum <= pages.length; pageNum += 1) {
        const outputPage = pages[pageNum - 1]
        const sourcePage = await pdfDocRef.current.getPage(pageNum)
        const viewport = sourcePage.getViewport({ scale: 1 })
        const rotation = ((sourcePage.rotate % 360) + 360) % 360
        const [pageWidthMm, pageHeightMm] = getPageSizeDimensions(selectedPageSize)
        let scaleX = 1
        let scaleY = 1

        if (selectedPageSize !== 'original') {
          const targetWidth = (pageWidthMm * 72) / 25.4
          const targetHeight = (pageHeightMm * 72) / 25.4
          scaleX = targetWidth / outputPage.getWidth()
          scaleY = targetHeight / outputPage.getHeight()
          outputPage.scaleContent(scaleX, scaleY)
          outputPage.setSize(targetWidth, targetHeight)
        }

        const fontScale = rotation === 90 || rotation === 270 ? scaleX : scaleY
        for (const textItem of pageTexts[pageNum] || []) {
          if (!textItem.text) continue

          const size = textItem.fontSize * fontScale
          const textFont = textItem.bold ? boldFont : font
          const lines = textItem.text.split('\n')
          const lineHeight = textItem.fontSize * 0.85
          measureContext.font = `${textItem.bold ? 'bold ' : ''}${textItem.fontSize}px Arial`
          const fontMetrics = measureContext.measureText('Mg')
          const baselineOffset = (lineHeight - textItem.fontSize) / 2 +
            (fontMetrics.fontBoundingBoxAscent || textItem.fontSize * 0.8)

          lines.forEach((line, index) => {
            const lineBaseline = textItem.y + index * lineHeight + baselineOffset
            const [x, baselineY] = viewport.convertToPdfPoint(textItem.x, lineBaseline)
            outputPage.drawText(line, {
              x: x * scaleX,
              y: baselineY * scaleY,
              size,
              font: textFont,
              rotate: degrees(-rotation),
            })

            if (textItem.underline && line) {
              const underlineY = baselineY - size * 0.12
              const lineWidth = textFont.widthOfTextAtSize(line, size)
              outputPage.drawLine({
                start: { x: x * scaleX, y: underlineY * scaleY },
                end: { x: (x + lineWidth) * scaleX, y: underlineY * scaleY },
                thickness: Math.max(0.5, size * 0.07),
              })
            }
          })
        }
      }

      const editedPdf = await pdf.save()
      const outputBuffer = new ArrayBuffer(editedPdf.byteLength)
      new Uint8Array(outputBuffer).set(editedPdf)
      const downloadUrl = URL.createObjectURL(new Blob([outputBuffer], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = downloadUrl
      const baseName = file.name.replace(/\.pdf$/i, '')
      link.download = `${baseName}-edited.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Unable to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return { exporting, handleDone }
}