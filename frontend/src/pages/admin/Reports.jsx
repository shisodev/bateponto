import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { FileDown, Search, BarChart3, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const typeLabels = {
  entrada: 'Entrada', saida: 'Saída',
  inicio_pausa: 'Início Pausa', fim_pausa: 'Fim Pausa'
}

export default function AdminReports() {
  const [employees, setEmployees] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.role === 'employee'))
    } catch {}
  }

  async function fetchReport() {
    if (!selectedUser) return alert('Selecione uma funcionária')
    setLoading(true)
    try {
      const { data } = await api.get(`/reports/mirror?user_id=${selectedUser}&start_date=${startDate}&end_date=${endDate}`)
      setReport(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar relatório')
    } finally { setLoading(false) }
  }

  function exportPDF() {
    if (!report) return
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFillColor(244, 63, 116)
    doc.rect(0, 0, 220, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('MG Bate-Ponto', 14, 14)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Espelho de Ponto', 14, 22)
    doc.setFontSize(10)
    doc.text(`${report.user?.full_name} | ${startDate} a ${endDate}`, 14, 30)

    // Resumo
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(`Total de dias: ${report.summary?.total_days}`, 14, 45)
    doc.text(`Total de horas trabalhadas: ${report.summary?.total_hours_formatted}`, 14, 52)

    // Tabela
    const rows = []
    for (const day of report.days) {
      for (const r of day.records) {
        rows.push([
          day.date,
          typeLabels[r.type] || r.type,
          r.timestamp?.slice(11, 16),
          r.is_adjusted ? 'Sim' : 'Não',
          r.notes || ''
        ])
      }
      rows.push([day.date, '---', '---', '', `Trabalhado: ${day.worked_hours}`])
    }

    autoTable(doc, {
      startY: 60,
      head: [['Data', 'Tipo', 'Horário', 'Ajustado', 'Obs.']],
      body: rows,
      headStyles: { fillColor: [244, 63, 116], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 245, 248] },
    })

    doc.save(`espelho-ponto-${report.user?.username}-${startDate}-${endDate}.pdf`)
  }

  function exportExcel() {
    if (!report) return
    const rows = [['Data', 'Tipo', 'Horário', 'Ajustado', 'Horas Trabalhadas', 'Observação']]
    for (const day of report.days) {
      for (const r of day.records) {
        rows.push([day.date, typeLabels[r.type] || r.type, r.timestamp?.slice(11, 16), r.is_adjusted ? 'Sim' : 'Não', day.worked_hours, r.notes || ''])
      }
    }
    rows.push([])
    rows.push(['Total de dias', report.summary?.total_days])
    rows.push(['Total de horas', report.summary?.total_hours_formatted])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Espelho de Ponto')
    XLSX.writeFile(wb, `espelho-ponto-${report.user?.username}-${startDate}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Espelho de ponto e relatórios por período</p>
      </div>

      {/* Filtros */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-500" />
          Gerar Relatório
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Funcionária</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="input-field">
              <option value="">Selecione...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
          </div>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="btn-primary flex items-center gap-2">
          <Search className="w-4 h-4" />
          {loading ? 'Gerando...' : 'Gerar Relatório'}
        </button>
      </div>

      {/* Resultado */}
      {report && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg text-gray-800">{report.user?.full_name}</h3>
                <p className="text-gray-500 text-sm">{startDate} até {endDate}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportPDF}
                  className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button onClick={exportExcel}
                  className="btn-gold py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-rose-600">{report.summary?.total_days}</p>
                <p className="text-xs text-gray-500 mt-1">Dias trabalhados</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{report.summary?.total_hours_formatted}</p>
                <p className="text-xs text-gray-500 mt-1">Total de horas</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {report.days.length > 0
                    ? `${Math.round(report.summary.total_minutes / Math.max(report.summary.total_days, 1) / 60)}h`
                    : '—'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">Média diária</p>
              </div>
            </div>
          </div>

          {/* Tabela de dias */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Entrada</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Saída</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Horas</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.days.map(day => (
                    <tr key={day.date} className="table-row-hover">
                      <td className="px-6 py-4 font-medium text-gray-800 text-sm">{day.date}</td>
                      <td className="px-6 py-4 font-mono text-green-600 font-semibold text-sm">
                        {day.entry_time || '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-red-500 font-semibold text-sm">
                        {day.exit_time || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          {day.worked_hours}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {day.records.map(r => (
                            <span key={r.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {typeLabels[r.type]?.slice(0, 3)} {r.timestamp?.slice(11, 16)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
