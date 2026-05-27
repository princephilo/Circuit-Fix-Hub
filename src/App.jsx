import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import UploadAnalyzer from './pages/UploadAnalyzer'
import Results from './pages/Results'
import CommunityHub from './pages/CommunityHub'

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadAnalyzer />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/community" element={<CommunityHub />} />
      </Routes>
    </div>
  )
}
