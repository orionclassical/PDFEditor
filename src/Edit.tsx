import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import {
  ChevronLeft, ChevronRight, ArrowLeft,
  MousePointerClick, AArrowUp, AArrowDown,
  Undo, Redo, Trash, Type, Bold, Underline,
  Signature, PenTool, X, Check,
} from 'lucide-react'

import type { PageSize } from './types/types'
import { usePdfRenderer } from './types/usepdfrenderer'
import { useTextElements } from './types/usetextelements'
import { usePdfExport } from './types/usepdfexport'
import { UploadOverlay } from './components/UploadOverlay'

import './assets/styles/Home.css'
import './assets/styles/EditPage.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function EditPage({ file, onBack }: { file: File; onBack: () => void }) {
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const [isTextMode, setIsTextMode] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(true)
  const [selectedPageSize, setSelectedPageSize] = useState<PageSize>('original')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [displayScale, setDisplayScale] = useState(1)

  const documentSheetRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const {
    currentPage, pageCount, pageImage, pageSizes, loadingPage,
    pdfDocRef, gotoPrevious, gotoNext, getCurrentPageDisplayScale,
  } = usePdfRenderer(file)

  const {
    pageTexts, selectedTextId, editingId, editingText,
    historyStack, redoStack,
    setEditingText, getCurrentPageTexts, setCurrentPageTexts,
    handleSelectText, handleEditText, handleDeselect,
    handleDeleteSelectedText, handleFontSizeChange,
    handleToggleBold, handleToggleUnderline, handleTextBlur,
    handleUndo, handleRedo, clearSelection,
  } = useTextElements()

  const { exporting, handleDone } = usePdfExport(
    pdfDocRef, pageCount, pageTexts, selectedPageSize
  )

  // Recompute displayScale when page image loads or container resizes
  useEffect(() => {
    const sheet = documentSheetRef.current
    if (!sheet) return
    const update = () => setDisplayScale(getCurrentPageDisplayScale(documentSheetRef))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(sheet)
    return () => ro.disconnect()
  }, [pageImage, pageSizes, currentPage])

  // Clear selection on page change
  useEffect(() => { clearSelection() }, [currentPage])

  // — Mode toggles —
  const handleTextModeToggle = () => {
    if (isTextMode) return
    setIsTextMode(true)
    setIsSelectionMode(false)
    clearSelection()
  }

  const handleSelectionModeToggle = () => {
    if (isSelectionMode) return
    setIsSelectionMode(true)
    setIsTextMode(false)
    clearSelection()
  }

  // — Document sheet click (background) — deselect
  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest(".text-element")) return
    if (target.closest(".text-input")) return
    if (target.closest(".text-elements-container")) return

    if (isTextMode) {
      // In text mode: clicking empty area creates a new text element
      if (!documentSheetRef.current) return
      const rect = documentSheetRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / displayScale
      const y = (e.clientY - rect.top) / displayScale
      const texts = getCurrentPageTexts(currentPage)
      const newId = Date.now().toString()
      setCurrentPageTexts(currentPage, [...texts, { id: newId, x, y, text: '', fontSize: 14, bold: false, underline: false }])
      handleEditText(newId, currentPage)
      setTimeout(() => editInputRef.current?.focus(), 0)
    } else {
      // In selection mode: clicking empty area deselects
      handleDeselect()
    }
  }

  const handleTextMouseDown = (e: React.MouseEvent<HTMLDivElement>, elementId: string) => {
    if (!isSelectionMode) return
    e.preventDefault()
    e.stopPropagation()
    const rect = documentSheetRef.current?.getBoundingClientRect()
    if (!rect) return
    const element = getCurrentPageTexts(currentPage).find((el) => el.id === elementId)
    if (!element) return
    setDraggingId(elementId)
    handleSelectText(elementId, currentPage)
    setDragOffset({
      x: e.clientX - rect.left - element.x * displayScale,
      y: e.clientY - rect.top - element.y * displayScale,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !documentSheetRef.current) return
    const rect = documentSheetRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - dragOffset.x) / displayScale
    const y = (e.clientY - rect.top - dragOffset.y) / displayScale
    setCurrentPageTexts(
      currentPage,
      getCurrentPageTexts(currentPage).map((el) =>
        el.id === draggingId ? { ...el, x: Math.max(0, x), y: Math.max(0, y) } : el
      )
    )
  }

  const currentTexts = getCurrentPageTexts(currentPage)
  const selectedText = currentTexts.find((el) => el.id === selectedTextId)

  return (
    <div className="editor-page">
      <div className="editor-shell">

        {/* ── HEADER ── */}
        <div className="editor-header-card">
          <header className="editor-toolbar">
            <div className="toolbar-left">
              <button className="back-home" type="button" onClick={onBack}>
                <ArrowLeft size={16} /> Go back
              </button>
              <div className="editor-meta">
                <div>
                  <p className="meta-label">Loaded file</p>
                  <p className="meta-value">{file.name}</p>
                </div>
                <div>
                  <p className="meta-label">Pages</p>
                  <p className="meta-value">{pageCount || '-'}</p>
                </div>
              </div>
            </div>

            <div className="toolbar-actions">
              <button className="toolbar-button" onClick={() => setShowUploadOverlay(true)}>
                Upload New
              </button>
              <button className="toolbar-button">Convert</button>
              <div className="page-size-selector">
                <select
                  value={selectedPageSize}
                  onChange={(e) => setSelectedPageSize(e.target.value as PageSize)}
                  className="page-size-select"
                >
                  <option value="original">Original Size</option>
                  <option value="a4">A4 (8.27×11.69)</option>
                  <option value="8x11">Letter (8x11)"</option>
                  <option value="8x13">Legal (8x13)"</option>
                  <option value="8x14">Tabloid (8x14)"</option>
                </select>
              </div>
              <button className="toolbar-button editor-done" onClick={handleDone} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Done'}
              </button>
            </div>
          </header>
        </div>

        {/* ── MAIN ── */}
        <div className="editor-main">

          {/* Page counter */}
          <div className="editor-page-count">
            <aside className="editor-sidebar-page">
              <button className="page-button" type="button" onClick={gotoPrevious} disabled={currentPage === 1}>
                <ChevronLeft size={18} />
              </button>
              <div className="document-pages">{currentPage} / {pageCount}</div>
              <button className="page-button" type="button" onClick={gotoNext} disabled={currentPage === pageCount}>
                <ChevronRight size={18} />
              </button>
            </aside>
          </div>

          {/* Document canvas */}
          <section className="document-panel">
            <div className="editor-sidebar">
              <aside className="editor-sidebar-main">
                <button className={`sidebar-button ${isSelectionMode ? 'active' : ''}`} onClick={handleSelectionModeToggle}>
                  <MousePointerClick size={18} />
                </button>
                <button className={`sidebar-button ${isTextMode ? 'active' : ''}`} onClick={handleTextModeToggle}>
                  <Type size={18} />
                </button>
                <button className="sidebar-button"><Signature size={18} /></button>
                <button className="sidebar-button"><PenTool size={18} /></button>
                <button className="sidebar-button"><X size={18} /></button>
                <button className="sidebar-button"><Check size={18} /></button>
              </aside>
            </div>

            <div className="document-preview">
              <div
                className={`document-sheet ${isTextMode ? 'text-mode-enabled' : ''}`}
                ref={documentSheetRef}
                onClick={handleSheetClick}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDraggingId(null)}
                onMouseLeave={() => setDraggingId(null)}
                style={{
                  cursor: isTextMode
                    ? 'text'
                    : isSelectionMode && currentTexts.length > 0
                    ? 'default'
                    : 'default',
                }}
              >
                {loadingPage ? (
                  <div className="pdf-loading">
                    <div className="pdf-spinner" />
                  </div>
                ) : pageImage ? (
                  <>
                    <img src={pageImage} alt={`Page ${currentPage}`} className="pdf-image" />
                    {currentTexts.length > 0 && (
                      <div className="text-elements-container">
                        {currentTexts.map((el) => (
                          <div
                            key={el.id}
                            className={`text-element${editingId === el.id ? ' editing' : ''}${selectedTextId === el.id ? ' selected' : ''}`}
                            style={{
                              position: 'absolute',
                              left: `${el.x * displayScale}px`,
                              top: `${el.y * displayScale}px`,
                              fontSize: `${el.fontSize * displayScale}px`,
                              fontWeight: el.bold ? 'bold' : 'normal',
                              textDecoration: el.underline ? 'underline' : 'none',
                              cursor: editingId === el.id ? 'text' : 'grab',
                            }}
                            onMouseDown={(e) => {
                              // Only drag if not currently being edited
                              if (isSelectionMode && editingId !== el.id) {
                                handleTextMouseDown(e, el.id)
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              // Single click = select only
                              handleSelectText(el.id, currentPage)
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              // Double click = enter edit mode
                              handleEditText(el.id, currentPage)
                              setTimeout(() => editInputRef.current?.focus(), 0)
                            }}
                          >
                            {el.text || (editingId === el.id ? '' : 'Click to Edit')}
                          </div>
                        ))}
                        {editingId && (
                          <textarea
                            ref={editInputRef}
                            className="text-input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.currentTarget.value)}
                            onBlur={() => handleTextBlur(currentPage)}
                            onKeyDown={(e) => { if (e.key === 'Escape') handleTextBlur(currentPage) }}
                            style={{
                              left: `${currentTexts.find((el) => el.id === editingId)?.x! * displayScale}px`,
                              top: `${currentTexts.find((el) => el.id === editingId)?.y! * displayScale}px`,
                              fontWeight: currentTexts.find((el) => el.id === editingId)?.bold ? 'bold' : 'normal',
                              textDecoration: currentTexts.find((el) => el.id === editingId)?.underline ? 'underline' : 'none',
                              fontSize: `${currentTexts.find((el) => el.id === editingId)?.fontSize! * displayScale}px`,
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

            <div className="editor-sidebar">
              <aside className="editor-sidebar-main">
                <button
                  className={`sidebar-button ${selectedText?.bold ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleToggleBold(currentPage)}
                  disabled={!selectedTextId}
                >
                  <Bold size={18} />
                </button>
                <button
                  className={`sidebar-button ${selectedText?.underline ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleToggleUnderline(currentPage)}
                  disabled={!selectedTextId}
                >
                  <Underline size={18} />
                </button>
                <button className="sidebar-button" type="button" onClick={() => handleFontSizeChange(-2, currentPage)} disabled={!selectedTextId}>
                  <AArrowDown size={18} />
                </button>
                <button className="sidebar-button" type="button" onClick={() => handleFontSizeChange(2, currentPage)} disabled={!selectedTextId}>
                  <AArrowUp size={18} />
                </button>
                <button className="sidebar-button" type="button" onClick={() => handleDeleteSelectedText(currentPage)} disabled={!selectedTextId}>
                  <Trash size={18} />
                </button>
                <button className="page-button" type="button" onClick={handleUndo} disabled={historyStack.length === 0}>
                  <Undo size={18} />
                </button>
                <button className="page-button" type="button" onClick={handleRedo} disabled={redoStack.length === 0}>
                  <Redo size={18} />
                </button>
              </aside>
            </div>
          </section>

        </div>
      </div>

      {showUploadOverlay && (
        <UploadOverlay onClose={() => setShowUploadOverlay(false)} />
      )}
    </div>
  )
}

export default EditPage