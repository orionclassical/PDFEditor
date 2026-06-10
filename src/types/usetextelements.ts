import { useState } from 'react'
import type { TextElement, PageTextsMap } from './types'

export function useTextElements() {
  const [pageTexts, setPageTexts] = useState<PageTextsMap>({})
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [historyStack, setHistoryStack] = useState<PageTextsMap[]>([])
  const [redoStack, setRedoStack] = useState<PageTextsMap[]>([])

  const clonePageTexts = (texts: PageTextsMap): PageTextsMap =>
    JSON.parse(JSON.stringify(texts))

  const savePageTexts = (nextTexts: PageTextsMap) => {
    setHistoryStack((prev) => [...prev, clonePageTexts(pageTexts)])
    setRedoStack([])
    setPageTexts(nextTexts)
  }

  const getCurrentPageTexts = (currentPage: number): TextElement[] =>
    pageTexts[currentPage] || []

  const setCurrentPageTexts = (currentPage: number, texts: TextElement[]) => {
    savePageTexts({ ...pageTexts, [currentPage]: texts })
  }

  // Single click — select only, no editing
  const handleSelectText = (id: string, currentPage: number) => {
    setSelectedTextId(id)
    // Do NOT set editingId here — editing requires double click
  }

  // Double click — enter edit mode
  const handleEditText = (id: string, currentPage: number) => {
    setSelectedTextId(id)
    setEditingId(id)
    const selected = getCurrentPageTexts(currentPage).find((el) => el.id === id)
    setEditingText(selected?.text ?? '')
  }

  // Click outside any text — deselect
  const handleDeselect = () => {
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  const handleDeleteSelectedText = (currentPage: number) => {
    if (!selectedTextId) return
    setCurrentPageTexts(
      currentPage,
      getCurrentPageTexts(currentPage).filter((el) => el.id !== selectedTextId)
    )
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  const handleFontSizeChange = (delta: number, currentPage: number) => {
    if (!selectedTextId) return
    setCurrentPageTexts(
      currentPage,
      getCurrentPageTexts(currentPage).map((el) =>
        el.id === selectedTextId
          ? { ...el, fontSize: Math.max(10, Math.min(72, el.fontSize + delta)) }
          : el
      )
    )
  }

  const handleToggleBold = (currentPage: number) => {
    if (!selectedTextId) return
    setCurrentPageTexts(
      currentPage,
      getCurrentPageTexts(currentPage).map((el) =>
        el.id === selectedTextId ? { ...el, bold: !el.bold } : el
      )
    )
  }

  const handleToggleUnderline = (currentPage: number) => {
    if (!selectedTextId) return
    setCurrentPageTexts(
      currentPage,
      getCurrentPageTexts(currentPage).map((el) =>
        el.id === selectedTextId ? { ...el, underline: !el.underline } : el
      )
    )
  }

  const handleTextBlur = (currentPage: number) => {
    if (editingId) {
      setCurrentPageTexts(
        currentPage,
        getCurrentPageTexts(currentPage).map((el) =>
          el.id === editingId ? { ...el, text: editingText } : el
        )
      )
    }
    setEditingId(null)
    setEditingText('')
    // Keep selectedTextId so the element stays visually selected after editing
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

  const clearSelection = () => {
    setSelectedTextId(null)
    setEditingId(null)
    setEditingText('')
  }

  return {
    pageTexts,
    selectedTextId,
    editingId,
    editingText,
    historyStack,
    redoStack,
    setEditingText,
    setCurrentPageTexts,
    getCurrentPageTexts,
    handleSelectText,
    handleEditText,
    handleDeselect,
    handleDeleteSelectedText,
    handleFontSizeChange,
    handleToggleBold,
    handleToggleUnderline,
    handleTextBlur,
    handleUndo,
    handleRedo,
    clearSelection,
  }
}