import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(email.trim(), password)
      // El AuthProvider detecta el cambio de sesión automáticamente
      // y App.jsx renderiza la app protegida sin necesidad de redirigir manualmente
    } catch (err) {
      // Supabase devuelve mensajes en inglés; los mapeamos a español
      const msg = err.message ?? ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos. Verificá tus datos.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Tu cuenta aún no fue confirmada. Revisá tu casilla de correo.')
      } else if (msg.includes('Too many requests')) {
        setError('Demasiados intentos. Esperá unos minutos antes de volver a intentar.')
      } else {
        setError(msg || 'Error al iniciar sesión. Intentá de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Gestión UTI</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresá con tus credenciales institucionales</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4"
        >
          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="usuario@hospital.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2.5 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón de ingreso */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-hospital-disponible hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            {cargando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ingresando...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Sistema de Gestión Hospitalaria · UTI
        </p>
      </div>
    </div>
  )
}
