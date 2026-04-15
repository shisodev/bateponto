import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Send, Clock, CheckCircle, XCircle, Hourglass } from 'lucide-react'
import { format } from 'date-fns'

const typeOptions = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'inicio_pausa', label: 'Início de Pausa' },
  { value: 'fim_pausa', label: 'Fim de Pausa' },
]

const statusConfig = {
  pending: { label: 'Aguardando', icon: Hourglass, color: 'text-yellow-600 bg-yellow-50', border: 'border-yellow-200' },
  approved: { label: 'Aprovado', icon: CheckCircle, color: 'text-green-600 bg-green-50', border: 'border-green-200' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'text-red-600 bg-red-50', border: 'border-red-200' },
}

const typeLabels = {
  entrada: 'Entrada', saida: 'Saída',
  inicio_pausa: 'Início de Pausa', fim_pausa: 'Fim de Pausa'
}

export default function EmployeeAdjustments() {
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    record_type: 'entrada',
    requested_timestamp: '',
    reason: ''
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchMyRequests() }, [])

  async function fetchMyRequests() {
    try {
      const { data } = await api.get('/adjustments/my')
      setMyRequests(data)
    } catch {} finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.requested_timestamp) return setError('Informe o horário solicitado')
    if (!form.reason.trim()) return setError('A justificativa é obrigatória')

    setSending(true)
    try {
      const timestamp = `${form.date} ${form.requested_timestamp}:00`
      await api.post('/adjustments', {
        record_type: form.record_type,
        requested_timestamp: timestamp,
        date: form.date,
        reason: form.reason
      })
      setSuccess('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.')
      setForm(f => ({ ...f, requested_timestamp: '', reason: '' }))
      await fetchMyRequests()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar solicitação')
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-800">Solicitar Ajuste</h1>
        <p className="text-gray-500 text-sm mt-1">Solicite correções no seu registro de ponto</p>
      </div>

      {/* Formulário */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-rose-500" />
          Nova Solicitação
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data *</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Registro *</label>
              <select value={form.record_type}
                onChange={e => setForm(f => ({ ...f, record_type: e.target.value }))}
                className="input-field">
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário Correto *</label>
            <input type="time" value={form.requested_timestamp}
              onChange={e => setForm(f => ({ ...f, requested_timestamp: e.target.value }))}
              className="input-field" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Justificativa *</label>
            <textarea value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
              placeholder="Explique o motivo da correção (ex: esqueci de registrar, sistema estava fora do ar...)"
              className="input-field resize-none"
              required />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar Solicitação</>
            )}
          </button>
        </form>
      </div>

      {/* Minhas solicitações */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-500" />
          Minhas Solicitações
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : myRequests.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nenhuma solicitação ainda</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map(req => {
              const conf = statusConfig[req.status] || statusConfig.pending
              const Icon = conf.icon
              return (
                <div key={req.id} className={`p-4 rounded-xl border ${conf.border} ${conf.color}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">
                          {typeLabels[req.record_type] || req.record_type} em {req.date}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                          Horário solicitado: <span className="font-mono font-bold">{req.requested_timestamp?.slice(11, 16)}</span>
                        </p>
                        <p className="text-xs mt-1 opacity-70 italic">"{req.reason}"</p>
                        {req.admin_notes && (
                          <p className="text-xs mt-1 font-medium">Admin: {req.admin_notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0 opacity-80">{conf.label}</span>
                  </div>
                  <p className="text-xs opacity-50 mt-2">Enviado em {req.created_at?.slice(0, 16)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
