import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist'

export function usePdfRenderer(file: File) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({})
  const [loadingPage, setLoadingPage] = useState(false)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    // Loading state must start synchronously with a file change to keep the preview covered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPage(true)
    setPageImage(null)
    setPageCount(0)
    void loadingTaskRef.current?.destroy()
    loadingTaskRef.current = null
    pdfDocRef.current = null

    file.arrayBuffer()
      .then((data) => {
        if (cancelled) return Promise.reject(new Error('PDF load aborted'))
        const loadingTask = pdfjsLib.getDocument({ data })
        loadingTaskRef.current = loadingTask
        return loadingTask.promise
      })
      .then((doc) => {
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
      void loadingTaskRef.current?.destroy()
      loadingTaskRef.current = null
      pdfDocRef.current = null
    }
  }, [file])

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current || !pageCount) return

    let cancelled = false
    let renderTask: RenderTask | null = null
    setLoadingPage(true)
    setPageImage(null)

    let renderedCanvas: HTMLCanvasElement | null = null

    pdfDocRef.current
      .getPage(currentPage)
      .then((page: PDFPageProxy) => {
        if (cancelled) return
        const pageViewport = page.getViewport({ scale: 1 })
        const previewWidth = Math.min(780, window.innerWidth * 0.8)
        const scale = Math.max(1, (previewWidth / pageViewport.width) * (window.devicePixelRatio || 1))
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        renderedCanvas = canvas
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Unable to get canvas rendering context')
        setPageSizes((prev) => ({
          ...prev,
          [currentPage]: { width: pageViewport.width, height: pageViewport.height },
        }))
        const task = page.render({ canvas, canvasContext: context, viewport })
        renderTask = task
        return task.promise
      })
      .then(() => {
        if (cancelled) return
        if (!renderedCanvas) throw new Error('Rendered canvas is missing')
        setPageImage(renderedCanvas.toDataURL('image/png'))
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error('PDF page render failed:', error)
      })
      .finally(() => {
        if (!cancelled) setLoadingPage(false)
      })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pageCount, currentPage])

  const gotoPrevious = () => setCurrentPage((p) => Math.max(1, p - 1))
  const gotoNext = () => setCurrentPage((p) => Math.min(pageCount, p + 1))

  const getCurrentPageDisplayScale = useCallback((
    pageRef: React.RefObject<HTMLElement | null>
  ): number => {
    const pageSize = pageSizes[currentPage]
    const page = pageRef.current
    if (!pageSize || !page) return 1
    const rect = page.getBoundingClientRect()
    return rect.width > 0 ? rect.width / pageSize.width : 1
  }, [currentPage, pageSizes])

  return {
    currentPage,
    pageCount,
    pageImage,
    pageSizes,
    loadingPage,
    pdfDocRef,
    gotoPrevious,
    gotoNext,
    getCurrentPageDisplayScale,
  }
}