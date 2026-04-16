import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { Clock, History, FileEdit, CalendarDays, LogOut, Bell, Sparkles, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/employee', label: 'Bater Ponto', icon: Clock, end: true },
  { to: '/employee/history', label: 'Histórico', icon: History },
  { to: '/employee/schedule', label: 'Escala', icon: CalendarDays },
  { to: '/employee/adjustments', label: 'Solicitar Ajuste', icon: FileEdit },
]

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data)
    } catch {}
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fff1f5 0%, #fce7f3 50%, #faf5ff 100%)' }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f43f74, #9b4c6d)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-gray-800 leading-none">MG Bate-Ponto</p>
            <p className="text-xs text-gray-400">Olá, {user?.full_name?.split(' ')[0]}! 💖</p>
          </div>

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-12 w-72 card shadow-beauty-lg z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm">Notificações</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-rose-500">Marcar todas lidas</button>
                    )}
                    <button onClick={() => setShowNotif(false)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">Nenhuma notificação</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-rose-50/60' : ''}`}>
                        <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{n.created_at?.slice(0, 16)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-rose-100">
        <div className="max-w-2xl mx-auto px-4">
          <nav className="flex gap-1 py-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-rose-50 hover:text-rose-600'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
