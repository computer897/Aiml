import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import TermsAcceptance from './pages/TermsAcceptance'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Classroom from './pages/Classroom'
import AnnouncementsPage from './pages/AnnouncementsPage'
import DocumentsPage from './pages/DocumentsPage'
import { PWAInstallBanner, OfflineIndicator, UpdateBanner } from './components/PWAInstallBanner'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  
  const [termsAccepted, setTermsAccepted] = useState(() => {
    return localStorage.getItem('terms_accepted') === 'true'
  })
  
  const [showTermsDeclined, setShowTermsDeclined] = useState(false)

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const handleLogout = () => {
    setUser(null)
  }

  const handleTermsAccept = () => {
    setTermsAccepted(true)
    setShowTermsDeclined(false)
  }

  const handleTermsDecline = () => {
    setShowTermsDeclined(true)
  }

  // Show terms acceptance screen if not accepted yet
  if (!termsAccepted) {
    if (showTermsDeclined) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Access Denied</h2>
              <p className="text-gray-400 mb-6">
                You must accept the Terms & Conditions to use VC Room Virtual Classroom.
              </p>
              <button
                onClick={() => setShowTermsDeclined(false)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
              >
                Review Terms Again
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <ThemeProvider>
        <TermsAcceptance onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* PWA Components */}
        <OfflineIndicator />
        <PWAInstallBanner />
        <UpdateBanner />
        
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} /> : <Navigate to="/login" />} />
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} />} />
          <Route path="/signup" element={!user ? <SignUp setUser={setUser} /> : <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} />} />
          <Route 
            path="/student-dashboard" 
            element={user?.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/teacher-dashboard" 
            element={user?.role === 'teacher' ? <TeacherDashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/classroom/:id" 
            element={user ? <Classroom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/announcements" 
            element={user?.role === 'teacher' ? <AnnouncementsPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/documents" 
            element={user ? <DocumentsPage userRole={user.role} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
