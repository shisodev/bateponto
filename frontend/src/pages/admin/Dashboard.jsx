import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Users, Clock, ClipboardList, UserCheck, TrendingUp, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const typeLabels = {
  entrada: { label: 'Entrada', color: 'text-green-600 bg-green-100' },
  saida: { label: 'Saída', color: 'text-red-600 bg-red-100' },
  inicio_pausa: { label: 'Início Pausa', color: 'text-yellow-600 bg-yellow-100' },
  fim_pausa: { label: 'Fim Pausa', color: 'text-blue-600 bg-blue-100' },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [presentToday, setPresentToday] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [statsRes, presentRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/present-today')
      ])
      setStats(statsRes.data)
      setPresentToday(presentRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="text-gray-500 mt-1 capitalize">{today}</p>
        </div>
        <button onClick={fetchData} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats?.total_employees || 0}</p>
            <p className="text-sm text-gray-500">Funcionárias</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats?.present_today || 0}</p>
            <p className="text-sm text-gray-500">Presentes Hoje</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats?.today_records || 0}</p>
            <p className="text-sm text-gray-500">Registros Hoje</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats?.pending_adjustments || 0}</p>
            <p className="text-sm text-gray-500">Ajustes Pendentes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Presença hoje */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-rose-500" />
            Funcionárias Hoje
          </h2>
          <div className="space-y-2">
            {presentToday.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Nenhum registro hoje</p>
            ) : (
              presentToday.map(emp => {
                const statusColors = {
                  entrada: 'border-green-400',
                  fim_pausa: 'border-green-400',
                  inicio_pausa: 'border-yellow-400',
                  saida: 'border-gray-300',
                }
                const statusLabels = {
                  entrada: '🟢 Trabalhando',
                  fim_pausa: '🟢 Trabalhando',
                  inicio_pausa: '🟡 Em pausa',
                  saida: '⚪ Encerrou',
                }
                return (
                  <div key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-l-4 bg-gray-50 ${statusColors[emp.last_type] || 'border-gray-200'}`}>
                    <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm flex-shrink-0">
                      {emp.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{emp.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {statusLabels[emp.last_type] || '⚪ Sem registro'}
                        {emp.first_entry && ` · Entrada: ${emp.first_entry.slice(11, 16)}`}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Últimos registros */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            Últimos Registros
          </h2>
          <div className="space-y-2">
            {(!stats?.recent_records || stats.recent_records.length === 0) ? (
              <p className="text-gray-400 text-sm py-4 text-center">Nenhum registro hoje</p>
            ) : (
              stats.recent_records.map(record => {
                const info = typeLabels[record.type] || { label: record.type, color: 'text-gray-600 bg-gray-100' }
                return (
                  <div key={record.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className={`badge text-xs ${info.color}`}>{info.label}</span>
                    <span className="text-sm text-gray-700 font-medium flex-1 truncate">{record.full_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{record.timestamp?.slice(11, 16)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
