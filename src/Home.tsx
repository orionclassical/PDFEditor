import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import logo from './assets/img/PDFEditor_logo.png'
import EditPage from './Edit'
import './assets/styles/Home.css'

function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onUploadClick = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setUploadProgress(0)
      setIsLoading(true)
    } else {
      setSelectedFile(null)
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      return
    }

    const interval = window.setInterval(() => {
      setUploadProgress((current) => {
        const next = Math.min(current + Math.floor(Math.random() * 14) + 8, 100)
        return next
      })
    }, 180)

    return () => window.clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (uploadProgress >= 100 && isLoading) {
      const timeout = window.setTimeout(() => {
        setIsLoading(false)
        setEditorOpen(true)
      }, 350)
      return () => window.clearTimeout(timeout)
    }
  }, [uploadProgress, isLoading])

  if (editorOpen && selectedFile) {
    return <EditPage file={selectedFile} onBack={() => setEditorOpen(false)} />
  }

  return (
    <div className="home-page">
      <div className="brand">
        <img src={logo} alt="PDF Editor logo" />
      </div>

      <main className="hero-panel">
        <h1>PDF EDITOR</h1>

        <button className="upload-card" type="button" onClick={onUploadClick}>
          <span>UPLOAD PDF FILE</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden-file-input"
          onChange={onFileChange}
        />

        {(
          <p className="file-label file-label--hint">Click above to choose a PDF file</p>
        )}
      </main>

      {isLoading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <p className="loading-title">Uploading, please wait...</p>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-value">{uploadProgress}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
