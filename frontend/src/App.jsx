import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Classroom from './pages/Classroom'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} /> : <Navigate to="/login" />} />
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} />} />
        <Route path="/signup" element={!user ? <SignUp setUser={setUser} /> : <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} />} />
        <Route 
          path="/student-dashboard" 
          element={user?.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/teacher-dashboard" 
          element={user?.role === 'teacher' ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/classroom/:id" 
          element={user ? <Classroom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
