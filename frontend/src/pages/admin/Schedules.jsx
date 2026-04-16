import React, { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Save,
  X, Wand2, Pencil, CheckCircle, Clock, BookOpen
} from 'lucide-react'
import {
  format, getDaysInMonth, getDay, startOfMonth,
  addMonths, subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Constantes ──────────────────────────────────────────────────────────────

const WEEKDAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]
const WEEKLY_DAYS = [
  { key: 'monday',    label: 'Segunda-feira' },
  { key: 'tuesday',   label: 'Terça-feira'   },
  { key: 'wednesday', label: 'Quarta-feira'  },
  { key: 'thursday',  label: 'Quinta-feira'  },
  { key: 'friday',    label: 'Sexta-feira'   },
  { key: 'saturday',  label: 'Sábado'        },
  { key: 'sunday',    label: 'Domingo'       },
]
const defaultWeekly = WEEKLY_DAYS.reduce((acc, d) => {
  acc[`${d.key}_start`] = d.key === 'sunday' ? '' : '08:00'
  acc[`${d.key}_end`]   = d.key === 'sunday' ? '' : '17:00'
  return acc
}, { type: 'fixed', break_duration: 60, weekly_hours: 44 })

const emptyDayForm = { start_time: '08:00', end_time: '17:00', break_start: '', break_end: '', notes: '' }
const emptyTplForm = { name: '', start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' }
const MONTH_NAMES = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },   { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },    { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },   { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },{ value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },{ value: 12, label: 'Dezembro' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeRange(tpl) {
  return `${tpl.start_time.slice(0, 5)} – ${tpl.end_time.slice(0, 5)}`
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function AdminSchedules() {
  const [tab, setTab] = useState('monthly')
  const [employees, setEmployees] = useState([])
  const [templates, setTemplates] = useState([])

  // ── Aba: Escala Mensal ─────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Modal edição de dia
  const [modal, setModal] = useState({ open: false, date: '', entryId: null, form: emptyDayForm })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Painel aplicar modelo
  const [applyPanel, setApplyPanel] = useState({
    templateId: '',
    weekdays: [1, 2, 3, 4, 5],
    replaceExisting: false,
    applyMonth: new Date().getMonth() + 1,
    applyYear: new Date().getFullYear(),
  })
  const [applying, setApplying] = useState(false)
  const [applyFeedback, setApplyFeedback] = useState(null) // { type: 'success'|'error', message }

  // ── Aba: Modelos ───────────────────────────────────────────────────────────
  const [tplModal, setTplModal] = useState({ open: false, editId: null, form: emptyTplForm })
  const [savingTpl, setSavingTpl] = useState(false)
  const [deletingTplId, setDeletingTplId] = useState(null)

  // ── Aba: Horário Semanal ───────────────────────────────────────────────────
  const [weeklyUser, setWeeklyUser] = useState('')
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeekly)
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)

  // ── Carregamento inicial ───────────────────────────────────────────────────

  useEffect(() => {
    fetchEmployees()
    fetchTemplates()
  }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.active))
    } catch {}
  }

  async function fetchTemplates() {
    try {
      const { data } = await api.get('/schedule-templates')
      setTemplates(data)
    } catch {}
  }

  // ── Calendário ─────────────────────────────────────────────────────────────

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

  // ── Aplicar modelo ─────────────────────────────────────────────────────────

  const selectedTemplate = templates.find(t => String(t.id) === String(applyPanel.templateId))

  async function handleApplyTemplate() {
    if (!applyPanel.templateId) return alert('Selecione um modelo de escala')
    if (applyPanel.weekdays.length === 0) return alert('Selecione ao menos um dia da semana')
    setApplying(true)
    setApplyFeedback(null)
    try {
      const { data } = await api.post('/daily-schedules/apply-template', {
        user_id: selectedUser,
        template_id: applyPanel.templateId,
        month: applyPanel.applyMonth,
        year: applyPanel.applyYear,
        weekdays: applyPanel.weekdays,
        replace_existing: applyPanel.replaceExisting,
      })
      setApplyFeedback({ type: 'success', message: data.message })
      setTimeout(() => setApplyFeedback(null), 6000)
      setCurrentDate(new Date(applyPanel.applyYear, applyPanel.applyMonth - 1, 1))
      await fetchEntries()
    } catch (err) {
      setApplyFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao aplicar modelo' })
    } finally { setApplying(false) }
  }

  function toggleWeekday(value) {
    setApplyPanel(p => ({
      ...p,
      weekdays: p.weekdays.includes(value)
        ? p.weekdays.filter(w => w !== value)
        : [...p.weekdays, value],
    }))
  }

  // ── Modal de dia ───────────────────────────────────────────────────────────

  function openModal(day) {
    if (!selectedUser) return
    const date = dateStr(day)
    const entry = entriesByDate[date]
    setModal({
      open: true,
      date,
      entryId: entry?.id || null,
      form: entry
        ? { start_time: entry.start_time, end_time: entry.end_time, break_start: entry.break_start || '', break_end: entry.break_end || '', notes: entry.notes || '' }
        : { ...emptyDayForm },
    })
  }

  function closeModal() { setModal({ open: false, date: '', entryId: null, form: emptyDayForm }) }

  async function handleSaveModal() {
    if (!modal.form.start_time || !modal.form.end_time) return
    setSaving(true)
    try {
      if (modal.entryId) {
        await api.put(`/daily-schedules/${modal.entryId}`, modal.form)
      } else {
        await api.post('/daily-schedules', { user_id: selectedUser, date: modal.date, ...modal.form })
      }
      closeModal()
      await fetchEntries()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleDeleteModal() {
    if (!modal.entryId || !confirm('Remover este dia da escala?')) return
    setDeleting(true)
    try {
      await api.delete(`/daily-schedules/${modal.entryId}`)
      closeModal()
      await fetchEntries()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover')
    } finally { setDeleting(false) }
  }

  // ── Modal de modelo ────────────────────────────────────────────────────────

  function openTplModal(template = null) {
    setTplModal({
      open: true,
      editId: template?.id || null,
      form: template
        ? { name: template.name, start_time: template.start_time, end_time: template.end_time, break_start: template.break_start || '', break_end: template.break_end || '' }
        : { ...emptyTplForm },
    })
  }

  function closeTplModal() { setTplModal({ open: false, editId: null, form: emptyTplForm }) }

  async function handleSaveTpl() {
    if (!tplModal.form.name.trim() || !tplModal.form.start_time || !tplModal.form.end_time) {
      return alert('Nome, horário de entrada e saída são obrigatórios')
    }
    setSavingTpl(true)
    try {
      if (tplModal.editId) {
        await api.put(`/schedule-templates/${tplModal.editId}`, tplModal.form)
      } else {
        await api.post('/schedule-templates', tplModal.form)
      }
      closeTplModal()
      await fetchTemplates()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar modelo')
    } finally { setSavingTpl(false) }
  }

  async function handleDeleteTpl(id) {
    if (!confirm('Excluir este modelo? As escalas já criadas não serão afetadas.')) return
    setDeletingTplId(id)
    try {
      await api.delete(`/schedule-templates/${id}`)
      await fetchTemplates()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    } finally { setDeletingTplId(null) }
  }

  // ── Horário Semanal ────────────────────────────────────────────────────────

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
      [`${key}_end`]: hasStart ? '' : '17:00',
    }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Escalas de Trabalho</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie modelos, escalas mensais e horários semanais</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {[
          { id: 'monthly',   label: 'Escala Mensal'   },
          { id: 'templates', label: 'Modelos'          },
          { id: 'weekly',    label: 'Horário Semanal'  },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ABA 1 — ESCALA MENSAL
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'monthly' && (
        <>
          {/* Seletor de funcionário */}
          <div className="card p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selecionar Funcionário</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              className="input-field max-w-sm">
              <option value="">Escolha um funcionário...</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <>
              {/* ── Painel: Aplicar Modelo ── */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-rose-500" />
                  Aplicar Modelo de Escala
                </h3>

                <div className="space-y-4">
                  {/* Dropdown de modelo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Modelo
                    </label>
                    {templates.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">
                        Nenhum modelo cadastrado.{' '}
                        <button onClick={() => setTab('templates')}
                          className="text-rose-500 hover:text-rose-700 font-medium underline">
                          Criar modelo →
                        </button>
                      </p>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <select value={applyPanel.templateId}
                          onChange={e => setApplyPanel(p => ({ ...p, templateId: e.target.value }))}
                          className="input-field max-w-xs">
                          <option value="">Selecione um modelo...</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} · {timeRange(t)}
                            </option>
                          ))}
                        </select>
                        {/* Preview do modelo selecionado */}
                        {selectedTemplate && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                            <Clock className="w-3 h-3" />
                            {timeRange(selectedTemplate)}
                            {selectedTemplate.break_start && (
                              <span className="text-amber-600 ml-1">
                                · ☕ {selectedTemplate.break_start.slice(0,5)}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mês e Ano */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Mês de aplicação
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={applyPanel.applyMonth}
                        onChange={e => {
                          const m = parseInt(e.target.value)
                          setApplyPanel(p => ({ ...p, applyMonth: m }))
                          setCurrentDate(new Date(applyPanel.applyYear, m - 1, 1))
                        }}
                        className="input-field w-40">
                        {MONTH_NAMES.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={applyPanel.applyYear}
                        min={2020}
                        max={2099}
                        onChange={e => {
                          const y = parseInt(e.target.value)
                          if (!isNaN(y)) {
                            setApplyPanel(p => ({ ...p, applyYear: y }))
                            setCurrentDate(new Date(y, applyPanel.applyMonth - 1, 1))
                          }
                        }}
                        className="input-field w-24"
                      />
                    </div>
                  </div>

                  {/* Dias da semana */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Dias da semana
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {WEEKDAY_OPTIONS.map(({ value, label }) => {
                        const active = applyPanel.weekdays.includes(value)
                        const isWeekend = value === 0 || value === 6
                        return (
                          <button key={value} onClick={() => toggleWeekday(value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              active
                                ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                : isWeekend
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-rose-200'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300'
                            }`}>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Toggle: substituir existentes */}
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <div
                      onClick={() => setApplyPanel(p => ({ ...p, replaceExisting: !p.replaceExisting }))}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        applyPanel.replaceExisting ? 'bg-rose-500' : 'bg-gray-300'
                      }`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        applyPanel.replaceExisting ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-sm text-gray-700">Substituir escalas já existentes neste mês</span>
                  </label>

                  {/* Feedback */}
                  {applyFeedback && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                      applyFeedback.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {applyFeedback.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                      {applyFeedback.message}
                    </div>
                  )}

                  {/* Botão aplicar */}
                  <button
                    onClick={handleApplyTemplate}
                    disabled={applying || !applyPanel.templateId || templates.length === 0}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {applying
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Wand2 className="w-4 h-4" />
                    }
                    {applying
                      ? 'Aplicando...'
                      : `Aplicar em ${MONTH_NAMES.find(m => m.value === applyPanel.applyMonth)?.label} ${applyPanel.applyYear}`
                    }
                  </button>
                </div>
              </div>

              {/* ── Calendário ── */}
              <div className="card p-6">
                {/* Navegação de mês */}
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-2 rounded-xl hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors">
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
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-2 rounded-xl hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Cabeçalho dos dias */}
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
                        <button key={ds} onClick={() => openModal(day)}
                          className={`min-h-[72px] p-1.5 rounded-xl border text-left transition-all group hover:border-rose-300 hover:shadow-sm ${
                            isToday
                              ? 'border-rose-400 bg-rose-50'
                              : entry
                                ? 'border-rose-200 bg-rose-50/40'
                                : 'border-gray-100 bg-white hover:bg-rose-50/20'
                          }`}>
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
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ABA 2 — MODELOS DE ESCALA
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-500" />
              <p className="text-sm text-gray-500">{templates.length} {templates.length === 1 ? 'modelo cadastrado' : 'modelos cadastrados'}</p>
            </div>
            <button onClick={() => openTplModal()}
              className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Modelo
            </button>
          </div>

          {/* Lista de modelos */}
          {templates.length === 0 ? (
            <div className="card p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Nenhum modelo cadastrado</p>
              <p className="text-gray-400 text-sm mb-4">
                Crie modelos de escala para aplicar rapidamente no calendário dos funcionários.
              </p>
              <button onClick={() => openTplModal()} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Criar primeiro modelo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <div key={t.id} className="card p-5 flex flex-col gap-3">
                  <div className="flex-1">
                    <p className="font-display font-bold text-gray-800 text-lg leading-tight">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-rose-600">{timeRange(t)}</span>
                    </div>
                    {t.break_start && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <span>☕</span>
                        Pausa: {t.break_start.slice(0, 5)}
                        {t.break_end ? ` – ${t.break_end.slice(0, 5)}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => openTplModal(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium">
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteTpl(t.id)}
                      disabled={deletingTplId === t.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingTplId === t.id ? '...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ABA 3 — HORÁRIO SEMANAL
      ═══════════════════════════════════════════════════════════ */}
      {tab === 'weekly' && (
        <>
          <div className="card p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selecionar Funcionário</label>
            <select value={weeklyUser} onChange={e => handleWeeklyUserChange(e.target.value)}
              className="input-field max-w-sm">
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
                      <select value={weeklySchedule.type || 'fixed'}
                        onChange={e => setWeeklySchedule(s => ({ ...s, type: e.target.value }))}
                        className="input-field">
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
                          <div key={key} className={`flex items-center gap-4 p-3 rounded-xl border ${
                            isActive ? 'border-rose-200 bg-rose-50/50' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <button onClick={() => toggleWeekDay(key)}
                              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${isActive ? 'bg-rose-500' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                            <span className={`w-32 text-sm font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
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
                    {weeklySaved && <span className="text-green-600 text-sm font-medium">✓ Salvo com sucesso!</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL — Editar dia individual
      ═══════════════════════════════════════════════════════════ */}
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
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Data</label>
                <p className="text-sm font-semibold text-gray-800 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 capitalize">
                  {format(new Date(modal.date + 'T00:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              {/* Atalho: aplicar modelo no dia */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Usar modelo
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map(t => (
                      <button key={t.id}
                        onClick={() => setModal(m => ({
                          ...m,
                          form: { ...m.form, start_time: t.start_time, end_time: t.end_time, break_start: t.break_start || '', break_end: t.break_end || '' }
                        }))}
                        className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium hover:bg-rose-100 transition-colors">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

      {/* ═══════════════════════════════════════════════════════════
          MODAL — Criar / editar modelo
      ═══════════════════════════════════════════════════════════ */}
      {tplModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 shadow-beauty-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-gray-800">
                {tplModal.editId ? 'Editar Modelo' : 'Novo Modelo de Escala'}
              </h3>
              <button onClick={closeTplModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Nome do Modelo</label>
                <input type="text" value={tplModal.form.name} placeholder="Ex: Escala Manhã, Escala Tarde..."
                  onChange={e => setTplModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  className="input-field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Entrada</label>
                  <input type="time" value={tplModal.form.start_time}
                    onChange={e => setTplModal(m => ({ ...m, form: { ...m.form, start_time: e.target.value } }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Saída</label>
                  <input type="time" value={tplModal.form.end_time}
                    onChange={e => setTplModal(m => ({ ...m, form: { ...m.form, end_time: e.target.value } }))}
                    className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Início Pausa</label>
                  <input type="time" value={tplModal.form.break_start}
                    onChange={e => setTplModal(m => ({ ...m, form: { ...m.form, break_start: e.target.value } }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Fim Pausa</label>
                  <input type="time" value={tplModal.form.break_end}
                    onChange={e => setTplModal(m => ({ ...m, form: { ...m.form, break_end: e.target.value } }))}
                    className="input-field" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveTpl} disabled={savingTpl}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {savingTpl ? 'Salvando...' : tplModal.editId ? 'Salvar' : 'Criar Modelo'}
              </button>
              <button onClick={closeTplModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
