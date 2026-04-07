import { Navigate, Route, Routes } from 'react-router-dom'
import ComingSoon from './pages/ComingSoon'
import RecruiterDashboard from './pages/RecruiterDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ComingSoon />} />
      <Route path="/hq/recruiters" element={<RecruiterDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
