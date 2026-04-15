import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { CheckCircle, XCircle, Clock, RefreshCw, X } from 'lucide-react'

const typeLabels = {
  entrada: 'Entrada', saida: 'Saída',
  inicio_pausa: 'Início de Pausa', fim_pausa: 'Fim de Pausa'
}

function ReviewModal({ request, onClose, onReviewed }) {
  const [status, setStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!status) return setError('Selecione aprovar ou rejeitar')
    setSaving(true)
    try {
      await api.put(`/adjustments/${request.id}`, { status, admin_notes: adminNotes })
      onReviewed()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-lg shadow-beauty-lg animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-display font-semibold text-lg text-gray-800">Analisar Solicitação</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Detalhes da solicitação */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Funcionária:</span>
              <span className="font-semibold text-gray-800">{request.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Data:</span>
              <span className="font-semibold text-gray-800">{request.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tipo:</span>
              <span className="font-semibold text-gray-800">{typeLabels[request.record_type] || request.record_type}</span>
            </div>
            {request.original_timestamp && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Horário original:</span>
                <span className="font-mono text-red-600">{request.original_timestamp?.slice(11, 16)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Horário solicitado:</span>
              <span className="font-mono text-green-600 font-bold">{request.requested_timestamp?.slice(11, 16)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Justificativa:</p>
              <p className="text-sm text-gray-700 italic">"{request.reason}"</p>
            </div>
          </div>

          {/* Decisão */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Decisão</label>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('approved')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                  status === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Aprovar
              </button>
              <button
                onClick={() => setStatus('rejected')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                  status === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Rejeitar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observação do Admin (opcional)</label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
              rows={2} placeholder="Adicione uma observação..."
              className="input-field resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving || !status}
              className="btn-primary flex-1">
              {saving ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAdjustments() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [reviewRequest, setReviewRequest] = useState(null)

  useEffect(() => { fetchRequests() }, [filter])

  async function fetchRequests() {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await api.get(`/adjustments/all${params}`)
      setRequests(data)
    } catch {} finally { setLoading(false) }
  }

  const statusInfo = {
    pending: { label: 'Pendente', color: 'badge-yellow' },
    approved: { label: 'Aprovado', color: 'badge-green' },
    rejected: { label: 'Rejeitado', color: 'badge-red' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Solicitações de Ajuste</h1>
          <p className="text-gray-500 text-sm mt-1">{requests.length} solicitações</p>
        </div>
        <button onClick={fetchRequests} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Filtro por status */}
      <div className="flex gap-2">
        {[['pending', 'Pendentes'], ['approved', 'Aprovados'], ['rejected', 'Rejeitados'], ['all', 'Todos']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === val ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 hover:bg-rose-50 border border-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Listagem */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="card p-12 text-center">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          requests.map(req => {
            const info = statusInfo[req.status] || statusInfo.pending
            return (
              <div key={req.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm flex-shrink-0">
                      {req.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-800">{req.full_name}</span>
                        <span className={info.color}>{info.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {req.date} · {typeLabels[req.record_type] || req.record_type}
                        {req.original_timestamp && (
                          <span className="text-red-500"> {req.original_timestamp.slice(11, 16)}</span>
                        )}
                        <span className="text-gray-400"> → </span>
                        <span className="text-green-600 font-semibold">{req.requested_timestamp?.slice(11, 16)}</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1 italic">"{req.reason}"</p>
                      {req.admin_notes && (
                        <p className="text-xs text-gray-500 mt-1">Obs. Admin: {req.admin_notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Solicitado em {req.created_at?.slice(0, 16)}</p>
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <button onClick={() => setReviewRequest(req)}
                      className="btn-primary py-2 px-4 text-sm flex-shrink-0">
                      Analisar
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {reviewRequest && (
        <ReviewModal
          request={reviewRequest}
          onClose={() => setReviewRequest(null)}
          onReviewed={fetchRequests}
        />
      )}
    </div>
  )
}
