import { useState } from 'react'
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js'
import type { PageSize, PageTextsMap } from './types'
import { getScaleForPageCount, getPageSizeDimensions, renderTextOverlayOnCanvas } from './pdfUtils'

export function usePdfExport(
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
      const pageScale = getScaleForPageCount(pageCount)
      const [pdfWidth, pdfHeight] = getPageSizeDimensions(selectedPageSize)
      let pdf: any | null = null

      for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
        const page = await pdfDocRef.current.getPage(pageNum)
        const viewport = page.getViewport({ scale: pageScale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Unable to get canvas context for PDF export')

        await page.render({ canvasContext: context, viewport }).promise

        const texts = pageTexts[pageNum] || []
        renderTextOverlayOnCanvas(context, texts)

        const imageData = canvas.toDataURL('image/png')
        if (!pdf) {
          pdf = new jsPDF({ unit: 'mm', format: [pdfWidth, pdfHeight] })
        } else {
          pdf.addPage([pdfWidth, pdfHeight])
        }
        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      if (pdf) pdf.save('edited.pdf')
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Unable to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return { exporting, handleDone }
}