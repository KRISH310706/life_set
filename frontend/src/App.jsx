import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { LanguageProvider } from './LanguageContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import RiskAnalysis from './pages/RiskAnalysis'
import ReportUpload from './pages/ReportUpload'
import MapView from './pages/MapView'
import Profile from './pages/Profile'
import Alerts from './pages/Alerts'
import WellnessPage from './pages/WellnessPage'
import Chatbot from './pages/Chatbot'
import DoctorsPage from './pages/DoctorsPage'
import MessagesPage from './pages/MessagesPage'
import AccessRequestsPage from './pages/AccessRequestsPage'
import PatientView from './pages/PatientView'
import LifePrint from './pages/LifePrint'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="risk" element={<RiskAnalysis />} />
              <Route path="wellness" element={<WellnessPage />} />
              <Route path="reports" element={<ReportUpload />} />
              <Route path="map" element={<MapView />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="access" element={<AccessRequestsPage />} />
              <Route path="patient/:patientId" element={<PatientView />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="profile" element={<Profile />} />
              <Route path="life-print" element={<LifePrint />} />
              <Route path="patient/:patientId/life-print" element={<LifePrint />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
