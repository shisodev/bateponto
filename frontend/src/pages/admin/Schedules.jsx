import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Save, Calendar } from 'lucide-react'

const DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

const defaultSchedule = DAYS.reduce((acc, day) => {
  acc[`${day.key}_start`] = day.key === 'sunday' ? '' : '08:00'
  acc[`${day.key}_end`] = day.key === 'sunday' ? '' : '17:00'
  return acc
}, { type: 'fixed', break_duration: 60, weekly_hours: 44 })

export default function AdminSchedules() {
  const [employees, setEmployees] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.role === 'employee' && e.active))
    } catch {}
  }

  async function fetchSchedule(userId) {
    setLoading(true)
    try {
      const { data } = await api.get(`/schedules/${userId}`)
      setSchedule(data || defaultSchedule)
    } catch {} finally { setLoading(false) }
  }

  function handleUserChange(userId) {
    setSelectedUser(userId)
    setSaved(false)
    if (userId) fetchSchedule(userId)
    else setSchedule(defaultSchedule)
  }

  async function handleSave() {
    if (!selectedUser) return
    setSaving(true)
    try {
      await api.put(`/schedules/${selectedUser}`, schedule)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  function toggleDay(day) {
    const hasStart = schedule[`${day}_start`]
    setSchedule(prev => ({
      ...prev,
      [`${day}_start`]: hasStart ? '' : '08:00',
      [`${day}_end`]: hasStart ? '' : '17:00'
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Escalas de Trabalho</h1>
        <p className="text-gray-500 text-sm mt-1">Defina os horários de trabalho de cada funcionária</p>
      </div>

      {/* Seleção de funcionária */}
      <div className="card p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Selecionar Funcionária</label>
        <select value={selectedUser} onChange={e => handleUserChange(e.target.value)} className="input-field max-w-sm">
          <option value="">Escolha uma funcionária...</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="card p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Configurações gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Jornada</label>
                  <select value={schedule.type}
                    onChange={e => setSchedule(s => ({ ...s, type: e.target.value }))}
                    className="input-field">
                    <option value="fixed">Fixo</option>
                    <option value="flexible">Flexível</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pausa (minutos)</label>
                  <input type="number" value={schedule.break_duration || 60} min={0} max={120}
                    onChange={e => setSchedule(s => ({ ...s, break_duration: parseInt(e.target.value) }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Carga Semanal (horas)</label>
                  <input type="number" value={schedule.weekly_hours || 44} min={1} max={60}
                    onChange={e => setSchedule(s => ({ ...s, weekly_hours: parseInt(e.target.value) }))}
                    className="input-field" />
                </div>
              </div>

              {/* Dias da semana */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  Horários por Dia
                </h3>
                <div className="space-y-3">
                  {DAYS.map(({ key, label }) => {
                    const isActive = !!schedule[`${key}_start`]
                    return (
                      <div key={key} className={`flex items-center gap-4 p-3 rounded-xl border ${isActive ? 'border-rose-200 bg-rose-50/50' : 'border-gray-200 bg-gray-50'}`}>
                        <button
                          onClick={() => toggleDay(key)}
                          className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${isActive ? 'bg-rose-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`w-32 text-sm font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                        {isActive ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="time" value={schedule[`${key}_start`] || ''}
                              onChange={e => setSchedule(s => ({ ...s, [`${key}_start`]: e.target.value }))}
                              className="input-field py-1.5 text-sm w-28" />
                            <span className="text-gray-400 text-sm">até</span>
                            <input type="time" value={schedule[`${key}_end`] || ''}
                              onChange={e => setSchedule(s => ({ ...s, [`${key}_end`]: e.target.value }))}
                              className="input-field py-1.5 text-sm w-28" />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Folga</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Salvar */}
              <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Escala'}
                </button>
                {saved && (
                  <span className="text-green-600 text-sm font-medium">✓ Escala salva com sucesso!</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
