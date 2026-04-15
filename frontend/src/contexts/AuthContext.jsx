import React, { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mg_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('mg_token', data.token)
      localStorage.setItem('mg_user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao fazer login'
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('mg_token')
    localStorage.removeItem('mg_user')
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
