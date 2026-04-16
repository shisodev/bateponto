import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import {
  FileDown, Search, BarChart3, Clock, TrendingUp, TrendingDown,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── Constantes ────────────────────────────────────────────────────────────────

const typeLabels = {
  entrada: 'Entrada', saida: 'Saída',
  inicio_pausa: 'Início Pausa', fim_pausa: 'Fim Pausa',
}

const OBS_ROW_BG = {
  Falta:           'bg-red-50',
  Atestado:        'bg-yellow-50',
  'Ajuste Aprovado': 'bg-blue-50',
  Normal:          '',
}

const OBS_BADGE = {
  Falta:           'bg-red-100 text-red-700',
  Atestado:        'bg-yellow-100 text-yellow-700',
  'Ajuste Aprovado': 'bg-blue-100 text-blue-700',
  Normal:          'bg-gray-100 text-gray-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function BalanceBadge({ minutes, formatted }) {
  if (minutes === 0) {
    return <span className="text-xs font-semibold text-gray-400">0h 00m</span>
  }
  if (minutes > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" />{formatted}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" />{formatted}
    </span>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminReports() {
  const [employees, setEmployees]     = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [startDate, setStartDate]     = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate]         = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [periodMode, setPeriodMode]   = useState('month')
  const [report, setReport]           = useState(null)      // espelho de ponto
  const [bankHours, setBankHours]     = useState(null)      // banco de horas
  const [loading, setLoading]         = useState(false)
  const [loadingType, setLoadingType] = useState(null)      // 'mirror' | 'bank'

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data.filter(e => e.role === 'employee'))
    } catch {}
  }

  // ── Atalhos de período ─────────────────────────────────────────────────────

  function applyPeriod(mode) {
    setPeriodMode(mode)
    const today = format(new Date(), 'yyyy-MM-dd')
    if (mode === 'today') {
      setStartDate(today); setEndDate(today)
    } else if (mode === '7d') {
      setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd')); setEndDate(today)
    } else if (mode === '15d') {
      setStartDate(format(subDays(new Date(), 14), 'yyyy-MM-dd')); setEndDate(today)
    } else if (mode === 'month') {
      setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    }
    // 'custom' — não altera as datas, só muda o badge
  }

  // ── Buscar relatórios ──────────────────────────────────────────────────────

  async function fetchMirrorReport() {
    if (!selectedUser) return alert('Selecione uma funcionária')
    setLoading(true); setLoadingType('mirror')
    setReport(null); setBankHours(null)
    try {
      const { data } = await api.get(
        `/reports/mirror?user_id=${selectedUser}&start_date=${startDate}&end_date=${endDate}`
      )
      setReport(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar relatório')
    } finally { setLoading(false); setLoadingType(null) }
  }

  async function fetchBankHoursReport() {
    if (!selectedUser) return alert('Selecione uma funcionária')
    setLoading(true); setLoadingType('bank')
    setReport(null); setBankHours(null)
    try {
      const { data } = await api.get(
        `/reports/bank-hours?user_id=${selectedUser}&start_date=${startDate}&end_date=${endDate}`
      )
      setBankHours(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar banco de horas')
    } finally { setLoading(false); setLoadingType(null) }
  }

  // ── Exportar PDF (Espelho) ─────────────────────────────────────────────────

  function exportPDF() {
    if (!report) return
    const doc = new jsPDF()
    doc.setFillColor(244, 63, 116)
    doc.rect(0, 0, 220, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('MG Bate-Ponto', 14, 14)
    doc.setFontSize(12); doc.setFont('helvetica', 'normal')
    doc.text('Espelho de Ponto', 14, 22)
    doc.setFontSize(10)
    doc.text(`${report.user?.full_name} | ${startDate} a ${endDate}`, 14, 30)
    doc.setTextColor(0, 0, 0); doc.setFontSize(11)
    doc.text(`Total de dias: ${report.summary?.total_days}`, 14, 45)
    doc.text(`Total de horas trabalhadas: ${report.summary?.total_hours_formatted}`, 14, 52)

    const rows = []
    for (const day of report.days) {
      for (const r of day.records) {
        rows.push([day.date, typeLabels[r.type] || r.type, r.timestamp?.slice(11, 16), r.is_adjusted ? 'Sim' : 'Não', r.notes || ''])
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

  // ── Exportar Excel (Espelho) ───────────────────────────────────────────────

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

  // ── Exportar PDF (Banco de Horas) ──────────────────────────────────────────

  function exportBankPDF() {
    if (!bankHours) return
    const bh = bankHours
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFillColor(244, 63, 116)
    doc.rect(0, 0, 300, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('MG Bate-Ponto', 14, 14)
    doc.setFontSize(12); doc.setFont('helvetica', 'normal')
    doc.text('Banco de Horas', 14, 22)
    doc.setFontSize(10)
    doc.text(`${bh.user?.full_name} | ${startDate} a ${endDate}`, 14, 30)
    doc.setTextColor(0, 0, 0); doc.setFontSize(9)
    const s = bh.summary
    doc.text(
      `Dias escalados: ${s.total_scheduled_days}  |  Trabalhados: ${s.total_worked_days}  |  Faltas: ${s.total_absences}`,
      14, 44
    )
    doc.text(
      `Esperado: ${s.total_expected_formatted}  |  Trabalhado: ${s.total_worked_formatted}  |  Saldo: ${s.balance_formatted}`,
      14, 51
    )
    autoTable(doc, {
      startY: 58,
      head: [['Data', 'Dia', 'Escala', 'Entrada', 'Saída', 'Esperado', 'Trabalhado', 'Saldo', 'Obs.']],
      body: bh.days.map(d => [
        d.date, d.weekday,
        `${d.schedule.start_time} – ${d.schedule.end_time}`,
        d.entry_time || '—', d.exit_time || '—',
        d.expected_formatted, d.worked_formatted,
        d.balance_formatted, d.observation,
      ]),
      headStyles: { fillColor: [244, 63, 116], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 245, 248] },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 7) {
          const v = data.cell.raw
          if (typeof v === 'string' && v.startsWith('+') && v !== '+0h 00m') {
            data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'
          } else if (typeof v === 'string' && v.startsWith('-')) {
            data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'
          }
        }
        if (data.section === 'body' && data.column.index === 8) {
          if (data.cell.raw === 'Falta') data.cell.styles.textColor = [185, 28, 28]
          if (data.cell.raw === 'Atestado') data.cell.styles.textColor = [161, 98, 7]
        }
      },
    })
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    if (s.balance_minutes >= 0) {
      doc.setTextColor(21, 128, 61)
      doc.text(`Funcionária tem ${s.balance_formatted} disponíveis`, 14, finalY)
    } else {
      doc.setTextColor(185, 28, 28)
      doc.text(`Funcionária está devendo ${s.balance_formatted.replace('-', '')}`, 14, finalY)
    }
    doc.save(`banco-horas-${bh.user?.username}-${startDate}-${endDate}.pdf`)
  }

  // ── Exportar Excel (Banco de Horas) ───────────────────────────────────────

  function exportBankExcel() {
    if (!bankHours) return
    const bh = bankHours
    const s = bh.summary
    const rows = [
      [`Banco de Horas — ${bh.user?.full_name}`],
      [`Período: ${startDate} a ${endDate}`],
      [],
      ['Data', 'Dia', 'Escala', 'Entrada Real', 'Saída Real', 'Esperado', 'Trabalhado', 'Saldo', 'Observação'],
      ...bh.days.map(d => [
        d.date, d.weekday,
        `${d.schedule.start_time} – ${d.schedule.end_time}`,
        d.entry_time || '—', d.exit_time || '—',
        d.expected_formatted, d.worked_formatted,
        d.balance_formatted, d.observation,
      ]),
      [],
      ['Resumo'],
      ['Dias escalados', s.total_scheduled_days],
      ['Dias trabalhados', s.total_worked_days],
      ['Faltas', s.total_absences],
      ['Horas esperadas', s.total_expected_formatted],
      ['Horas trabalhadas', s.total_worked_formatted],
      ['Saldo', s.balance_formatted],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Banco de Horas')
    XLSX.writeFile(wb, `banco-horas-${bh.user?.username}-${startDate}-${endDate}.xlsx`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Espelho de ponto, banco de horas e exportação</p>
      </div>

      {/* ── Filtros ── */}
      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-500" />
          Configurar Relatório
        </h3>

        {/* Funcionária */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Funcionária</label>
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
            className="input-field max-w-sm">
            <option value="">Selecione...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>

        {/* Período — atalhos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Período</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { id: 'today',  label: 'Hoje'        },
              { id: '7d',     label: '7 Dias'       },
              { id: '15d',    label: '15 Dias'      },
              { id: 'month',  label: 'Mês Atual'    },
              { id: 'custom', label: 'Personalizado' },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => applyPeriod(id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  periodMode === id
                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Datas (sempre visíveis) */}
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">De</label>
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setPeriodMode('custom') }}
                className="input-field py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Até</label>
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setPeriodMode('custom') }}
                className="input-field py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Botões gerar */}
        <div className="flex flex-wrap gap-3">
          <button onClick={fetchMirrorReport} disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Search className="w-4 h-4" />
            {loadingType === 'mirror' ? 'Gerando...' : 'Espelho de Ponto'}
          </button>
          <button onClick={fetchBankHoursReport} disabled={loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <Clock className="w-4 h-4" />
            {loadingType === 'bank' ? 'Gerando...' : 'Banco de Horas'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ESPELHO DE PONTO
      ══════════════════════════════════════════════════════════ */}
      {report && (
        <div className="space-y-4">
          {/* Cabeçalho + resumo */}
          <div className="card p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-gray-800">{report.user?.full_name}</h3>
                <p className="text-gray-500 text-sm">{startDate} até {endDate} · Espelho de Ponto</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportPDF}
                  className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />PDF
                </button>
                <button onClick={exportExcel}
                  className="btn-gold py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />Excel
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
                    : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Média diária</p>
              </div>
            </div>
          </div>

          {/* Tabela espelho */}
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
                      <td className="px-6 py-4 font-mono text-green-600 font-semibold text-sm">{day.entry_time || '—'}</td>
                      <td className="px-6 py-4 font-mono text-red-500 font-semibold text-sm">{day.exit_time || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />{day.worked_hours}
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

      {/* ══════════════════════════════════════════════════════════
          BANCO DE HORAS
      ══════════════════════════════════════════════════════════ */}
      {bankHours && (
        <div className="space-y-4">
          {/* Cabeçalho + resumo */}
          <div className="card p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-gray-800">{bankHours.user?.full_name}</h3>
                <p className="text-gray-500 text-sm">{startDate} até {endDate} · Banco de Horas</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportBankPDF}
                  className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />PDF
                </button>
                <button onClick={exportBankExcel}
                  className="btn-gold py-2 px-3 flex items-center gap-1.5 text-sm">
                  <FileDown className="w-4 h-4" />Excel
                </button>
              </div>
            </div>

            {/* Cards resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
              {[
                { label: 'Dias c/ Escala',    value: bankHours.summary.total_scheduled_days,     cls: 'bg-rose-50 text-rose-600'  },
                { label: 'Dias Trabalhados',   value: bankHours.summary.total_worked_days,         cls: 'bg-blue-50 text-blue-600'  },
                { label: 'Faltas',             value: bankHours.summary.total_absences,            cls: 'bg-red-50 text-red-600'    },
                { label: 'Hrs Esperadas',      value: bankHours.summary.total_expected_formatted,  cls: 'bg-gray-50 text-gray-700'  },
                { label: 'Hrs Trabalhadas',    value: bankHours.summary.total_worked_formatted,    cls: 'bg-green-50 text-green-700'},
                {
                  label: 'Saldo',
                  value: bankHours.summary.balance_formatted,
                  cls: bankHours.summary.balance_minutes >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`${cls} rounded-xl p-3 text-center`}>
                  <p className="text-lg font-bold leading-tight">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela dia a dia */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dia</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Escala Esperada</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entrada</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Saída</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Esperado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trabalhado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bankHours.days.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400">
                        Nenhum dia com escala no período selecionado
                      </td>
                    </tr>
                  ) : bankHours.days.map(day => (
                    <tr key={day.date}
                      className={`transition-colors ${OBS_ROW_BG[day.observation] || 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{day.date}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{day.weekday}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {day.schedule.start_time} – {day.schedule.end_time}
                        {day.schedule.break_start && (
                          <span className="text-amber-600 ml-1">· ☕ {day.schedule.break_start}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-green-600">
                        {day.entry_time || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-red-500">
                        {day.exit_time || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{day.expected_formatted}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{day.worked_formatted}</td>
                      <td className="px-4 py-3">
                        <BalanceBadge minutes={day.balance_minutes} formatted={day.balance_formatted} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${OBS_BADGE[day.observation] || 'bg-gray-100 text-gray-500'}`}>
                          {day.observation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé — saldo final */}
          <div className={`card p-6 flex items-center gap-4 border-2 ${
            bankHours.summary.balance_minutes >= 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {bankHours.summary.balance_minutes >= 0
              ? <TrendingUp  className="w-8 h-8 text-green-600 flex-shrink-0" />
              : <TrendingDown className="w-8 h-8 text-red-600 flex-shrink-0" />
            }
            <div>
              <p className={`text-2xl font-bold font-display ${
                bankHours.summary.balance_minutes >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {bankHours.summary.balance_formatted}
              </p>
              <p className={`text-sm mt-0.5 ${
                bankHours.summary.balance_minutes >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {bankHours.summary.balance_minutes >= 0
                  ? `${bankHours.user?.full_name} tem ${bankHours.summary.balance_formatted} disponíveis no período`
                  : `${bankHours.user?.full_name} está devendo ${bankHours.summary.balance_formatted.replace('-', '')} no período`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
