import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Sparkles } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username.trim(), password)
    setLoading(false)
    if (result.success) {
      navigate(result.user.role === 'admin' ? '/admin' : '/employee', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #fff1f5 0%, #fce7f3 40%, #fae8ff 100%)' }}>
      {/* Painel esquerdo – decorativo */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #f43f74 0%, #9b4c6d 60%, #7e22ce 100%)' }}>

        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute top-1/3 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 w-56 h-56 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-white/80 font-medium text-lg">MG Beauty</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Controle de<br />
            Ponto<br />
            <span className="text-gold-300">Elegante</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-xs">
            Sistema exclusivo para gerenciar a jornada de trabalho da sua equipe com sofisticação.
          </p>
        </div>

        <div className="relative z-10 flex gap-4">
          {['Entrada', 'Pausa', 'Saída'].map(label => (
            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <span className="text-white text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito – formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3"
              style={{ background: 'linear-gradient(135deg, #f43f74, #9b4c6d)' }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-800">MG Bate-Ponto</h2>
          </div>

          <div className="card p-8 shadow-beauty-lg">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold text-gray-800 mb-2">Bem-vinda! ✨</h2>
              <p className="text-gray-500">Faça login para registrar seu ponto</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <span className="text-red-500 text-lg">⚠</span>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="input-field"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="input-field pr-12"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Entrar
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-400">
                MG Bate-Ponto &copy; {new Date().getFullYear()} &mdash; Sistema de Controle de Ponto
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
