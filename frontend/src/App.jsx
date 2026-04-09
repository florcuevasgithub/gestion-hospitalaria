import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import IngresoPaciente from './views/IngresoPaciente'

function App() {
  const { session, user, logout } = useAuth()
  const [vista, setVista] = useState('dashboard')
  const [camaPreseleccionada, setCamaPreseleccionada] = useState(null)

  // ── Pantalla de carga mientras Supabase resuelve la sesión inicial ──────────
  // session === undefined significa que aún no se resolvió (getSession en curso)
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Sin sesión: mostrar únicamente el Login ─────────────────────────────────
  if (!session) {
    return <Login />
  }

  // ── Con sesión: app protegida ───────────────────────────────────────────────
  const irAIngreso = (camaId = null) => {
    setCamaPreseleccionada(camaId)
    setVista('ingreso')
  }

  const irADashboard = () => {
    setCamaPreseleccionada(null)
    setVista('dashboard')
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Barra de navegación ── */}
      <nav className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center gap-6">
        <span className="text-white font-semibold text-sm tracking-tight mr-4">🏥 UTI</span>

        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'ingreso',   label: 'Nuevo Ingreso' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => key === 'ingreso' ? irAIngreso() : irADashboard()}
            className={`text-sm transition-colors ${
              vista === key ? 'text-white font-medium' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Espaciador */}
        <div className="flex-1" />

        {/* Usuario + Cerrar sesión */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[180px]">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-900 rounded-lg px-3 py-1.5"
            title="Cerrar sesión"
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </nav>

      {/* ── Vistas ── */}
      {vista === 'dashboard' && (
        <Dashboard onIrAIngreso={irAIngreso} />
      )}
      {vista === 'ingreso' && (
        <IngresoPaciente camaPreseleccionada={camaPreseleccionada} onVolver={irADashboard} />
      )}
    </div>
  )
}

export default App
