import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Upload from './pages/Upload'
import Ask from './pages/Ask'
import Documents from './pages/Documents'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/ask/:sessionId" element={<Ask />} />
            <Route path="/documents" element={<Documents />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
