import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Injeta o token em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('mg_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login em caso de 401/403
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const msg = error.response.data?.error || ''
      if (msg.includes('Token') || msg.includes('expirado')) {
        localStorage.removeItem('mg_token')
        localStorage.removeItem('mg_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
