import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, Edit3, RotateCcw, Search, User, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const POR_PAGINA = 20

function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function clavePersona({ id, nombre, dpi }) {
  const dpiLimpio = normalizarTexto(dpi).replace(/\s+/g, '')
  if (dpiLimpio) return `dpi:${dpiLimpio}`
  const nombreLimpio = normalizarTexto(nombre)
  if (nombreLimpio) return `nombre:${nombreLimpio}`
  return `lector:${id || crypto.randomUUID()}`
}

export default function Lectores() {
  const location = useLocation()
  const busquedaInicial = location.state?.busqueda || ''
  const [busqueda, setBusqueda] = useState(busquedaInicial)
  const [tipoListado, setTipoListado] = useState('todos')
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [vista, setVista] = useState('lista')
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)

  const [editNombre, setEditNombre] = useState('')
  const [editDpi, setEditDpi] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editDireccion, setEditDireccion] = useState('')
  const [editEsMenor, setEditEsMenor] = useState(false)
  const [editNombreTutor, setEditNombreTutor] = useState('')
  const [editTelefonoTutor, setEditTelefonoTutor] = useState('')
  const [editDpiTutor, setEditDpiTutor] = useState('')
  const [editEsEstudiante, setEditEsEstudiante] = useState(false)
  const [editIdNivel, setEditIdNivel] = useState('')
  const [editIdEstablecimiento, setEditIdEstablecimiento] = useState('')
  const [editGradoCiclo, setEditGradoCiclo] = useState('')

  const cargarPersonas = useCallback(async (pag, termino, tipo) => {
    setCargando(true)

    const [{ data: lectoresData, error: lectoresError }, { data: prestamosData, error: prestamosError }] = await Promise.all([
      supabase
        .from('lector')
        .select('id_lector, nombre, dpi, telefono, direccion, es_menor, nombre_tutor, telefono_tutor, dpi_tutor, id_nivel, id_establecimiento, grado_ciclo, registrado_en')
        .order('id_lector', { ascending: false }),
      supabase
        .from('prestamo')
        .select(`
          id_prestamo, id_lector, tipo, estado, fecha_salida,
          fecha_devolucion_esperada, fecha_devolucion_real,
          hora_salida, hora_regreso, nombre_inmediato, dpi_garantia,
          ejemplar (codigo_inventario, titulo (titulo))
        `)
        .order('fecha_salida', { ascending: false }),
    ])

    if (lectoresError || prestamosError) {
      console.error('Error cargando lectores:', lectoresError || prestamosError)
      setPersonas([])
      setTotal(0)
      setCargando(false)
      return
    }

    const mapa = new Map()
    const lectorPorId = new Map()

    ;(lectoresData || []).forEach(lector => {
      lectorPorId.set(lector.id_lector, lector)
      const clave = clavePersona({ id: lector.id_lector, nombre: lector.nombre, dpi: lector.dpi })
      mapa.set(clave, {
        id: clave,
        nombre: lector.nombre,
        dpi: lector.dpi || '',
        telefono: lector.telefono || '',
        direccion: lector.direccion || '',
        formal: lector,
        tieneFormal: true,
        tieneInmediato: false,
        totalPrestamos: 0,
        activos: 0,
        devueltos: 0,
        ultimaVisita: lector.registrado_en?.split('T')[0] || '',
        historial: [],
      })
    })

    ;(prestamosData || []).forEach(prestamo => {
      const lectorFormal = prestamo.id_lector ? lectorPorId.get(prestamo.id_lector) : null
      const basePersona = lectorFormal
        ? { id: lectorFormal.id_lector, nombre: lectorFormal.nombre, dpi: lectorFormal.dpi }
        : { nombre: prestamo.nombre_inmediato || 'Sin nombre', dpi: prestamo.dpi_garantia || '' }
      const clave = clavePersona(basePersona)
      const existente = mapa.get(clave) || {
        id: clave,
        nombre: basePersona.nombre || 'Sin nombre',
        dpi: basePersona.dpi || '',
        telefono: '',
        direccion: '',
        formal: null,
        tieneFormal: false,
        tieneInmediato: false,
        totalPrestamos: 0,
        activos: 0,
        devueltos: 0,
        ultimaVisita: '',
        historial: [],
      }

      if (prestamo.tipo === 'FORMAL') existente.tieneFormal = true
      if (prestamo.tipo === 'EXTERNO_INMEDIATO') existente.tieneInmediato = true
      existente.totalPrestamos += 1
      if (prestamo.estado === 'ACTIVO' || prestamo.estado === 'VENCIDO') existente.activos += 1
      if (prestamo.estado === 'DEVUELTO') existente.devueltos += 1
      if (!existente.ultimaVisita || (prestamo.fecha_salida && prestamo.fecha_salida > existente.ultimaVisita)) {
        existente.ultimaVisita = prestamo.fecha_salida
      }
      existente.historial.push(prestamo)
      mapa.set(clave, existente)
    })

    const terminoNormalizado = normalizarTexto(termino)
    const lista = Array.from(mapa.values())
      .filter(persona => {
        if (tipo === 'formales') return persona.tieneFormal
        if (tipo === 'inmediatos') return persona.tieneInmediato
        if (tipo === 'ambos') return persona.tieneFormal && persona.tieneInmediato
        return true
      })
      .filter(persona => {
        if (!terminoNormalizado) return true
        return [persona.nombre, persona.dpi, persona.telefono]
          .some(campo => normalizarTexto(campo).includes(terminoNormalizado))
      })
      .sort((a, b) => {
        const fecha = (b.ultimaVisita || '').localeCompare(a.ultimaVisita || '')
        if (fecha !== 0) return fecha
        return normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre))
      })

    const desde = (pag - 1) * POR_PAGINA
    const hasta = desde + POR_PAGINA
    setPersonas(lista.slice(desde, hasta))
    setTotal(lista.length)
    setCargando(false)
  }, [])

  useEffect(() => {
    let activo = true

    async function cargarDatosIniciales() {
      const [{ data: nivelesData }, { data: establecimientosData }] = await Promise.all([
        supabase.from('niveleducativo').select('*').order('id_nivel'),
        supabase
          .from('establecimiento')
          .select('id_establecimiento, nombre, activo, establecimiento_nivel (id_nivel)'),
      ])

      if (!activo) return
      setNiveles(nivelesData || [])
      setEstablecimientos(establecimientosData || [])
      cargarPersonas(1, busquedaInicial, 'todos')
    }

    cargarDatosIniciales()
    return () => { activo = false }
  }, [busquedaInicial, cargarPersonas])

  function recargar(pag = pagina, termino = busqueda, tipo = tipoListado) {
    cargarPersonas(pag, termino, tipo)
  }

  function handleBuscar() {
    setPagina(1)
    recargar(1)
  }

  function handleLimpiar() {
    setBusqueda('')
    setPagina(1)
    recargar(1, '')
  }

  function handlePagina(n) {
    setPagina(n)
    recargar(n)
  }

  function handleTipoListado(tipo) {
    setTipoListado(tipo)
    setPagina(1)
    setVista('lista')
    recargar(1, busqueda, tipo)
  }

  function verDetalle(persona) {
    setPersonaSeleccionada({
      ...persona,
      historial: [...persona.historial].sort((a, b) => (b.fecha_salida || '').localeCompare(a.fecha_salida || '')),
    })
    setMensaje({ texto: '', error: false })
    setVista('detalle')
  }

  function abrirEdicion(persona) {
    const lector = persona.formal
    if (!lector) return
    setEditNombre(lector.nombre)
    setEditDpi(lector.dpi || '')
    setEditTelefono(lector.telefono || '')
    setEditDireccion(lector.direccion || '')
    setEditEsMenor(lector.es_menor || false)
    setEditNombreTutor(lector.nombre_tutor || '')
    setEditTelefonoTutor(lector.telefono_tutor || '')
    setEditDpiTutor(lector.dpi_tutor || '')
    setEditEsEstudiante(!!lector.id_nivel)
    setEditIdNivel(lector.id_nivel ? String(lector.id_nivel) : '')
    setEditIdEstablecimiento(lector.id_establecimiento ? String(lector.id_establecimiento) : '')
    setEditGradoCiclo(lector.grado_ciclo || '')
    setMensaje({ texto: '', error: false })
    setVista('editar')
  }

  async function guardarEdicion() {
    if (!editNombre.trim() || !personaSeleccionada?.formal?.id_lector) {
      setMensaje({ texto: 'El nombre es obligatorio.', error: true })
      return
    }

    setGuardando(true)
    const { data, error } = await supabase
      .from('lector')
      .update({
        nombre: editNombre,
        dpi: editDpi || null,
        telefono: editTelefono || null,
        direccion: editDireccion || null,
        es_menor: editEsMenor,
        nombre_tutor: editEsMenor ? editNombreTutor || null : null,
        telefono_tutor: editEsMenor ? editTelefonoTutor || null : null,
        dpi_tutor: editEsMenor ? editDpiTutor || null : null,
        id_nivel: editEsEstudiante && editIdNivel ? parseInt(editIdNivel) : null,
        id_establecimiento: editEsEstudiante && editIdEstablecimiento ? parseInt(editIdEstablecimiento) : null,
        grado_ciclo: editEsEstudiante && editGradoCiclo ? editGradoCiclo : null,
      })
      .eq('id_lector', personaSeleccionada.formal.id_lector)
      .select()
      .single()

    if (error) {
      setMensaje({ texto: 'Error al guardar.', error: true })
    } else {
      setPersonaSeleccionada(prev => ({
        ...prev,
        nombre: data.nombre,
        dpi: data.dpi || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        formal: data,
      }))
      setMensaje({ texto: 'Datos actualizados correctamente.', error: false })
      recargar()
      setVista('detalle')
    }
    setGuardando(false)
  }

  function tipoPersona(persona) {
    if (persona.tieneFormal && persona.tieneInmediato) return 'Ambos'
    if (persona.tieneFormal) return 'Formal'
    return 'Inmediato'
  }

  function colorTipo(persona) {
    if (persona.tieneFormal && persona.tieneInmediato) return { bg: '#fef3c7', color: '#92400e' }
    if (persona.tieneFormal) return { bg: '#ecfdf5', color: '#047857' }
    return { bg: '#dbeafe', color: '#1d4ed8' }
  }

  function colorEstado(estado) {
    if (estado === 'ACTIVO') return '#d97706'
    if (estado === 'DEVUELTO') return '#16a34a'
    if (estado === 'VENCIDO') return '#dc2626'
    return '#475569'
  }

  function nombreNivel(id) {
    return niveles.find(n => n.id_nivel === id)?.nombre || '-'
  }

  function nombreEstablecimiento(id) {
    return establecimientos.find(e => e.id_establecimiento === id)?.nombre || '-'
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const tabs = [
    { id: 'todos', label: 'Todos' },
    { id: 'formales', label: 'Formales' },
    { id: 'inmediatos', label: 'Inmediatos' },
    { id: 'ambos', label: 'Ambos' },
  ]
  const establecimientosFiltrados = editIdNivel
    ? establecimientos.filter(e =>
        e.activo &&
        e.establecimiento_nivel?.some(en => en.id_nivel === parseInt(editIdNivel))
      )
    : []

  const panelStyle = { border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', padding: '18px' }
  const buttonSecondary = {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: 'white',
    color: '#0f172a',
    padding: '9px 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
  }
  const buttonPrimary = {
    ...buttonSecondary,
    border: 'none',
    background: '#2563eb',
    color: 'white',
  }
  const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', color: '#334155', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', color: '#2563eb', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Biblioteca Municipal</p>
          <h1 style={{ margin: 0, fontSize: '30px', color: '#0f172a' }}>Lectores</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Consulta personas registradas, visitantes inmediatos y su historial de libros prestados.
          </p>
        </div>
        <button onClick={() => recargar()} style={buttonSecondary}>
          <RotateCcw size={16} /> Actualizar
        </button>
      </div>

      {mensaje.texto && (
        <p style={{
          color: mensaje.error ? '#991b1b' : '#166534',
          background: mensaje.error ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${mensaje.error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          fontWeight: 700,
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {mensaje.texto}
        </p>
      )}

      {vista === 'lista' && (
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Registro de personas</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Una misma persona puede aparecer como formal, inmediata o ambos.</p>
              </div>
            </div>
            <span style={{ borderRadius: '999px', padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: 800 }}>
              {total}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', flexWrap: 'wrap' }}>
              {tabs.map(tab => {
                const activo = tipoListado === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTipoListado(tab.id)}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: activo ? '#2563eb' : 'transparent',
                      color: activo ? 'white' : '#475569',
                      fontSize: '13px',
                      fontWeight: 900,
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Buscar por nombre, DPI o telefono..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                style={inputStyle}
              />
              <button onClick={handleBuscar} style={buttonPrimary}><Search size={15} /> Buscar</button>
              <button onClick={handleLimpiar} style={buttonSecondary}>Limpiar</button>
            </div>
          </div>

          {cargando ? (
            <p style={{ margin: 0, color: '#64748b' }}>Cargando lectores...</p>
          ) : personas.length === 0 ? (
            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '22px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
              No hay lectores para mostrar.
            </div>
          ) : (
            <>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Persona</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Contacto</th>
                      <th style={{ padding: '12px' }}>Prestamos</th>
                      <th style={{ padding: '12px' }}>Activos</th>
                      <th style={{ padding: '12px' }}>Ultima visita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map(persona => {
                      const tipoColor = colorTipo(persona)
                      return (
                        <tr
                          key={persona.id}
                          onClick={() => verDetalle(persona)}
                          style={{ borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: '#1d4ed8' }}>{persona.nombre}</strong>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>DPI: {persona.dpi || '-'}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ display: 'inline-flex', borderRadius: '999px', padding: '5px 9px', background: tipoColor.bg, color: tipoColor.color, fontSize: '12px', fontWeight: 900 }}>
                              {tipoPersona(persona)}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>{persona.telefono || '-'}</td>
                          <td style={{ padding: '12px', color: '#0f172a', fontWeight: 800 }}>{persona.totalPrestamos}</td>
                          <td style={{ padding: '12px', color: persona.activos > 0 ? '#d97706' : '#475569', fontWeight: persona.activos > 0 ? 800 : 400 }}>{persona.activos}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{persona.ultimaVisita || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={() => handlePagina(pagina - 1)} disabled={pagina === 1} style={{ ...buttonSecondary, cursor: pagina === 1 ? 'default' : 'pointer', opacity: pagina === 1 ? 0.6 : 1 }}>
                    Anterior
                  </button>
                  <span style={{ fontSize: '14px', color: '#475569' }}>Pagina {pagina} de {totalPaginas}</span>
                  <button onClick={() => handlePagina(pagina + 1)} disabled={pagina === totalPaginas} style={{ ...buttonSecondary, cursor: pagina === totalPaginas ? 'default' : 'pointer', opacity: pagina === totalPaginas ? 0.6 : 1 }}>
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {vista === 'detalle' && personaSeleccionada && (
        <div style={{ display: 'grid', gap: '18px' }}>
          <button onClick={() => setVista('lista')} style={{ ...buttonSecondary, width: 'fit-content' }}>
            <ArrowLeft size={15} /> Volver
          </button>

          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                  <User size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{personaSeleccionada.nombre}</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    {tipoPersona(personaSeleccionada)} · {personaSeleccionada.totalPrestamos} prestamos registrados
                  </p>
                </div>
              </div>
              {personaSeleccionada.formal && (
                <button onClick={() => abrirEdicion(personaSeleccionada)} style={buttonPrimary}>
                  <Edit3 size={15} /> Editar datos
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginTop: '18px' }}>
              {[
                ['DPI', personaSeleccionada.dpi || '-'],
                ['Telefono', personaSeleccionada.telefono || '-'],
                ['Direccion', personaSeleccionada.direccion || '-'],
                ['Ultima visita', personaSeleccionada.ultimaVisita || '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px', fontWeight: 800 }}>{label}</p>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{value}</p>
                </div>
              ))}
            </div>

            {personaSeleccionada.formal && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px', fontWeight: 800 }}>Estudiante</p>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{personaSeleccionada.formal.id_nivel ? 'Si' : 'No'}</p>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px', fontWeight: 800 }}>Nivel</p>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{nombreNivel(personaSeleccionada.formal.id_nivel)}</p>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px', fontWeight: 800 }}>Establecimiento</p>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{nombreEstablecimiento(personaSeleccionada.formal.id_establecimiento)}</p>
                </div>
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Libros prestados</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Historial combinado de prestamos formales e inmediatos.</p>
              </div>
            </div>

            {personaSeleccionada.historial.length === 0 ? (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '22px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
                Sin libros prestados.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '820px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Libro</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Salida</th>
                      <th style={{ padding: '12px' }}>Limite</th>
                      <th style={{ padding: '12px' }}>Devuelto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personaSeleccionada.historial.map(prestamo => (
                      <tr key={prestamo.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>
                          <strong>{prestamo.ejemplar?.titulo?.titulo || '-'}</strong>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{prestamo.ejemplar?.codigo_inventario || '-'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{prestamo.tipo === 'FORMAL' ? 'Formal' : 'Inmediato'}</td>
                        <td style={{ padding: '12px', color: colorEstado(prestamo.estado), fontWeight: 900 }}>{prestamo.estado}</td>
                        <td style={{ padding: '12px' }}>{prestamo.fecha_salida || '-'} {prestamo.hora_salida || ''}</td>
                        <td style={{ padding: '12px' }}>{prestamo.fecha_devolucion_esperada || '-'}</td>
                        <td style={{ padding: '12px' }}>{prestamo.fecha_devolucion_real || '-'} {prestamo.hora_regreso || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {vista === 'editar' && personaSeleccionada?.formal && (
        <section style={{ ...panelStyle, maxWidth: '680px' }}>
          <button onClick={() => setVista('detalle')} style={{ ...buttonSecondary, marginBottom: '16px' }}>
            <ArrowLeft size={15} /> Cancelar
          </button>

          <h2 style={{ margin: '0 0 18px 0', color: '#0f172a' }}>Editar datos</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={editNombre} onChange={e => setEditNombre(e.target.value)} />
            </div>

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={editEsMenor} onChange={e => setEditEsMenor(e.target.checked)} />
              Es menor de edad
            </label>

            {!editEsMenor && (
              <div>
                <label style={labelStyle}>DPI</label>
                <input style={inputStyle} value={editDpi} onChange={e => setEditDpi(e.target.value)} />
              </div>
            )}

            {editEsMenor && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nombre del tutor</label>
                  <input style={inputStyle} value={editNombreTutor} onChange={e => setEditNombreTutor(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Telefono del tutor</label>
                  <input style={inputStyle} value={editTelefonoTutor} onChange={e => setEditTelefonoTutor(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>DPI del tutor</label>
                  <input style={inputStyle} value={editDpiTutor} onChange={e => setEditDpiTutor(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Telefono</label>
                <input style={inputStyle} value={editTelefono} onChange={e => setEditTelefono(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Direccion</label>
                <input style={inputStyle} value={editDireccion} onChange={e => setEditDireccion(e.target.value)} />
              </div>
            </div>

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <input type="checkbox" checked={editEsEstudiante} onChange={e => setEditEsEstudiante(e.target.checked)} />
              Es estudiante
            </label>

            {editEsEstudiante && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nivel educativo</label>
                  <select
                    style={inputStyle}
                    value={editIdNivel}
                    onChange={e => {
                      setEditIdNivel(e.target.value)
                      setEditIdEstablecimiento('')
                    }}
                  >
                    <option value="">Seleccione...</option>
                    {niveles.map(n => <option key={n.id_nivel} value={n.id_nivel}>{n.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Establecimiento</label>
                  <select style={inputStyle} value={editIdEstablecimiento} onChange={e => setEditIdEstablecimiento(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {establecimientosFiltrados.map(e => <option key={e.id_establecimiento} value={e.id_establecimiento}>{e.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Grado o ciclo</label>
                  <input style={inputStyle} value={editGradoCiclo} onChange={e => setEditGradoCiclo(e.target.value)} />
                </div>
              </div>
            )}

            <button onClick={guardarEdicion} disabled={guardando} style={{ ...buttonPrimary, width: 'fit-content', opacity: guardando ? 0.65 : 1 }}>
              <CheckCircle2 size={15} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
