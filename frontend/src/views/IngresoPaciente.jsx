import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getOpciones, buscarCIE10 } from '../api/metadataService'
import { registrarIngreso, getCamasDisponibles } from '../api/internacionesService'


const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  dni: '',
  fecha_nacimiento: '',
  sexo_biologico: '',
  procedencia: '',
  cama_id: '',
  codigo_cie10: '',
  cie10_descripcion: '',
}

export default function IngresoPaciente({ camaPreseleccionada = null, onVolver = null }) {
  const [form, setForm] = useState(FORM_INICIAL)
  const [opciones, setOpciones] = useState({ sexo_biologico: [], procedencia: [] })
  const [camas, setCamas] = useState([])
  const [cie10Query, setCie10Query] = useState('')
  const [cie10Resultados, setCie10Resultados] = useState([])
  const [cie10Cargando, setCie10Cargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState(null) // { tipo: 'ok'|'error', mensaje: string }
  const cie10Ref = useRef(null)
  const debounceRef = useRef(null)

  // ── Carga inicial de opciones y camas ────────────────────────────────────
  useEffect(() => {
    getOpciones()
      .then((data) => setOpciones(data))
      .catch(() => setFeedback({ tipo: 'error', mensaje: 'No se pudieron cargar los desplegables.' }))

    getCamasDisponibles()
      .then((data) => {
        const listaCamas = data.camas ?? []
        setCamas(listaCamas)
        // Preselecciona la cama si viene del Dashboard
        if (camaPreseleccionada) {
          const existe = listaCamas.find((c) => c.id === camaPreseleccionada)
          if (existe) setForm((f) => ({ ...f, cama_id: String(camaPreseleccionada) }))
        }
      })
      .catch(() => setFeedback({ tipo: 'error', mensaje: 'No se pudieron cargar las camas disponibles.' }))
  }, [camaPreseleccionada])

  // ── Cierra el dropdown CIE-10 al hacer click fuera ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (cie10Ref.current && !cie10Ref.current.contains(e.target)) {
        setCie10Resultados([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Buscador CIE-10 con debounce 350ms ───────────────────────────────────
  const handleCie10Input = (e) => {
    const q = e.target.value
    setCie10Query(q)
    setForm((f) => ({ ...f, codigo_cie10: '', cie10_descripcion: '' }))
    setCie10Resultados([])

    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) return

    debounceRef.current = setTimeout(async () => {
      setCie10Cargando(true)
      try {
        const data = await buscarCIE10(q.trim())
        setCie10Resultados(data.resultados ?? [])
      } catch {
        setCie10Resultados([])
      } finally {
        setCie10Cargando(false)
      }
    }, 350)
  }

  const seleccionarCie10 = (item) => {
    setForm((f) => ({ ...f, codigo_cie10: item.codigo, cie10_descripcion: item.descripcion }))
    setCie10Query(`${item.codigo} — ${item.descripcion}`)
    setCie10Resultados([])
  }

  // ── Manejo genérico de inputs ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // ── Envío ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)

    if (!form.codigo_cie10) {
      setFeedback({ tipo: 'error', mensaje: 'Seleccioná un diagnóstico CIE-10 de la lista.' })
      return
    }

    setEnviando(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        sexo_biologico: form.sexo_biologico,
        cama_id: Number(form.cama_id),
        codigo_cie10: form.codigo_cie10,
        procedencia: form.procedencia,
        // personal_ingreso_id es extraído del JWT por el backend
      }

      const data = await registrarIngreso(payload)
      setFeedback({
        tipo: 'ok',
        mensaje: `Ingreso registrado correctamente. ID de internación: ${data.internacion_id}`,
      })
      setForm(FORM_INICIAL)
      setCie10Query('')
      // Refresca camas disponibles
      getCamasDisponibles().then((d) => setCamas(d.camas ?? []))
    } catch (err) {
      const detalle = err.response?.data?.detail ?? 'Error inesperado al registrar el ingreso.'
      setFeedback({ tipo: 'error', mensaje: detalle })
    } finally {
      setEnviando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">

        {onVolver && (
          <button
            onClick={onVolver}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
          >
            <ArrowLeft size={15} /> Volver al Dashboard
          </button>
        )}

        <h1 className="text-2xl font-semibold text-white mb-1">Ingreso de Paciente</h1>
        <p className="text-gray-400 text-sm mb-8">
          Completá los datos para registrar una nueva internación en la UTI.
          {camaPreseleccionada && (
            <span className="ml-2 text-indigo-400 font-medium">· Cama preseleccionada desde el mapa.</span>
          )}
        </p>

        {feedback && (
          <div className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.tipo === 'ok'
              ? 'bg-green-900/40 text-green-300 border border-green-700'
              : 'bg-red-900/40 text-red-300 border border-red-700'
          }`}>
            {feedback.mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 space-y-6 border border-gray-800 overflow-visible">

          {/* ── Datos del paciente ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Datos del Paciente
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
              <Field label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} required />
              <Field label="DNI" name="dni" value={form.dni} onChange={handleChange} required />
              <Field label="Fecha de Nacimiento" name="fecha_nacimiento" type="date"
                value={form.fecha_nacimiento} onChange={handleChange} required />
            </div>
          </fieldset>

          {/* ── Desplegables dinámicos ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Clasificación Clínica
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Sexo Biológico"
                name="sexo_biologico"
                value={form.sexo_biologico}
                onChange={handleChange}
                opciones={opciones.sexo_biologico}
                required
              />
              <SelectField
                label="Procedencia"
                name="procedencia"
                value={form.procedencia}
                onChange={handleChange}
                opciones={opciones.procedencia}
                required
              />
            </div>
          </fieldset>

          {/* ── Selector de cama ── */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Asignación de Cama
            </legend>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Cama Disponible</label>
              <select
                name="cama_id"
                value={form.cama_id}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Seleccioná una cama —</option>
                {camas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_cama} {c.tipo === 'KPC' ? '(KPC)' : ''} — {c.sector?.nombre ?? 'Sin sector'}
                  </option>
                ))}
              </select>
              {camas.length === 0 && (
                <p className="text-xs text-yellow-500 mt-1">No hay camas disponibles en este momento.</p>
              )}
            </div>
          </fieldset>

          {/* ── Buscador CIE-10 ── */}
          <fieldset className="overflow-visible">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Diagnóstico de Ingreso
            </legend>
            <div ref={cie10Ref} className="relative overflow-visible">
              <label className="block text-sm text-gray-300 mb-1">Búsqueda CIE-10</label>
              <input
                type="text"
                value={cie10Query}
                onChange={handleCie10Input}
                placeholder="Escribí un código o diagnóstico (ej: J18 o Neumonía)"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
              />

              {/* Indicador de código seleccionado */}
              {form.codigo_cie10 && (
                <p className="text-xs text-indigo-400 mt-1">
                  Seleccionado: <span className="font-semibold">{form.codigo_cie10}</span> — {form.cie10_descripcion}
                </p>
              )}

              {/* Indicador de carga inline (visible aunque el dropdown no aparezca) */}
              {cie10Cargando && (
                <p className="text-xs text-indigo-400 mt-1 animate-pulse">Buscando diagnósticos...</p>
              )}

              {/* Dropdown de resultados */}
              {(cie10Cargando || cie10Resultados.length > 0 || (cie10Query.trim().length >= 2 && !cie10Cargando && cie10Resultados.length === 0 && !form.codigo_cie10)) && (
                <ul className="absolute left-0 right-0 z-[9999] w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto">
                  {cie10Cargando && (
                    <li className="px-4 py-3 text-sm text-gray-400">Buscando...</li>
                  )}
                  {!cie10Cargando && cie10Resultados.length === 0 && cie10Query.trim().length >= 2 && (
                    <li className="px-4 py-3 text-sm text-gray-500 italic">
                      No se encontró "{cie10Query.trim()}" en el catálogo CIE-10 de UTI.
                    </li>
                  )}
                  {!cie10Cargando && cie10Resultados.map((item) => (
                    <li
                      key={item.codigo}
                      onMouseDown={() => seleccionarCie10(item)}
                      className="px-4 py-2.5 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white cursor-pointer flex gap-3 items-baseline"
                    >
                      <span className="font-mono text-indigo-400 text-xs shrink-0">{item.codigo}</span>
                      <span>{item.descripcion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          {/* ── Botón de envío ── */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-hospital-disponible hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-all"
          >
            {enviando ? 'Registrando...' : 'Confirmar Ingreso'}
          </button>

        </form>
      </div>
    </div>
  )
}

// ── Subcomponentes internos ───────────────────────────────────────────────────

function Field({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
      />
    </div>
  )
}

function SelectField({ label, name, value, onChange, opciones, required }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">— Seleccioná —</option>
        {opciones.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
    </div>
  )
}
