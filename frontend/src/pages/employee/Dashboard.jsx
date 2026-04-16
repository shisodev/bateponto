import React, { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { LogIn, LogOut, Coffee, Play, CheckCircle, Clock } from 'lucide-react'

const BUTTONS = [
  {
    type: 'entrada',
    label: 'Entrada',
    icon: LogIn,
    activeStatus: ['sem_registro', 'encerrado'],
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    iconColor: '#22c55e',
    bg: '#f0fdf4',
    border: '#86efac'
  },
  {
    type: 'saida',
    label: 'Saída',
    icon: LogOut,
    activeStatus: ['trabalhando'],
    gradient: 'linear-gradient(135deg, #f43f74, #be1241)',
    iconColor: '#f43f74',
    bg: '#fff1f5',
    border: '#fda4bc'
  },
  {
    type: 'inicio_pausa',
    label: 'Iniciar Pausa',
    icon: Coffee,
    activeStatus: ['trabalhando'],
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    iconColor: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a'
  },
  {
    type: 'fim_pausa',
    label: 'Fim de Pausa',
    icon: Play,
    activeStatus: ['em_pausa'],
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    iconColor: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe'
  },
]

const STATUS_CONFIG = {
  sem_registro: { label: 'Sem registro hoje', color: '#9ca3af', bg: '#f9fafb', dot: 'bg-gray-400' },
  trabalhando: { label: 'Trabalhando', color: '#16a34a', bg: '#f0fdf4', dot: 'bg-green-500' },
  em_pausa: { label: 'Em pausa', color: '#d97706', bg: '#fffbeb', dot: 'bg-yellow-500' },
  encerrado: { label: 'Jornada encerrada', color: '#6b7280', bg: '#f3f4f6', dot: 'bg-gray-400' },
}

const typeLabels = {
  entrada: { label: 'Entrada', icon: '🟢' },
  saida: { label: 'Saída', icon: '🔴' },
  inicio_pausa: { label: 'Início Pausa', icon: '🟡' },
  fim_pausa: { label: 'Fim Pausa', icon: '🔵' },
}

const TZ = 'America/Sao_Paulo'

function getLocalTime() {
  return new Date().toLocaleString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function getLocalDateLabel() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' })
}

function LiveClock() {
  const [timeStr, setTimeStr] = useState(getLocalTime())
  const [dateStr, setDateStr] = useState(getLocalDateLabel())
  useEffect(() => {
    const t = setInterval(() => {
      setTimeStr(getLocalTime())
      setDateStr(getLocalDateLabel())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const [hhmm, ss] = timeStr.split(':').length === 3
    ? [timeStr.slice(0, 5), timeStr.slice(6, 8)]
    : [timeStr, '00']

  return (
    <div className="text-center">
      <div className="font-display text-5xl font-bold tracking-tight text-gray-800">
        {hhmm}
        <span className="text-rose-400">:{ss}</span>
      </div>
      <p className="text-gray-500 text-sm mt-1 capitalize">
        {dateStr}
      </p>
    </div>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [status, setStatus] = useState('sem_registro')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [punching, setPunching] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/time-records/status')
      setStatus(data.status)
      setRecords(data.records || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  async function handlePunch(type) {
    setPunching(type)
    setFeedback(null)
    try {
      const { data } = await api.post('/time-records', { type })
      setFeedback({ type: 'success', message: `${typeLabels[type]?.label} registrada às ${data.timestamp.slice(11, 16)}!` })
      await fetchStatus()
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao registrar ponto' })
    } finally {
      setPunching(null)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.sem_registro

  return (
    <div className="space-y-5">
      {/* Relógio */}
      <div className="card p-8 text-center shadow-beauty">
        <LiveClock />

        {/* Status atual */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{ background: statusConfig.bg, color: statusConfig.color }}>
          <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${status === 'trabalhando' ? 'animate-pulse' : ''}`} />
          {statusConfig.label}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl font-medium text-sm flex items-center gap-3 animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : '⚠'}
          {feedback.message}
        </div>
      )}

      {/* Botões de ponto */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Registrar Ponto</h2>
        <div className="grid grid-cols-2 gap-3">
          {BUTTONS.map(({ type, label, icon: Icon, activeStatus, gradient, iconColor, bg, border }) => {
            const isActive = activeStatus.includes(status)
            const isLoading = punching === type
            return (
              <button
                key={type}
                onClick={() => handlePunch(type)}
                disabled={!isActive || punching !== null}
                className="punch-button"
                style={isActive ? {
                  background: bg,
                  border: `2px solid ${border}`,
                  color: iconColor,
                } : {
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  color: '#9ca3af',
                  cursor: 'not-allowed',
                  opacity: 0.5
                }}
              >
                {isLoading ? (
                  <span className="w-7 h-7 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                    style={{ background: isActive ? gradient : '#e5e7eb' }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                )}
                <span className="font-semibold text-sm">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Registros de hoje */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Clock className="w-4 h-4 text-rose-500" />
          Registros de Hoje
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">Nenhum registro hoje</p>
            <p className="text-gray-300 text-xs mt-1">Registre sua entrada para começar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record, idx) => {
              const info = typeLabels[record.type] || { label: record.type, icon: '⚪' }
              return (
                <div key={record.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-lg">{info.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                    {record.notes && <p className="text-xs text-gray-400">{record.notes}</p>}
                  </div>
                  <span className="font-mono text-sm font-bold text-gray-700">
                    {record.timestamp?.slice(11, 16)}
                  </span>
                  {record.is_adjusted === 1 && (
                    <span className="badge bg-purple-100 text-purple-600 text-xs">Ajustado</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
