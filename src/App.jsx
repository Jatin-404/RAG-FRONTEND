import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Upload from './pages/Upload'
import Ask from './pages/Ask'
import Documents from './pages/Documents'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#0f0f1a' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/documents" element={<Documents />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}