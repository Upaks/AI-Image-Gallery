import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ThemeProvider } from './contexts/ThemeContext'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Gallery from './pages/Gallery'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route
            path="/signin"
            element={user ? <Navigate to="/" replace /> : <SignIn />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/" replace /> : <SignUp />}
          />
          <Route
            path="/"
            element={user ? <Gallery user={user} /> : <Navigate to="/signin" replace />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App

