import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import './Home.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function EditPage({ file, onBack }: { file: File; onBack: () => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)
  const pdfDocRef = useRef<any | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingPage(true)
    setPageImage(null)
    setPageCount(0)
    pdfDocRef.current?.destroy?.()
    pdfDocRef.current = null

    file.arrayBuffer()
      .then((data) => {
        if (cancelled) {
          return Promise.reject(new Error('PDF load aborted'))
        }
        return pdfjsLib.getDocument({ data }).promise
      })
      .then((doc: any) => {
        if (cancelled) return
        pdfDocRef.current = doc
        setPageCount(doc.numPages)
        setCurrentPage(1)
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

  useEffect(() => {
    if (!pdfDocRef.current || !pageCount) {
      return
    }

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

        if (!context) {
          throw new Error('Unable to get canvas rendering context')
        }

        return page.render({ canvasContext: context, viewport }).promise
      })
      .then(() => {
        if (cancelled) return
        if (!renderedCanvas) {
          throw new Error('Rendered canvas is missing')
        }

        setPageImage(renderedCanvas.toDataURL('image/png'))
      })
      .catch((error: unknown) => {
        console.error('PDF page render failed:', error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPage(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pageCount, currentPage])

  const gotoPrevious = () => {
    setCurrentPage((page) => Math.max(1, page - 1))
  }

  const gotoNext = () => {
    setCurrentPage((page) => Math.min(pageCount, page + 1))
  }

  const getScaleForPageCount = (count: number) => {
    if (count <= 4) return 1.2
    if (count <= 8) return 1.0
    if (count <= 16) return 0.8
    return 0.65
  }

  return (
    <div className="editor-page">
      <div className="editor-shell">
        <div className="editor-header-card">
          <header className="editor-toolbar">
            <div className="toolbar-left">
                <button className="back-home" type="button" onClick={onBack}>
                Back to home
                </button>
                <div className="editor-meta">
                    <div>
                        <p className="meta-label">Loaded file</p>
                        <p className="meta-value">{file.name}</p>
                    </div>
                    <div>
                        <p className="meta-label">Pages</p>
                        <p className="meta-value">{pageCount || '-'} </p>
                    </div>
                </div>
            </div>

            <div className="toolbar-actions">
              <button className="toolbar-button">Upload New</button>
              <button className="toolbar-button">Convert</button>
              <button className="toolbar-button editor-done">DONE</button>
            </div>
          </header>
        </div>

        <div className="editor-main">
          <aside className="editor-sidebar">
            <button className="sidebar-button active">Selection</button>
            <button className="sidebar-button">Sign</button>
            <button className="sidebar-button">Text</button>
            <button className="sidebar-button">Erase</button>
            <button className="sidebar-button">Highlight</button>
          </aside>

          <section className="document-panel">
            <div className="document-header">
                <div className="document-controls">
                    <button className="page-button" type="button" onClick={gotoPrevious} disabled={currentPage === 1}>
                    Previous</button>
                    <button className="page-button" type="button" onClick={gotoNext} disabled={currentPage === pageCount}>
                    Next</button>
                </div>
              <div className="document-pages">Page {currentPage} of {pageCount}</div>
            </div>
            <div className="document-preview">
              <div className="document-sheet">
                {loadingPage ? (
                  <div className="pdf-loading">Rendering PDF page...</div>
                ) : pageImage ? (
                  <img src={pageImage} alt={`Page ${currentPage}`} className="pdf-image" />
                ) : (
                  <div className="pdf-placeholder">PDF preview unavailable</div>
                )}
                <div className="doc-page-label">Page {currentPage}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default EditPage
