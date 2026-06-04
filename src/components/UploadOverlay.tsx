import { useRef, useState } from 'react'

interface UploadOverlayProps {
  onClose: () => void
}

export function UploadOverlay({ onClose }: UploadOverlayProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleDropzone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleSubmit = () => {
    if (selectedFile) onClose()
  }

  return (
    <div className="upload-overlay">
      <div className="upload-overlay-content">
        <div className="upload-overlay-header">
          <h2 className="upload-overlay-title">Upload New PDF</h2>
          <button className="upload-overlay-close" onClick={onClose}>✕</button>
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
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-active')}
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
            <button className="upload-file-remove" onClick={() => setSelectedFile(null)}>
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
          <button className="upload-button-cancel" onClick={onClose}>Cancel</button>
          <button
            className="upload-button-submit"
            onClick={handleSubmit}
            disabled={!selectedFile}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}