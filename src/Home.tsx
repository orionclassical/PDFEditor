import logo from './assets/img/PDFEditor_logo.png'
import './Home.css'

function Home() {
  return (
    <div className="home-page">
      <div className="brand">
        <img src={logo} alt="PDF Editor logo" />
      </div>

      <main className="hero-panel">
        <h1>PDF EDITOR</h1>

        <div className="upload-card" role="button" tabIndex={0}>
          <span>UPLOAD PDF FILE</span>
        </div>
      </main>
    </div>
  )
}

export default Home
