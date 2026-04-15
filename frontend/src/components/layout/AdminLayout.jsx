import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import {
  LayoutDashboard, Users, Clock, Calendar, ClipboardList,
  BarChart3, LogOut, Bell, Sparkles, Menu, X, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Funcionários', icon: Users },
  { to: '/admin/time-records', label: 'Registros de Ponto', icon: Clock },
  { to: '/admin/schedules', label: 'Escalas', icon: Calendar },
  { to: '/admin/adjustments', label: 'Ajustes', icon: ClipboardList },
  { to: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const [pendingAdjustments, setPendingAdjustments] = useState(0)

  useEffect(() => {
    fetchNotifications()
    fetchPendingAdjustments()
    const interval = setInterval(() => {
      fetchNotifications()
      fetchPendingAdjustments()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data)
    } catch {}
  }

  async function fetchPendingAdjustments() {
    try {
      const { data } = await api.get('/adjustments/all?status=pending')
      setPendingAdjustments(data.length)
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: 'linear-gradient(180deg, #1a0a10 0%, #2d1020 50%, #1a0a18 100%)' }}>

        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f43f74, #9b4c6d)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display text-white font-bold text-lg leading-none">MG Bate-Ponto</p>
              <p className="text-white/40 text-xs mt-0.5">Administrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-rose-400' : ''}`} />
                  <span className="flex-1">{label}</span>
                  {label === 'Ajustes' && pendingAdjustments > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingAdjustments}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-rose-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-sm">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-white/40 text-xs">Admin</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1" />

          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-12 w-80 card shadow-beauty-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Notificações</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-rose-500 hover:text-rose-700">
                        Marcar todas como lidas
                      </button>
                    )}
                    <button onClick={() => setShowNotif(false)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">Nenhuma notificação</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-rose-50/50' : ''}`}>
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

          {/* Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.full_name}</p>
              <p className="text-xs text-gray-400">Administrador</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
