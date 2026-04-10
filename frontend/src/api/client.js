import axios from 'axios'
import { supabase } from '../lib/supabase'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de peticiones: obtiene el JWT real de la sesión activa de Supabase
// y lo inyecta en cada request. Si no hay sesión, el backend devolverá 401.
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de respuestas: centraliza el manejo de errores HTTP.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail ?? error.message

    if (status === 401) {
      console.error('[API] Sesión expirada o no autorizado.')
    } else if (status === 404) {
      console.error(`[API] Recurso no encontrado: ${detail}`)
    } else if (status >= 500) {
      console.error(`[API] Error del servidor: ${detail}`)
    }

    return Promise.reject(error)
  }
)

export default apiClient
