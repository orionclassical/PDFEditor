import logo from './assets/img/PDFEditor_logo.png'
import './Home.css'

function EditPage({ file, onBack }: { file: File; onBack: () => void }) {
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
                        <p className="meta-value">6</p>
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
            <button className="sidebar-button">Edit PDF</button>
            <button className="sidebar-button">Sign</button>
            <button className="sidebar-button">Text</button>
            <button className="sidebar-button">Erase</button>
            <button className="sidebar-button">Highlight</button>
            <button className="sidebar-button">Redact</button>
          </aside>

          <section className="document-panel">
            <div className="document-header">
              <div className="document-title">Regression Analysis</div>
              <div className="document-pages">1 / 6</div>
            </div>
            <div className="document-preview">
              <div className="document-sheet">
                <div className="doc-page-label">Page 1</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default EditPage
