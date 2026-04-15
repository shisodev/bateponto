import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const typeLabels = {
  entrada: { label: 'Entrada', icon: '🟢', color: 'text-green-600' },
  saida: { label: 'Saída', icon: '🔴', color: 'text-red-600' },
  inicio_pausa: { label: 'Início Pausa', icon: '🟡', color: 'text-yellow-600' },
  fim_pausa: { label: 'Fim Pausa', icon: '🔵', color: 'text-blue-600' },
}

function groupByDate(records) {
  return records.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})
}

function calcWorked(records) {
  let totalMin = 0
  let entryTime = null
  for (const r of [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const t = new Date(`1970-01-01T${r.timestamp.slice(11, 19)}`)
    if (r.type === 'entrada') entryTime = t
    else if (r.type === 'inicio_pausa' && entryTime) {
      totalMin += (t - entryTime) / 60000
      entryTime = null
    } else if (r.type === 'fim_pausa') entryTime = t
    else if (r.type === 'saida' && entryTime) {
      totalMin += (t - entryTime) / 60000
      entryTime = null
    }
  }
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  return totalMin > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : null
}

export default function EmployeeHistory() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [expandedDates, setExpandedDates] = useState({})

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data } = await api.get(`/time-records/history?start_date=${startDate}&end_date=${endDate}`)
      setRecords(data)
    } catch {} finally { setLoading(false) }
  }

  function toggleDate(date) {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))
  }

  const grouped = groupByDate(records)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-800">Histórico de Ponto</h1>
        <p className="text-gray-500 text-sm mt-1">{records.length} registros encontrados</p>
      </div>

      {/* Filtro de período */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">De</label>
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)} className="input-field py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Até</label>
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)} className="input-field py-2 text-sm" />
          </div>
        </div>
        <button onClick={fetchHistory} className="btn-primary w-full py-2.5 text-sm">
          Buscar
        </button>
      </div>

      {/* Registros agrupados por data */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum registro neste período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dayRecords = grouped[date].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            const worked = calcWorked(dayRecords)
            const isExpanded = expandedDates[date] !== false // default expanded
            const entryRecord = dayRecords.find(r => r.type === 'entrada')
            const exitRecord = [...dayRecords].reverse().find(r => r.type === 'saida')

            return (
              <div key={date} className="card overflow-hidden">
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-rose-600 text-sm">{date.slice(8)}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">{date}</p>
                      <p className="text-xs text-gray-500">
                        {entryRecord ? `Entrada: ${entryRecord.timestamp.slice(11, 16)}` : 'Sem entrada'}
                        {exitRecord ? ` · Saída: ${exitRecord.timestamp.slice(11, 16)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {worked && (
                      <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                        {worked}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
                    {dayRecords.map(record => {
                      const info = typeLabels[record.type] || { label: record.type, icon: '⚪', color: 'text-gray-600' }
                      return (
                        <div key={record.id} className="flex items-center gap-3">
                          <span>{info.icon}</span>
                          <span className={`text-sm font-medium ${info.color} flex-1`}>{info.label}</span>
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
            )
          })}
        </div>
      )}
    </div>
  )
}
