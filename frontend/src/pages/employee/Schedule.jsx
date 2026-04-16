import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, getDaysInMonth, getDay, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function EmployeeSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedule()
  }, [currentDate])

  async function fetchSchedule() {
    setLoading(true)
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const { data } = await api.get(`/daily-schedules/my?month=${month}&year=${year}`)
      setEntries(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  const entriesByDate = entries.reduce((acc, e) => { acc[e.date] = e; return acc }, {})

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfWeek = getDay(startOfMonth(currentDate))

  const calendarDays = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const today = format(new Date(), 'yyyy-MM-dd')

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-800">Minha Escala</h1>
        <p className="text-gray-500 text-sm mt-1">Seus horários de trabalho do mês</p>
      </div>

      <div className="card p-5">
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
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">{entries.length} dias escalados</p>
            )}
          </div>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-xl hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Grade do calendário */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />
              const ds = dateStr(day)
              const entry = entriesByDate[ds]
              const isToday = ds === today
              const colIdx = idx % 7
              const isWeekend = colIdx === 0 || colIdx === 6

              return (
                <div
                  key={ds}
                  className={`min-h-[70px] p-1.5 rounded-xl border transition-all ${
                    isToday
                      ? 'border-rose-400 bg-rose-50'
                      : entry
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-gray-100 bg-gray-50/50'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${
                    isToday ? 'text-rose-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {day}
                  </div>
                  {entry ? (
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-semibold text-rose-600 leading-tight">
                        {entry.start_time.slice(0, 5)}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        até {entry.end_time.slice(0, 5)}
                      </div>
                      {entry.break_start && (
                        <div className="text-[10px] text-amber-500 leading-tight">
                          ☕ {entry.break_start.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Legenda</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-rose-400 bg-rose-50" />
            <span className="text-xs text-gray-600">Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-rose-200 bg-rose-50/30" />
            <span className="text-xs text-gray-600">Com escala</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gray-100 bg-gray-50" />
            <span className="text-xs text-gray-600">Folga / sem escala</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-500">☕</span>
            <span className="text-xs text-gray-600">Pausa</span>
          </div>
        </div>
      </div>

      {/* Lista resumida do mês */}
      {!loading && entries.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Calendar className="w-4 h-4 text-rose-500" />
            Resumo do Mês
          </h3>
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-rose-600 text-sm">{e.date.slice(8)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                  </p>
                  {e.break_start && (
                    <p className="text-xs text-gray-500">
                      Pausa: {e.break_start.slice(0, 5)}
                      {e.break_end ? ` – ${e.break_end.slice(0, 5)}` : ''}
                    </p>
                  )}
                  {e.notes && <p className="text-xs text-gray-400 mt-0.5">{e.notes}</p>}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {format(new Date(e.date + 'T00:00:00'), 'EEE', { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="card p-10 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma escala para este mês</p>
          <p className="text-gray-300 text-xs mt-1">A escala será exibida quando o administrador a configurar</p>
        </div>
      )}
    </div>
  )
}
