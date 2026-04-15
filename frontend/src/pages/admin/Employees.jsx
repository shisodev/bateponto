import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Plus, Pencil, Trash2, UserCheck, UserX, X, Search } from 'lucide-react'

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-beauty-lg animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-display font-semibold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'employee' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data } = await api.get('/users')
      setEmployees(data)
    } catch { } finally { setLoading(false) }
  }

  function openCreate() {
    setEditingEmployee(null)
    setForm({ username: '', password: '', full_name: '', role: 'employee' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(emp) {
    setEditingEmployee(emp)
    setForm({ username: emp.username, password: '', full_name: emp.full_name, role: emp.role })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    setFormError('')
    if (!form.full_name.trim()) return setFormError('Nome completo é obrigatório')
    if (!editingEmployee && (!form.username.trim() || !form.password.trim())) {
      return setFormError('Usuário e senha são obrigatórios')
    }
    setSaving(true)
    try {
      if (editingEmployee) {
        await api.put(`/users/${editingEmployee.id}`, form)
      } else {
        await api.post('/users', form)
      }
      await fetchEmployees()
      setShowModal(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function toggleActive(emp) {
    try {
      await api.put(`/users/${emp.id}`, { active: emp.active ? 0 : 1 })
      await fetchEmployees()
    } catch {}
  }

  async function handleDelete(emp) {
    if (!confirm(`Excluir "${emp.full_name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/users/${emp.id}`)
      await fetchEmployees()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Funcionárias</h1>
          <p className="text-gray-500 text-sm mt-1">{employees.filter(e => e.role === 'employee').length} funcionárias cadastradas</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Funcionária
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou usuário..."
          className="input-field pl-11"
        />
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma funcionária encontrada</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm flex-shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{emp.username}</td>
                    <td className="px-6 py-4">
                      <span className={emp.role === 'admin' ? 'badge-rose' : 'badge-blue'}>
                        {emp.role === 'admin' ? 'Admin' : 'Funcionária'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={emp.active ? 'badge-green' : 'badge-gray'}>
                        {emp.active ? '● Ativa' : '○ Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{emp.created_at?.slice(0, 10)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(emp)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleActive(emp)}
                          className={`p-2 rounded-lg transition-colors ${emp.active ? 'hover:bg-orange-50 text-orange-500' : 'hover:bg-green-50 text-green-500'}`}
                          title={emp.active ? 'Desativar' : 'Ativar'}>
                          {emp.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        {emp.role !== 'admin' && (
                          <button onClick={() => handleDelete(emp)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingEmployee ? `Editar: ${editingEmployee.full_name}` : 'Nova Funcionária'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo *</label>
              <input type="text" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Ex: Maria Silva" className="input-field" />
            </div>
            {!editingEmployee && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usuário *</label>
                <input type="text" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Ex: maria.silva" className="input-field" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {editingEmployee ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
              </label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingEmployee ? 'Nova senha...' : 'Senha de acesso'} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Perfil</label>
              <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="input-field">
                <option value="employee">Funcionária</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {formError && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Salvando...' : editingEmployee ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
