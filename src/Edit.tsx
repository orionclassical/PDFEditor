import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import './Home.css'
import './UploadOverlay.css'
import './TextMode.css'
import {ChevronLeft, ChevronRight, ArrowLeft, MousePointerClick, AArrowUp, AArrowDown, Undo, Redo, Trash, Type, Bold, Underline, Signature, PenTool, X, Plus} from "lucide-react"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function EditPage({ file, onBack }: { file: File; onBack: () => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({})
  const [loadingPage, setLoadingPage] = useState(false)
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isTextMode, setIsTextMode] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(true)
  const [pageTexts, setPageTexts] = useState<Record<number, Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>>>({})
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false)
  const [fontSizeInput, setFontSizeInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [exporting, setExporting] = useState(false)
  const [selectedPageSize, setSelectedPageSize] = useState<'a4' | '8x11' | '8x13' | '8x14'>('8x11')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [historyStack, setHistoryStack] = useState<Record<number, Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>>[]>([])
  const [redoStack, setRedoStack] = useState<Record<number, Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>>[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentSheetRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)
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
    setEditingId(null)

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

        setPageSizes((prev) => ({
          ...prev,
          [currentPage]: { width: viewport.width, height: viewport.height },
        }))
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

  useEffect(() => {
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }, [currentPage])

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

  const clonePageTexts = (texts: Record<number, Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>>) => {
    return JSON.parse(JSON.stringify(texts))
  }

  const savePageTexts = (nextTexts: Record<number, Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>>) => {
    setHistoryStack((prev) => [...prev, clonePageTexts(pageTexts)])
    setRedoStack([])
    setPageTexts(nextTexts)
  }

  const handleUploadSubmit = () => {
    if (selectedFile) {
      setShowUploadOverlay(false)
      setSelectedFile(null)
      // The file would be passed to parent or handled here
      // For now, just close the overlay
    }
  }

  const handleTextModeToggle = () => {
    if (!isTextMode) {
      setIsTextMode(true)
      setIsSelectionMode(false)
      setEditingId(null)
      setSelectedTextId(null)
      setEditingText('')
      setFontSizeDropdownOpen(false)
    }
  }

  const handleSelectionModeToggle = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true)
      setIsTextMode(false)
      setEditingId(null)
      setSelectedTextId(null)
      setEditingText('')
      setFontSizeDropdownOpen(false)
    }
  }

  const renderTextOverlayOnCanvas = (
    context: CanvasRenderingContext2D,
    texts: Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>
  ) => {
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

  const getCurrentPageDisplayScale = () => {
    const pageSize = pageSizes[currentPage]
    const sheet = documentSheetRef.current
    if (!pageSize || !sheet) return 1
    const rect = sheet.getBoundingClientRect()
    return rect.width > 0 ? rect.width / pageSize.width : 1
  }

  const getPageSizeDimensions = (size: 'a4' | '8x11' | '8x13' | '8x14'): [number, number] => {
    const sizes: Record<'a4' | '8x11' | '8x13' | '8x14', [number, number]> = {
      a4: [210, 297], // mm
      '8x11': [203.2, 279.4], // 8x11 inches in mm
      '8x13': [203.2, 330.2], // 8x13 inches in mm
      '8x14': [203.2, 355.6], // 8x14 inches in mm
    }
    return sizes[size]
  }

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

        if (!context) {
          throw new Error('Unable to get canvas context for PDF export')
        }

        await page.render({ canvasContext: context, viewport }).promise
        
        // Render text at canvas pixel coordinates (no scaling)
        // jsPDF will scale everything proportionally when adding to page
        const texts = pageTexts[pageNum] || []
        renderTextOverlayOnCanvas(context, texts)

        const imageData = canvas.toDataURL('image/png')
        if (!pdf) {
          pdf = new jsPDF({ unit: 'mm', format: [pdfWidth, pdfHeight] })
        } else {
          pdf.addPage([pdfWidth, pdfHeight])
        }

        // Add full canvas as image at page dimensions - everything scales proportionally
        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      if (pdf) {
        pdf.save('edited.pdf')
      }
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Unable to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const getCurrentPageTexts = () => {
    return pageTexts[currentPage] || []
  }

  const setCurrentPageTexts = (texts: Array<{ id: string; x: number; y: number; text: string; fontSize: number; bold: boolean }>) => {
    savePageTexts({
      ...pageTexts,
      [currentPage]: texts,
    })
  }

  const selectedText = getCurrentPageTexts().find((el) => el.id === selectedTextId)

  const handleSelectText = (id: string) => {
    setSelectedTextId(id)
    setEditingId(id)
    const currentTexts = getCurrentPageTexts()
    const selected = currentTexts.find((el) => el.id === id)
    setEditingText(selected?.text ?? '')
    setFontSizeInput(selected?.fontSize.toString() ?? '')
  }

  const handleDeleteSelectedText = () => {
    if (!selectedTextId) return
    const currentTexts = getCurrentPageTexts()
    setCurrentPageTexts(currentTexts.filter((el) => el.id !== selectedTextId))
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  const handleFontSizeChange = (delta: number) => {
    if (!selectedTextId) return
    const currentTexts = getCurrentPageTexts()
    setCurrentPageTexts(
      currentTexts.map((el) =>
        el.id === selectedTextId
          ? { ...el, fontSize: Math.max(10, Math.min(72, el.fontSize + delta)) }
          : el
      )
    )
  }

  const handleFontSizeSelect = (size: number) => {
    if (!selectedTextId) return
    const currentTexts = getCurrentPageTexts()
    setCurrentPageTexts(
      currentTexts.map((el) =>
        el.id === selectedTextId ? { ...el, fontSize: size } : el
      )
    )
    setFontSizeInput(size.toString())
    setFontSizeDropdownOpen(false)
  }

  const toggleFontSizeDropdown = () => {
    if (!selectedTextId) return
    const selected = getCurrentPageTexts().find((el) => el.id === selectedTextId)
    if (selected) {
      setFontSizeInput(selected.fontSize.toString())
    }
    setFontSizeDropdownOpen((open) => !open)
  }

  const handleFontSizeInputChange = (value: string) => {
    if (!selectedTextId) return
    const sanitized = value.replace(/[^0-9]/g, '')
    setFontSizeInput(sanitized)
  }

  const handleFontSizeInputCommit = () => {
    if (!selectedTextId || !fontSizeInput) return
    const size = Math.max(10, Math.min(120, Number(fontSizeInput)))
    handleFontSizeSelect(size)
  }

  const handleFontSizeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFontSizeInputCommit()
    }
  }

  const handleToggleBold = () => {
    if (!selectedTextId) return
    const currentTexts = getCurrentPageTexts()
    setCurrentPageTexts(
      currentTexts.map((el) =>
        el.id === selectedTextId ? { ...el, bold: !el.bold } : el
      )
    )
  }

  const handleUndo = () => {
    if (historyStack.length === 0) return
    const previous = historyStack[historyStack.length - 1]
    setHistoryStack((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, clonePageTexts(pageTexts)])
    setPageTexts(previous)
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setHistoryStack((prev) => [...prev, clonePageTexts(pageTexts)])
    setPageTexts(next)
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTextMode || !documentSheetRef.current) return

    const rect = documentSheetRef.current.getBoundingClientRect()
    const displayScale = getCurrentPageDisplayScale()
    const x = (e.clientX - rect.left) / displayScale
    const y = (e.clientY - rect.top) / displayScale

    const currentTexts = getCurrentPageTexts()

    // Check if clicking on existing text
    const clicked = currentTexts.find((el) => {
      return x >= el.x && x <= el.x + 200 && y >= el.y && y <= el.y + 30
    })

    if (clicked) {
      handleSelectText(clicked.id)
      setTimeout(() => editInputRef.current?.focus(), 0)
    } else {
      const newId = Date.now().toString()
      const newText = { id: newId, x, y, text: '', fontSize: 14, bold: false }
      setCurrentPageTexts([...currentTexts, newText])
      handleSelectText(newId)
      setTimeout(() => editInputRef.current?.focus(), 0)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingText(e.currentTarget.value)
  }

  const handleTextBlur = () => {
    if (editingId) {
      const currentTexts = getCurrentPageTexts()
      setCurrentPageTexts(
        currentTexts.map((el) =>
          el.id === editingId ? { ...el, text: editingText } : el
        )
      )
    }
    setEditingId(null)
    setEditingText('')
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleTextBlur()
    }
  }

  const handleTextMouseDown = (e: React.MouseEvent<HTMLDivElement>, elementId: string) => {
    if (!isSelectionMode) return
    e.preventDefault()
    e.stopPropagation()

    const rect = documentSheetRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentTexts = getCurrentPageTexts()
    const element = currentTexts.find((el) => el.id === elementId)
    if (!element) return

    const displayScale = getCurrentPageDisplayScale()
    setSelectedTextId(elementId)
    setDraggingId(elementId)
    setDragOffset({
      x: e.clientX - rect.left - element.x * displayScale,
      y: e.clientY - rect.top - element.y * displayScale,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !documentSheetRef.current) return

    const rect = documentSheetRef.current.getBoundingClientRect()
    const displayScale = getCurrentPageDisplayScale()
    const x = (e.clientX - rect.left - dragOffset.x) / displayScale
    const y = (e.clientY - rect.top - dragOffset.y) / displayScale

    const currentTexts = getCurrentPageTexts()
    setCurrentPageTexts(
      currentTexts.map((el) =>
        el.id === draggingId ? { ...el, x: Math.max(0, x), y: Math.max(0, y) } : el
      )
    )
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  return (
    <div className="editor-page">
      <div className="editor-shell">
        <div className="editor-header-card">
          <header className="editor-toolbar">
            <div className="toolbar-left">
                <button className="back-home" type="button" onClick={onBack}>
                  <ArrowLeft/> Go back
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
              <select
                value={selectedPageSize}
                onChange={(e) => setSelectedPageSize(e.target.value as any)}
                className="toolbar-button page-size-select"
              >
                <option value="a4">A4 (8.27×11.69)</option>
                <option value="8x11">Short Bondpaper (8x11)"</option>
                <option value="8x13">Long Bondpaper (8x13)"</option>
                <option value="8x14">Long Bondpaper (8x14)"</option>
              </select>
              <button className="toolbar-button editor-done" onClick={handleDone} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Done'}
              </button>
            </div>
          </header>
        </div>

        <div className="editor-main">
          <div className="editor-sidebar">
            <aside className="editor-sidebar-main">
              <button className={`sidebar-button ${isSelectionMode ? 'active' : ''}`} onClick={handleSelectionModeToggle}><MousePointerClick/></button>
              <button className={`sidebar-button ${isTextMode ? 'active text-mode' : ''}`} onClick={handleTextModeToggle}><Type/></button>
              <button className="sidebar-button"><Signature/></button>
              <button className="sidebar-button"><PenTool/></button>
              <button className="sidebar-button"><X/></button>
              <button className="sidebar-button"><Plus/></button>
            </aside>
            <aside className="editor-sidebar-main">
                  <button className={`sidebar-button ${selectedText?.bold ? 'active' : ''}`}type="button"onClick={handleToggleBold}><Bold/></button>
                  <button className="sidebar-button"><Underline/></button>
                  <button className="sidebar-button" type="button" onClick={() => handleFontSizeChange(-2)}>
                    <AArrowDown className="font-size"/>
                  </button>
                  <button className="sidebar-button" type="button" onClick={() => handleFontSizeChange(2)}>
                    <AArrowUp className="font-size 24"/>
                  </button>
                  <button className="sidebar-button" type="button" onClick={handleDeleteSelectedText}>
                    <Trash/>
                  </button>
                  <button className="page-button" type="button" onClick={handleUndo} disabled={historyStack.length === 0}>
                    <Undo/>
                  </button>
                  <button className="page-button" type="button" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <Redo/>
                  </button>
              </aside>
          </div>

        <div className="editor-page-count">
          <aside className="editor-sidebar-page">
              <button className="page-button" type="button" onClick={gotoPrevious} disabled={currentPage === 1}>
                    <ChevronLeft/></button>
              <div className="document-pages">{currentPage} / {pageCount}</div>
              <button className="page-button" type="button" onClick={gotoNext} disabled={currentPage === pageCount}>
                    <ChevronRight/></button>
            </aside>
          </div>

          <section className="document-panel">
          
            <div className="document-preview">
              <div 
                className={`document-sheet ${isTextMode ? 'text-mode-enabled' : ''}`}
                ref={documentSheetRef}
                onClick={handleDocumentClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isTextMode ? 'text' : isSelectionMode && getCurrentPageTexts().length > 0 ? 'grab' : 'default' }}
              >
                {loadingPage ? (
                  <div className="pdf-loading">
                    <div className="pdf-spinner"></div>
                  </div>
                ) : pageImage ? (
                  <>
                    <img src={pageImage} alt={`Page ${currentPage}`} className="pdf-image" />
                    {(isTextMode || isSelectionMode) && getCurrentPageTexts().length > 0 && (
                      <div className="text-elements-container">
                        {getCurrentPageTexts().map((el) => (
                          <div
                            key={el.id}
                            className={`text-element ${editingId === el.id ? 'editing' : ''} ${selectedTextId === el.id ? 'selected' : ''}`}
                            style={{ 
                              left: `${el.x * getCurrentPageDisplayScale()}px`, 
                              top: `${el.y * getCurrentPageDisplayScale()}px`,
                              fontSize: `${el.fontSize * getCurrentPageDisplayScale()}px`,
                              fontWeight: el.bold ? 700 : 400,
                              cursor: isSelectionMode && editingId !== el.id ? 'grab' : 'text'
                            }}
                            onMouseDown={(e) => {
                              if (isSelectionMode && editingId !== el.id) {
                                handleTextMouseDown(e, el.id)
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectText(el.id)
                              setTimeout(() => editInputRef.current?.focus(), 0)
                            }}
                          >
                            {el.text || (isTextMode ? 'Click to edit' : '')}
                          </div>
                        ))}
                        {editingId && (
                          <textarea
                            ref={editInputRef}
                            className="text-input"
                            value={editingText}
                            onChange={handleTextChange}
                            onBlur={handleTextBlur}
                            onKeyDown={handleTextKeyDown}
                            style={{
                              left: `${getCurrentPageTexts().find((el) => el.id === editingId)?.x! * getCurrentPageDisplayScale()}px`,
                              top: `${getCurrentPageTexts().find((el) => el.id === editingId)?.y! * getCurrentPageDisplayScale()}px`,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </>
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
