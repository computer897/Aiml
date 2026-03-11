import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
// import TermsAcceptance from './pages/TermsAcceptance'
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
  
  // const [termsAccepted, setTermsAccepted] = useState(() => {
  //   return localStorage.getItem('terms_accepted') === 'true'
  // })
  // const [showTermsDeclined, setShowTermsDeclined] = useState(false)

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

  // const handleTermsAccept = () => {
  //   setTermsAccepted(true)
  //   setShowTermsDeclined(false)
  // }
  // const handleTermsDecline = () => {
  //   setShowTermsDeclined(true)
  // }

  // Terms acceptance logic removed

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
