import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BedDouble,
  HeartPulse,
  Skull,
  RefreshCw,
  AlertCircle,
  Clock,
  X,
  SprayCan,
  LogOut,
  Wrench,
  CheckCircle,
  PlusCircle,
} from 'lucide-react'
import { getDashboardStats, getDiagnosticosPrevalentes } from '../api/dashboardService'
import { getOpciones, getCatalogoCIE10 } from '../api/metadataService'
import { registrarEgreso, actualizarEstadoCama, getCamasDisponibles } from '../api/internacionesService'

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIODOS = [
  { value: 'day',   label: 'Hoy' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

const COLOR_ESTADO = {
  Disponible:    'bg-hospital-disponible',
  Ocupada:       'bg-hospital-ocupada',
  Limpieza:      'bg-hospital-limpieza',
  Mantenimiento: 'bg-hospital-mantenimiento',
}

const LABEL_ESTADO = {
  Disponible:    'Disponible',
  Ocupada:       'Ocupada',
  Limpieza:      'Limpieza',
  Mantenimiento: 'Mant.',
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard({ onIrAIngreso = () => {} }) {
  const [periodo, setPeriodo] = useState('month')
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Estado de modales
  const [modalEgreso, setModalEgreso] = useState(null)        // { cama, paciente }
  const [modalLimpieza, setModalLimpieza] = useState(null)    // { cama }
  const [modalDisponible, setModalDisponible] = useState(null) // { cama }
  const [modalMantenimiento, setModalMantenimiento] = useState(null) // { cama }

  // Estado de diagnósticos prevalentes y catálogo CIE-10
  const [diagnosticos, setDiagnosticos] = useState([])
  const [catalogoCIE10, setCatalogoCIE10] = useState({})
  const [cargandoDiagnosticos, setCargandoDiagnosticos] = useState(false)

  const cargarStats = useCallback(async (p) => {
    setCargando(true)
    setError(null)
    try {
      const data = await getDashboardStats(p)
      setStats(data)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarDiagnosticos = useCallback(async () => {
    setCargandoDiagnosticos(true)
    try {
      const [resultRanking, resultCatalogo] = await Promise.allSettled([
        getDiagnosticosPrevalentes(),
        getCatalogoCIE10(),
      ])
      if (resultRanking.status === 'fulfilled') {
        setDiagnosticos(resultRanking.value.ranking ?? [])
      }
      if (resultCatalogo.status === 'fulfilled') {
        setCatalogoCIE10(resultCatalogo.value)
      }
    } catch {
      // silencioso — cada rama ya maneja su propio error arriba
    } finally {
      setCargandoDiagnosticos(false)
    }
  }, [])

  useEffect(() => {
    cargarStats(periodo)
  }, [periodo, cargarStats])

  useEffect(() => {
    // Espera 500ms para asegurar que la sesión JWT esté lista antes de llamar
    const t = setTimeout(() => cargarDiagnosticos(), 500)
    return () => clearTimeout(t)
  }, [cargarDiagnosticos])

  const pacientesPorCama = stats
    ? Object.fromEntries(
        (stats.pacientes_actuales ?? []).map((p) => [p.codigo_cama, p])
      )
    : {}

  // ── Handlers de click en camas ──────────────────────────────────────────
  const handleCamaClick = (cama) => {
    const paciente = pacientesPorCama[cama.codigo_cama]

    if (cama.estado === 'Ocupada' && paciente) {
      setModalEgreso({ cama, paciente })
    } else if (cama.estado === 'Limpieza') {
      setModalLimpieza({ cama })
    } else if (cama.estado === 'Disponible') {
      setModalDisponible({ cama })
    } else if (cama.estado === 'Mantenimiento') {
      setModalMantenimiento({ cama })
    }
  }

  // Tras una acción exitosa, cierra todos los modales y recarga stats
  const onAccionExitosa = () => {
    setModalEgreso(null)
    setModalLimpieza(null)
    setModalDisponible(null)
    setModalMantenimiento(null)
    cargarStats(periodo)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-8">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard UTI</h1>
          <p className="text-gray-400 text-sm mt-0.5">Estado en tiempo real de la Unidad de Terapia Intensiva</p>
        </div>

        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodo === p.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => cargarStats(periodo)}
            className="ml-1 p-1.5 text-gray-500 hover:text-white transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Error global ── */}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              icon={<BedDouble size={20} />}
              label="Ocupación"
              value={`${stats.camas.ocupacion_porcentaje}%`}
              sub={`${stats.camas.ocupadas} / ${stats.camas.total} camas`}
              color="text-hospital-ocupada"
            />
            <KpiCard
              icon={<HeartPulse size={20} />}
              label="Internados ahora"
              value={stats.total_pacientes_internados}
              sub={`${stats.camas.disponibles} camas libres`}
              color="text-indigo-400"
            />
            <KpiCard
              icon={<Clock size={20} />}
              label="Estancia media"
              value={`${stats.kpis.comunes.promedio_estancia_dias}d`}
              sub={`KPC: ${stats.kpis.kpc.promedio_estancia_dias}d`}
              color="text-hospital-limpieza"
            />
            <KpiCard
              icon={<Skull size={20} />}
              label="Mortalidad"
              value={`${stats.kpis.comunes.tasa_mortalidad_pct}%`}
              sub={`KPC: ${stats.kpis.kpc.tasa_mortalidad_pct}%`}
              color="text-red-400"
            />
          </div>

          {/* ── Contadores de estado ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { estado: 'Disponible', count: stats.camas.disponibles },
              { estado: 'Ocupada',    count: stats.camas.ocupadas },
              { estado: 'Limpieza',   count: stats.camas.limpieza },
              { estado: 'Mantenimiento', count: stats.camas.mantenimiento },
            ].map(({ estado, count }) => (
              <div key={estado} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_ESTADO[estado]}`} />
                <div>
                  <p className="text-xs text-gray-400">{estado}</p>
                  <p className="text-lg font-semibold">{count}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Diagnósticos Prevalentes ── */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Diagnósticos Prevalentes (Top CIE-10)
            </h2>
            <DiagnosticosPrevalentes
              diagnosticos={diagnosticos}
              catalogo={catalogoCIE10}
              cargando={cargandoDiagnosticos}
            />
          </section>

          {/* ── Grilla de camas ── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Mapa de Camas
            </h2>
            <CamasGrid
              camas={stats._camas_raw ?? []}
              pacientesPorCama={pacientesPorCama}
              onCamaClick={handleCamaClick}
            />
          </section>

          {/* ── Tabla de pacientes ── */}
          {stats.pacientes_actuales?.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
                Pacientes Internados
              </h2>
              <PacientesTable pacientes={stats.pacientes_actuales} />
            </section>
          )}
        </>
      )}

      {/* ── Skeleton ── */}
      {cargando && !stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Modales ── */}
      {modalEgreso && (
        <ModalEgreso
          cama={modalEgreso.cama}
          paciente={modalEgreso.paciente}
          onClose={() => setModalEgreso(null)}
          onExito={onAccionExitosa}
        />
      )}

      {modalLimpieza && (
        <ModalLimpieza
          cama={modalLimpieza.cama}
          onClose={() => setModalLimpieza(null)}
          onExito={onAccionExitosa}
        />
      )}

      {modalDisponible && (
        <ModalDisponible
          cama={modalDisponible.cama}
          onClose={() => setModalDisponible(null)}
          onExito={onAccionExitosa}
          onIrAIngreso={() => { setModalDisponible(null); onIrAIngreso(modalDisponible.cama.id) }}
        />
      )}

      {modalMantenimiento && (
        <ModalMantenimiento
          cama={modalMantenimiento.cama}
          onClose={() => setModalMantenimiento(null)}
          onExito={onAccionExitosa}
        />
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Grilla de camas (con click) ───────────────────────────────────────────────

function CamasGrid({ camas, pacientesPorCama, onCamaClick }) {
  if (!camas || camas.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <BedDouble size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No hay datos de camas disponibles.</p>
        <p className="text-xs mt-1">Asegurate de haber cargado camas en la base de datos.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {camas.map((cama) => {
        const paciente = pacientesPorCama[cama.codigo_cama]
        const colorBg = COLOR_ESTADO[cama.estado] ?? 'bg-gray-700'
        const esInteractiva = ['Ocupada', 'Limpieza', 'Disponible', 'Mantenimiento'].includes(cama.estado)

        return (
          <div
            key={cama.id}
            onClick={() => esInteractiva && onCamaClick(cama)}
            className={`bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2 transition-all ${
              esInteractiva
                ? 'cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-gray-300">{cama.codigo_cama}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${colorBg}`}>
                {LABEL_ESTADO[cama.estado] ?? cama.estado}
              </span>
            </div>

            {cama.tipo === 'KPC' && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 rounded px-1.5 py-0.5 w-fit">
                KPC
              </span>
            )}

            {cama.estado === 'Ocupada' && paciente ? (
              <div className="mt-1">
                <p className="text-xs font-medium text-white leading-tight truncate">
                  {paciente.apellido}, {paciente.nombre}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={10} />
                  {paciente.dias_estancia} {paciente.dias_estancia === 1 ? 'día' : 'días'}
                </p>
              </div>
            ) : cama.estado === 'Ocupada' ? (
              <p className="text-[11px] text-gray-500 mt-1">Paciente sin datos</p>
            ) : cama.estado === 'Limpieza' ? (
              <p className="text-[11px] text-yellow-400 mt-1 flex items-center gap-1">
                <SprayCan size={10} /> Click para gestionar
              </p>
            ) : cama.estado === 'Disponible' ? (
              <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1">
                <PlusCircle size={10} /> Click para ingresar
              </p>
            ) : cama.estado === 'Mantenimiento' ? (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Wrench size={10} /> Click para gestionar
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ── Tabla de pacientes ────────────────────────────────────────────────────────

function PacientesTable({ pacientes }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Paciente</th>
            <th className="px-4 py-3 text-left">Cama</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-right">Días de estancia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {pacientes.map((p) => (
            <tr key={p.internacion_id} className="bg-gray-950 hover:bg-gray-900 transition-colors">
              <td className="px-4 py-3 font-medium text-white">
                {p.apellido}, {p.nombre}
              </td>
              <td className="px-4 py-3 font-mono text-gray-300">{p.codigo_cama}</td>
              <td className="px-4 py-3">
                {p.tipo_cama === 'KPC' ? (
                  <span className="text-[11px] font-bold text-yellow-400 bg-yellow-400/10 rounded px-1.5 py-0.5">KPC</span>
                ) : (
                  <span className="text-[11px] text-gray-500">Común</span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                {p.dias_estancia} {p.dias_estancia === 1 ? 'día' : 'días'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Overlay reutilizable ──────────────────────────────────────────────────────

function Overlay({ children, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      {children}
    </div>
  )
}

// ── Modal de Egreso ───────────────────────────────────────────────────────────

const TIPO_CAMBIO_CAMA = 'Cambio de Cama (Falla Técnica)'
const TIPO_DERIVACION  = 'Derivación'

function ModalEgreso({ cama, paciente, onClose, onExito }) {
  const [tipoEgreso, setTipoEgreso] = useState('')
  const [opcionesEgreso, setOpcionesEgreso] = useState([])
  const [camasDisponibles, setCamasDisponibles] = useState([])
  const [nuevaCamaId, setNuevaCamaId] = useState('')
  const [cargandoCamas, setCargandoCamas] = useState(false)
  const [hospitalDestino, setHospitalDestino] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const esCambioCama = tipoEgreso === TIPO_CAMBIO_CAMA
  const esDerivacion  = tipoEgreso === TIPO_DERIVACION

  // Carga opciones de egreso al montar
  useEffect(() => {
    getOpciones()
      .then((data) => setOpcionesEgreso(data.tipo_egreso ?? []))
      .catch(() => setOpcionesEgreso(['Alta Médica', 'Defunción', 'Derivación', TIPO_CAMBIO_CAMA]))
  }, [])

  // Cuando el usuario elige "Cambio de Cama", carga las camas disponibles
  useEffect(() => {
    if (!esCambioCama) {
      setNuevaCamaId('')
      return
    }
    setCargandoCamas(true)
    getCamasDisponibles()
      .then((data) => {
        const lista = (data.camas ?? []).filter((c) => c.id !== cama.id)
        setCamasDisponibles(lista)
      })
      .catch(() => setCamasDisponibles([]))
      .finally(() => setCargandoCamas(false))
  }, [esCambioCama, cama.id])

  const handleTipoEgresoChange = (e) => {
    setTipoEgreso(e.target.value)
    setHospitalDestino('')
    setError(null)
  }

  const handleConfirmar = async () => {
    if (!tipoEgreso) {
      setError('Seleccioná un motivo de egreso.')
      return
    }
    if (esCambioCama && !nuevaCamaId) {
      setError('Seleccioná la cama de destino.')
      return
    }
    if (esDerivacion && !hospitalDestino.trim()) {
      setError('Ingresá el hospital de destino.')
      return
    }

    setEnviando(true)
    setError(null)

    const payload = { tipo_egreso: tipoEgreso }
    if (esCambioCama) payload.nueva_cama_id = Number(nuevaCamaId)
    if (esDerivacion)  payload.destino_derivacion = hospitalDestino.trim()

    try {
      await registrarEgreso(paciente.internacion_id, payload)
      onExito()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al registrar el egreso.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <LogOut size={18} className="text-hospital-ocupada" />
              Registrar Egreso
            </h2>
            <p className="text-xs text-gray-500 mt-1">Cama {cama.codigo_cama}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Datos del paciente */}
        <div className="bg-gray-800/50 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-medium text-white">
            {paciente.apellido}, {paciente.nombre}
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock size={11} />
            {paciente.dias_estancia} {paciente.dias_estancia === 1 ? 'día' : 'días'} de estancia
          </p>
        </div>

        {/* Selector de motivo */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1.5">Motivo de Egreso</label>
          <select
            value={tipoEgreso}
            onChange={handleTipoEgresoChange}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Seleccioná —</option>
            {opcionesEgreso.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {/* Selector de cama destino (solo para cambio de cama) */}
        {esCambioCama && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Wrench size={13} className="text-orange-400" />
              Cama de Destino
            </label>
            {cargandoCamas ? (
              <p className="text-xs text-gray-500 animate-pulse py-2">Cargando camas disponibles...</p>
            ) : camasDisponibles.length === 0 ? (
              <p className="text-xs text-yellow-500 py-2">
                No hay camas disponibles para el traslado en este momento.
              </p>
            ) : (
              <select
                value={nuevaCamaId}
                onChange={(e) => setNuevaCamaId(e.target.value)}
                className="w-full bg-gray-800 border border-orange-700/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— Seleccioná cama de destino —</option>
                {camasDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_cama}{c.tipo === 'KPC' ? ' (KPC)' : ''} — {c.sector?.nombre ?? 'Sin sector'}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-gray-500 mt-1.5">
              La cama actual ({cama.codigo_cama}) pasará a estado <span className="text-hospital-mantenimiento font-medium">Mantenimiento</span>.
            </p>
          </div>
        )}

        {/* Hospital de destino (solo para Derivación) */}
        {esDerivacion && (
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1.5">Hospital de Destino</label>
            <input
              type="text"
              value={hospitalDestino}
              onChange={(e) => setHospitalDestino(e.target.value)}
              placeholder="Ej. Hospital Rawson"
              className="w-full bg-gray-800 border border-indigo-700/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={enviando || (esCambioCama && camasDisponibles.length === 0)}
            className={`flex-1 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-all ${
              esCambioCama ? 'bg-orange-600' : 'bg-hospital-ocupada'
            }`}
          >
            {enviando
              ? 'Procesando...'
              : esCambioCama
              ? 'Confirmar Traslado'
              : 'Confirmar Egreso'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Modal de Limpieza ─────────────────────────────────────────────────────────

function ModalLimpieza({ cama, onClose, onExito }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const cambiarEstado = async (nuevoEstado) => {
    setEnviando(nuevoEstado)
    setError(null)
    try {
      await actualizarEstadoCama(cama.id, nuevoEstado)
      onExito()
    } catch (err) {
      setError(err.response?.data?.detail ?? `Error al cambiar la cama a ${nuevoEstado}.`)
      setEnviando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <SprayCan size={18} className="text-hospital-limpieza" />
              Gestionar Cama en Limpieza
            </h2>
            <p className="text-xs text-gray-500 mt-1">Cama {cama.codigo_cama}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          ¿Qué acción querés realizar sobre esta cama?
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => cambiarEstado('Disponible')}
            disabled={!!enviando}
            className="w-full bg-hospital-disponible hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={15} />
            {enviando === 'Disponible' ? 'Procesando...' : 'Limpieza Finalizada — Disponible'}
          </button>
          <button
            onClick={() => cambiarEstado('Mantenimiento')}
            disabled={!!enviando}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Wrench size={15} />
            {enviando === 'Mantenimiento' ? 'Procesando...' : 'Reportar Falla (Mantenimiento)'}
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-300 rounded-lg py-2 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Modal de Cama Disponible ──────────────────────────────────────────────────

function ModalDisponible({ cama, onClose, onExito, onIrAIngreso }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const bloquearMantenimiento = async () => {
    setEnviando(true)
    setError(null)
    try {
      await actualizarEstadoCama(cama.id, 'Mantenimiento')
      onExito()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al bloquear la cama.')
      setEnviando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BedDouble size={18} className="text-hospital-disponible" />
              Cama Disponible
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {cama.codigo_cama}{cama.tipo === 'KPC' ? ' · KPC' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          ¿Qué querés hacer con esta cama?
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onIrAIngreso}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle size={15} />
            Registrar Ingreso de Paciente
          </button>
          <button
            onClick={bloquearMantenimiento}
            disabled={enviando}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-orange-800/50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-400 rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Wrench size={15} />
            {enviando ? 'Procesando...' : 'Bloquear por Mantenimiento'}
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-300 rounded-lg py-2 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Panel de Diagnósticos Prevalentes ────────────────────────────────────────

function DiagnosticosPrevalentes({ diagnosticos, catalogo, cargando }) {
  if (cargando) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!diagnosticos || diagnosticos.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <HeartPulse size={32} className="mx-auto mb-3 text-gray-700" />
        <p className="text-sm text-gray-500">No hay internaciones registradas aún.</p>
        <p className="text-xs text-gray-600 mt-1">Los diagnósticos aparecerán aquí una vez que se registren ingresos.</p>
      </div>
    )
  }

  const maxTotal = diagnosticos[0]?.total ?? 1

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="space-y-3">
        {diagnosticos.map((item, idx) => {
          const porcentaje = Math.round((item.total / maxTotal) * 100)
          const descripcion = catalogo[item.codigo_cie10] ?? item.codigo_cie10

          return (
            <div key={item.codigo_cie10} className="flex items-center gap-4">
              {/* Ranking */}
              <span className="text-xs font-mono text-gray-600 w-5 shrink-0 text-right">
                {idx + 1}
              </span>

              {/* Código */}
              <span className="text-xs font-mono font-semibold text-indigo-400 w-10 shrink-0">
                {item.codigo_cie10}
              </span>

              {/* Descripción + barra */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300 truncate pr-2">{descripcion}</span>
                  <span className="text-xs font-semibold text-white tabular-nums shrink-0">
                    {item.total} {item.total === 1 ? 'caso' : 'casos'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Modal de Mantenimiento → Disponible ───────────────────────────────────────

function ModalMantenimiento({ cama, onClose, onExito }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirmar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await actualizarEstadoCama(cama.id, 'Disponible')
      onExito()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al liberar la cama.')
      setEnviando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wrench size={18} className="text-hospital-mantenimiento" />
              Finalizar Mantenimiento
            </h2>
            <p className="text-xs text-gray-500 mt-1">Cama {cama.codigo_cama}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-5">
          ¿Confirmar que la reparación de la cama{' '}
          <span className="font-mono font-semibold text-white">{cama.codigo_cama}</span> ha finalizado
          y puede volver a estar{' '}
          <span className="text-hospital-disponible font-semibold">Disponible</span>?
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={enviando}
            className="flex-1 bg-hospital-disponible hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={15} />
            {enviando ? 'Procesando...' : 'Reparación Finalizada'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
