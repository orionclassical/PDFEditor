import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import './Home.css'
import './UploadOverlay.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function EditPage({ file, onBack }: { file: File; onBack: () => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleUploadClick = () => {
    setShowUploadOverlay(true)
  }

  const handleCloseOverlay = () => {
    setShowUploadOverlay(false)
    setSelectedFile(null)
  }

  const handleFileSelect = (newFile: File) => {
    if (newFile.type === 'application/pdf') {
      setSelectedFile(newFile)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleDropzone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUploadSubmit = () => {
    if (selectedFile) {
      setShowUploadOverlay(false)
      setSelectedFile(null)
      // The file would be passed to parent or handled here
      // For now, just close the overlay
    }
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
              <button className="toolbar-button" onClick={handleUploadClick}>Upload New</button>
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
                  <div className="pdf-loading">
                    <div className="pdf-spinner"></div>
                  </div>
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

      {showUploadOverlay && (
        <div className="upload-overlay">
          <div className="upload-overlay-content">
            <div className="upload-overlay-header">
              <h2 className="upload-overlay-title">Upload New PDF</h2>
              <button className="upload-overlay-close" onClick={handleCloseOverlay}>
                ✕
              </button>
            </div>

            {!selectedFile ? (
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDropzone}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('drag-active')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-active')
                }}
              >
                <div className="upload-dropzone-icon">📄</div>
                <p className="upload-dropzone-text">Drop your PDF here</p>
                <p className="upload-dropzone-hint">or click to browse</p>
              </div>
            ) : (
              <div className="upload-file-display">
                <div className="upload-file-info">
                  <div className="upload-file-icon">✓</div>
                  <p className="upload-file-name">{selectedFile.name}</p>
                </div>
                <button
                  className="upload-file-remove"
                  onClick={() => setSelectedFile(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="upload-file-input"
              onChange={handleFileInputChange}
            />

            <div className="upload-button-group">
              <button className="upload-button-cancel" onClick={handleCloseOverlay}>
                Cancel
              </button>
              <button
                className="upload-button-submit"
                onClick={handleUploadSubmit}
                disabled={!selectedFile}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditPage
