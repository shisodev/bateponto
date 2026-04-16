import React, { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  Copy, X, RefreshCw
} from 'lucide-react'
import {
  format, getDaysInMonth, getDay, startOfMonth,
  addMonths, subMonths, startOfWeek, addDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const WEEKDAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKLY_DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

const defaultWeekly = WEEKLY_DAYS.reduce((acc, d) => {
  acc[`${d.key}_start`] = d.key === 'sunday' ? '' : '08:00'
  acc[`${d.key}_end`] = d.key === 'sunday' ? '' : '17:00'
  return acc
}, { type: 'fixed', break_duration: 60, weekly_hours: 44 })

const emptyForm = { start_time: '08:00', end_time: '17:00', break_start: '', break_end: '', notes: '' }

export default function AdminSchedules() {
  const [tab, setTab] = useState('monthly')
  const [employees, setEmployees] = useState([])

  // ── Aba: Escala Mensal ──────────────────────────────────
  const [selectedUser, setSelectedUser] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  const [modal, setModal] = useState({ open: false, date: '', entryId: null, form: emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [copyPanel, setCopyPanel] = useState({ open: false, refDate: '' })
  const [copyLoading, setCopyLoading] = useState(false)

  // ── Aba: Horário Semanal ────────────────────────────────
  const [weeklyUser, setWeeklyUser] = useState('')
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeekly)
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.active))
    } catch {}
  }

  // ── Calendário ─────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!selectedUser) return
    setLoadingEntries(true)
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const { data } = await api.get(`/daily-schedules/user/${selectedUser}?month=${month}&year=${year}`)
      setEntries(data)
    } catch {} finally { setLoadingEntries(false) }
  }, [selectedUser, currentDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfWeek = getDay(startOfMonth(currentDate))

  const calendarDays = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const entriesByDate = entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {})
  const today = format(new Date(), 'yyyy-MM-dd')

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // ── Modal ───────────────────────────────────────────────
  function openModal(day) {
    if (!selectedUser) return
    const date = dateStr(day)
    const entry = entriesByDate[date]
    setModal({
      open: true,
      date,
      entryId: entry?.id || null,
      form: entry
        ? {
            start_time: entry.start_time,
            end_time: entry.end_time,
            break_start: entry.break_start || '',
            break_end: entry.break_end || '',
            notes: entry.notes || ''
          }
        : { ...emptyForm }
    })
  }

  function closeModal() {
    setModal({ open: false, date: '', entryId: null, form: emptyForm })
  }

  async function handleSaveModal() {
    if (!modal.form.start_time || !modal.form.end_time) return
    setSaving(true)
    try {
      if (modal.entryId) {
        await api.put(`/daily-schedules/${modal.entryId}`, modal.form)
      } else {
        await api.post('/daily-schedules', {
          user_id: selectedUser,
          date: modal.date,
          ...modal.form
        })
      }
      closeModal()
      await fetchEntries()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleDeleteModal() {
    if (!modal.entryId) return
    if (!confirm('Remover este dia da escala?')) return
    setDeleting(true)
    try {
      await api.delete(`/daily-schedules/${modal.entryId}`)
      closeModal()
      await fetchEntries()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover')
    } finally { setDeleting(false) }
  }

  // ── Replicar semana ─────────────────────────────────────
  async function handleCopyWeek() {
    if (!copyPanel.refDate) return alert('Selecione uma data de referência')

    const refDate = new Date(copyPanel.refDate + 'T00:00:00')
    const weekStart = startOfWeek(refDate, { weekStartsOn: 1 }) // segunda-feira

    // Monta padrão por dia da semana a partir das entradas já carregadas
    const weekPattern = {}
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const ds = format(d, 'yyyy-MM-dd')
      if (entriesByDate[ds]) {
        const e = entriesByDate[ds]
        weekPattern[getDay(d)] = {
          start_time: e.start_time,
          end_time: e.end_time,
          break_start: e.break_start || '',
          break_end: e.break_end || '',
          notes: e.notes || ''
        }
      }
    }

    if (Object.keys(weekPattern).length === 0) {
      return alert('Nenhuma escala configurada na semana selecionada. Configure ao menos um dia antes de replicar.')
    }

    const bulkEntries = []
    for (let d = 1; d <= daysInMonth; d++) {
      const fullDate = new Date(year, month, d)
      const dow = getDay(fullDate)
      if (weekPattern[dow]) {
        bulkEntries.push({ date: format(fullDate, 'yyyy-MM-dd'), ...weekPattern[dow] })
      }
    }

    setCopyLoading(true)
    try {
      await api.post('/daily-schedules/bulk', { user_id: selectedUser, entries: bulkEntries })
      setCopyPanel({ open: false, refDate: '' })
      await fetchEntries()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao replicar')
    } finally { setCopyLoading(false) }
  }

  // ── Horário Semanal ─────────────────────────────────────
  async function fetchWeeklySchedule(userId) {
    setLoadingWeekly(true)
    try {
      const { data } = await api.get(`/schedules/${userId}`)
      setWeeklySchedule(data || defaultWeekly)
    } catch {} finally { setLoadingWeekly(false) }
  }

  function handleWeeklyUserChange(userId) {
    setWeeklyUser(userId)
    setWeeklySaved(false)
    if (userId) fetchWeeklySchedule(userId)
    else setWeeklySchedule(defaultWeekly)
  }

  async function handleSaveWeekly() {
    if (!weeklyUser) return
    setSavingWeekly(true)
    try {
      await api.put(`/schedules/${weeklyUser}`, weeklySchedule)
      setWeeklySaved(true)
      setTimeout(() => setWeeklySaved(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSavingWeekly(false) }
  }

  function toggleWeekDay(key) {
    const hasStart = weeklySchedule[`${key}_start`]
    setWeeklySchedule(prev => ({
      ...prev,
      [`${key}_start`]: hasStart ? '' : '08:00',
      [`${key}_end`]: hasStart ? '' : '17:00'
    }))
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Escalas de Trabalho</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie escalas diárias e horários semanais</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: 'monthly', label: 'Escala Mensal' },
          { id: 'weekly', label: 'Horário Semanal' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ABA: ESCALA MENSAL ─── */}
      {tab === 'monthly' && (
        <>
          <div className="card p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selecionar Funcionário</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="input-field max-w-sm"
            >
              <option value="">Escolha um funcionário...</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="card p-6">
              {/* Navegação de mês */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-2 rounded-xl hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h2 className="font-display font-bold text-gray-800 text-lg capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entries.length} {entries.length === 1 ? 'dia escalado' : 'dias escalados'} · clique em um dia para editar
                  </p>
                </div>
                <button
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-2 rounded-xl hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Cabeçalho dias */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS_HEADER.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Grade */}
              {loadingEntries ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />
                    const ds = dateStr(day)
                    const entry = entriesByDate[ds]
                    const isToday = ds === today
                    return (
                      <button
                        key={ds}
                        onClick={() => openModal(day)}
                        className={`min-h-[72px] p-1.5 rounded-xl border text-left transition-all group hover:border-rose-300 hover:shadow-sm ${
                          isToday
                            ? 'border-rose-400 bg-rose-50'
                            : entry
                              ? 'border-rose-200 bg-rose-50/40'
                              : 'border-gray-100 bg-white hover:bg-rose-50/20'
                        }`}
                      >
                        <div className={`text-xs font-bold mb-1 ${isToday ? 'text-rose-600' : 'text-gray-600'}`}>
                          {day}
                        </div>
                        {entry ? (
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-semibold text-rose-600">{entry.start_time.slice(0, 5)}</div>
                            <div className="text-[10px] text-gray-500">até {entry.end_time.slice(0, 5)}</div>
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3 text-rose-400" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Painel: replicar semana */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                {!copyPanel.open ? (
                  <button
                    onClick={() => setCopyPanel({
                      open: true,
                      refDate: format(currentDate, 'yyyy-MM') + '-01'
                    })}
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Replicar semana no mês inteiro
                  </button>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Copy className="w-4 h-4 text-rose-500" />
                        Replicar semana
                      </p>
                      <button onClick={() => setCopyPanel({ open: false, refDate: '' })}>
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Selecione qualquer dia da semana de referência. Os horários configurados naquela semana serão aplicados em todos os dias equivalentes do mês.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={copyPanel.refDate}
                        onChange={e => setCopyPanel(p => ({ ...p, refDate: e.target.value }))}
                        className="input-field py-2 text-sm flex-1"
                      />
                      <button
                        onClick={handleCopyWeek}
                        disabled={copyLoading}
                        className="btn-primary flex items-center gap-2 py-2"
                      >
                        {copyLoading
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <Copy className="w-4 h-4" />
                        }
                        {copyLoading ? 'Replicando...' : 'Replicar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── ABA: HORÁRIO SEMANAL ─── */}
      {tab === 'weekly' && (
        <>
          <div className="card p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selecionar Funcionário</label>
            <select
              value={weeklyUser}
              onChange={e => handleWeeklyUserChange(e.target.value)}
              className="input-field max-w-sm"
            >
              <option value="">Escolha um funcionário...</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          {weeklyUser && (
            <div className="card p-6 space-y-6">
              {loadingWeekly ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Jornada</label>
                      <select
                        value={weeklySchedule.type || 'fixed'}
                        onChange={e => setWeeklySchedule(s => ({ ...s, type: e.target.value }))}
                        className="input-field"
                      >
                        <option value="fixed">Fixo</option>
                        <option value="flexible">Flexível</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pausa (minutos)</label>
                      <input type="number" value={weeklySchedule.break_duration || 60} min={0} max={120}
                        onChange={e => setWeeklySchedule(s => ({ ...s, break_duration: parseInt(e.target.value) }))}
                        className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Carga Semanal (h)</label>
                      <input type="number" value={weeklySchedule.weekly_hours || 44} min={1} max={60}
                        onChange={e => setWeeklySchedule(s => ({ ...s, weekly_hours: parseInt(e.target.value) }))}
                        className="input-field" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      Horários por Dia da Semana
                    </h3>
                    <div className="space-y-3">
                      {WEEKLY_DAYS.map(({ key, label }) => {
                        const isActive = !!weeklySchedule[`${key}_start`]
                        return (
                          <div key={key}
                            className={`flex items-center gap-4 p-3 rounded-xl border ${
                              isActive ? 'border-rose-200 bg-rose-50/50' : 'border-gray-200 bg-gray-50'
                            }`}>
                            <button
                              onClick={() => toggleWeekDay(key)}
                              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                                isActive ? 'bg-rose-500' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                isActive ? 'translate-x-5' : 'translate-x-0.5'
                              }`} />
                            </button>
                            <span className={`w-32 text-sm font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                              {label}
                            </span>
                            {isActive ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input type="time" value={weeklySchedule[`${key}_start`] || ''}
                                  onChange={e => setWeeklySchedule(s => ({ ...s, [`${key}_start`]: e.target.value }))}
                                  className="input-field py-1.5 text-sm w-28" />
                                <span className="text-gray-400 text-sm">até</span>
                                <input type="time" value={weeklySchedule[`${key}_end`] || ''}
                                  onChange={e => setWeeklySchedule(s => ({ ...s, [`${key}_end`]: e.target.value }))}
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

                  <div className="flex items-center gap-3">
                    <button onClick={handleSaveWeekly} disabled={savingWeekly}
                      className="btn-primary flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingWeekly ? 'Salvando...' : 'Salvar Horário Semanal'}
                    </button>
                    {weeklySaved && (
                      <span className="text-green-600 text-sm font-medium">✓ Salvo com sucesso!</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── MODAL: adicionar / editar dia ─── */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 shadow-beauty-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-gray-800">
                {modal.entryId ? 'Editar Dia da Escala' : 'Adicionar Dia à Escala'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Data (readonly) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Data</label>
                <p className="text-sm font-semibold text-gray-800 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 capitalize">
                  {format(new Date(modal.date + 'T00:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              {/* Entrada / Saída */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Entrada</label>
                  <input type="time" value={modal.form.start_time}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, start_time: e.target.value } }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Saída</label>
                  <input type="time" value={modal.form.end_time}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, end_time: e.target.value } }))}
                    className="input-field" />
                </div>
              </div>

              {/* Início / Fim pausa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Início Pausa</label>
                  <input type="time" value={modal.form.break_start}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, break_start: e.target.value } }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Fim Pausa</label>
                  <input type="time" value={modal.form.break_end}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, break_end: e.target.value } }))}
                    className="input-field" />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Observações</label>
                <input type="text" value={modal.form.notes} placeholder="Opcional..."
                  onChange={e => setModal(m => ({ ...m, form: { ...m.form, notes: e.target.value } }))}
                  className="input-field" />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={handleSaveModal} disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : modal.entryId ? 'Salvar' : 'Adicionar'}
              </button>
              {modal.entryId && (
                <button onClick={handleDeleteModal} disabled={deleting}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium">
                  <Trash2 className="w-4 h-4" />
                  {deleting ? '...' : 'Remover'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
