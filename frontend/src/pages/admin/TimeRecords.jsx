import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Search, RefreshCw, Trash2, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const typeLabels = {
  entrada: { label: 'Entrada', color: 'badge-green' },
  saida: { label: 'Saída', color: 'badge-red' },
  inicio_pausa: { label: 'Início Pausa', color: 'badge-yellow' },
  fim_pausa: { label: 'Fim Pausa', color: 'badge-blue' },
}

export default function AdminTimeRecords() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    user_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    fetchEmployees()
    fetchRecords()
  }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.role === 'employee'))
    } catch {}
  }

  async function fetchRecords() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      const { data } = await api.get(`/time-records/all?${params}`)
      setRecords(data)
    } catch {} finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este registro?')) return
    try {
      await api.delete(`/time-records/${id}`)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Registros de Ponto</h1>
          <p className="text-gray-500 text-sm mt-1">{records.length} registros encontrados</p>
        </div>
        <button onClick={fetchRecords} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-rose-500" />
          <span className="font-semibold text-sm text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Funcionária</label>
            <select value={filters.user_id}
              onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
              className="input-field py-2 text-sm">
              <option value="">Todas</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
            <input type="date" value={filters.start_date}
              onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
              className="input-field py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
            <input type="date" value={filters.end_date}
              onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
              className="input-field py-2 text-sm" />
          </div>
        </div>
        <button onClick={fetchRecords} className="btn-primary mt-3 py-2 text-sm flex items-center gap-2">
          <Search className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Funcionária</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horário</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Obs.</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum registro encontrado</td></tr>
              ) : (
                records.map(record => {
                  const typeInfo = typeLabels[record.type] || { label: record.type, color: 'badge-gray' }
                  return (
                    <tr key={record.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs flex-shrink-0">
                            {record.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800 text-sm">{record.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={typeInfo.color}>{typeInfo.label}</span>
                        {record.is_adjusted === 1 && (
                          <span className="ml-1 badge bg-purple-100 text-purple-600">Ajustado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{record.date}</td>
                      <td className="px-6 py-4 font-mono text-gray-800 text-sm font-semibold">
                        {record.timestamp?.slice(11, 16)}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{record.notes || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(record.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
