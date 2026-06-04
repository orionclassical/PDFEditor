import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import { getScaleForPageCount } from './pdfutils'

export function usePdfRenderer(file: File) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({})
  const [loadingPage, setLoadingPage] = useState(false)
  const pdfDocRef = useRef<any | null>(null)

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    setLoadingPage(true)
    setPageImage(null)
    setPageCount(0)
    pdfDocRef.current?.destroy?.()
    pdfDocRef.current = null

    file.arrayBuffer()
      .then((data) => {
        if (cancelled) return Promise.reject(new Error('PDF load aborted'))
        return pdfjsLib.getDocument({ data }).promise
      })
      .then((doc: any) => {
        if (cancelled) return
        pdfDocRef.current = doc
        setPageCount(doc.numPages)
        setCurrentPage(1)
        setLoadingPage(false)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('PDF load failed:', error)
          setPageCount(0)
          setLoadingPage(false)
        }
      })

    return () => {
      cancelled = true
      pdfDocRef.current?.destroy?.()
      pdfDocRef.current = null
    }
  }, [file])

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current || !pageCount) return

    let cancelled = false
    setLoadingPage(true)
    setPageImage(null)

    let renderedCanvas: HTMLCanvasElement | null = null

    pdfDocRef.current
      .getPage(currentPage)
      .then((page: any) => {
        if (cancelled) return
        const scale = getScaleForPageCount(pageCount)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        renderedCanvas = canvas
        if (!context) throw new Error('Unable to get canvas rendering context')
        setPageSizes((prev) => ({
          ...prev,
          [currentPage]: { width: viewport.width, height: viewport.height },
        }))
        return page.render({ canvasContext: context, viewport }).promise
      })
      .then(() => {
        if (cancelled) return
        if (!renderedCanvas) throw new Error('Rendered canvas is missing')
        setPageImage(renderedCanvas.toDataURL('image/png'))
      })
      .catch((error: unknown) => {
        console.error('PDF page render failed:', error)
      })
      .finally(() => {
        if (!cancelled) setLoadingPage(false)
      })

    return () => { cancelled = true }
  }, [pageCount, currentPage])

  const gotoPrevious = () => setCurrentPage((p) => Math.max(1, p - 1))
  const gotoNext = () => setCurrentPage((p) => Math.min(pageCount, p + 1))

  const getCurrentPageDisplayScale = (documentSheetRef: React.RefObject<HTMLDivElement | null>): number => {
    const pageSize = pageSizes[currentPage]
    const sheet = documentSheetRef.current
    if (!pageSize || !sheet) return 1
    const rect = sheet.getBoundingClientRect()
    return rect.width > 0 ? rect.width / pageSize.width : 1
  }

  return {
    currentPage,
    pageCount,
    pageImage,
    loadingPage,
    pdfDocRef,
    gotoPrevious,
    gotoNext,
    getCurrentPageDisplayScale,
  }
}