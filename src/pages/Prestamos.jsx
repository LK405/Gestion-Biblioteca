import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronUp, Clock, RotateCcw, Search, User, UserPlus } from 'lucide-react'

const POR_PAGINA_H = 10

function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Prestamos() {
  const { usuario } = useAuth()
  const location = useLocation()

  const [tipo, setTipo] = useState('FORMAL')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)
  const [tipoAbierto, setTipoAbierto] = useState(true)
  const [pasoActivo, setPasoActivo] = useState('libro')

  // Búsqueda de libro
  const [busquedaLibro, setBusquedaLibro] = useState('')
  const [libros, setLibros] = useState([])
  const [ejemplarSeleccionado, setEjemplarSeleccionado] = useState(null)
  const [busquedaLibroRealizada, setBusquedaLibroRealizada] = useState(false)

  // Búsqueda de lector existente
  const [busquedaLector, setBusquedaLector] = useState('')
  const [resultadosLector, setResultadosLector] = useState([])
  const [lectorEncontrado, setLectorEncontrado] = useState(null)
  const [modoLector, setModoLector] = useState('buscar') // buscar | nuevo | encontrado

  // Datos lector formal
  const [nombre, setNombre] = useState('')
  const [dpi, setDpi] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [esMenor, setEsMenor] = useState(false)
  const [nombreTutor, setNombreTutor] = useState('')
  const [telefonoTutor, setTelefonoTutor] = useState('')
  const [dpiTutor, setDpiTutor] = useState('')

  // Datos educativos
  const [esEstudiante, setEsEstudiante] = useState(false)
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [establecimientosFiltrados, setEstablecimientosFiltrados] = useState([])
  const [idNivel, setIdNivel] = useState('')
  const [idEstablecimiento, setIdEstablecimiento] = useState('')
  const [gradoCiclo, setGradoCiclo] = useState('')

  // Datos inmediato
  const [nombreInmediato, setNombreInmediato] = useState('')
  const [dpiGarantia, setDpiGarantia] = useState('')

  // Historial
  const [historialPrestamos, setHistorialPrestamos] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [paginaH, setPaginaH] = useState(1)
  const [totalH, setTotalH] = useState(0)

  // Modal de edición
  const [prestamoEditando, setPrestamoEditando] = useState(null)
  const [editNombreInmediato, setEditNombreInmediato] = useState('')
  const [editFechaSalida, setEditFechaSalida] = useState('')
  const [editFechaDevolucion, setEditFechaDevolucion] = useState('')
  const [editNombreLector, setEditNombreLector] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [mensajeEdicion, setMensajeEdicion] = useState({ texto: '', error: false })

  useEffect(() => {
    cargarNiveles()
    cargarEstablecimientos()
  }, [])

  useEffect(() => {
    if (location.state?.libroPreseleccionado) {
      const libro = location.state.libroPreseleccionado
      setBusquedaLibro(libro.titulo)
      setLibros([libro])
      setBusquedaLibroRealizada(true)
    }
    if (location.state?.tipoPreseleccionado) {
      setTipo(location.state.tipoPreseleccionado)
    }
  }, [])

  useEffect(() => {
    cargarHistorialPrestamos(1, filtroEstado, filtroPeriodo)
  }, [])

  useEffect(() => {
  if (idNivel) {
    const filtrados = establecimientos.filter(e =>
      e.activo &&
      e.establecimiento_nivel?.some(en => en.id_nivel === parseInt(idNivel))
    )
    setEstablecimientosFiltrados(filtrados)
    setIdEstablecimiento('')
  } else {
    setEstablecimientosFiltrados([])
  }
}, [idNivel, establecimientos])

  async function cargarNiveles() {
    const { data } = await supabase.from('niveleducativo').select('*').order('id_nivel')
    setNiveles(data || [])
  }

 async function cargarEstablecimientos() {
  const { data } = await supabase
    .from('establecimiento')
    .select('id_establecimiento, nombre, activo, establecimiento_nivel (id_nivel)')
    .eq('activo', true)
  setEstablecimientos(data || [])
}

  async function cargarHistorialPrestamos(pag, estado, periodo) {
    setCargandoHistorial(true)
    const desde = (pag - 1) * POR_PAGINA_H
    const hasta = desde + POR_PAGINA_H - 1

    const hoy = new Date()
    let fechaDesde
    if (periodo === 'dia') {
      fechaDesde = new Date(hoy); fechaDesde.setHours(0, 0, 0, 0)
    } else if (periodo === 'semana') {
      fechaDesde = new Date(hoy); fechaDesde.setDate(hoy.getDate() - 7)
    } else {
      fechaDesde = new Date(hoy); fechaDesde.setMonth(hoy.getMonth() - 1)
    }
    const fechaDesdeStr = fechaDesde.toISOString().split('T')[0]

    let query = supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida, fecha_devolucion_esperada,
        nombre_inmediato, id_lector,
        lector (id_lector, nombre),
        ejemplar (titulo (titulo))
      `, { count: 'exact' })
      .gte('fecha_salida', fechaDesdeStr)
      .order('fecha_salida', { ascending: false })
      .range(desde, hasta)

    if (estado !== 'TODOS') query = query.eq('estado', estado)

    const { data, count } = await query
    setHistorialPrestamos(data || [])
    setTotalH(count || 0)
    setCargandoHistorial(false)
  }

  function abrirEdicion(p) {
    setPrestamoEditando(p)
    setEditNombreInmediato(p.nombre_inmediato || '')
    setEditNombreLector(p.lector?.nombre || '')
    setEditFechaSalida(p.fecha_salida || '')
    setEditFechaDevolucion(p.fecha_devolucion_esperada || '')
    setMensajeEdicion({ texto: '', error: false })
  }

  async function guardarEdicionPrestamo() {
    if (!prestamoEditando) return
    setGuardandoEdicion(true)
    setMensajeEdicion({ texto: '', error: false })

    try {
      const updates = {
        fecha_salida: editFechaSalida,
        fecha_devolucion_esperada: editFechaDevolucion || null,
      }

      if (prestamoEditando.tipo === 'EXTERNO_INMEDIATO') {
        updates.nombre_inmediato = editNombreInmediato.trim() || null
      }

      if (prestamoEditando.tipo === 'FORMAL' && prestamoEditando.id_lector) {
        await supabase
          .from('lector')
          .update({ nombre: editNombreLector })
          .eq('id_lector', prestamoEditando.id_lector)
      }

      const { error } = await supabase
        .from('prestamo')
        .update(updates)
        .eq('id_prestamo', prestamoEditando.id_prestamo)

      if (error) throw error

      setMensajeEdicion({ texto: 'Préstamo actualizado.', error: false })
      cargarHistorialPrestamos(paginaH, filtroEstado, filtroPeriodo)
      setTimeout(() => setPrestamoEditando(null), 1000)
    } catch (err) {
      console.error(err)
      setMensajeEdicion({ texto: 'Error al guardar.', error: true })
    }

    setGuardandoEdicion(false)
  }

  async function buscarLector() {
    if (!busquedaLector.trim()) return
    const { data } = await supabase
      .from('lector')
      .select('*')
      .or(`dpi.ilike.%${busquedaLector}%,nombre.ilike.%${busquedaLector}%`)
      .limit(5)
    setResultadosLector(data || [])
  }

  function seleccionarLector(lector) {
    setLectorEncontrado(lector)
    setModoLector('encontrado')
    setNombre(lector.nombre)
    setDpi(lector.dpi || '')
    setTelefono(lector.telefono || '')
    setDireccion(lector.direccion || '')
    setEsMenor(lector.es_menor || false)
    setNombreTutor(lector.nombre_tutor || '')
    setTelefonoTutor(lector.telefono_tutor || '')
    setDpiTutor(lector.dpi_tutor || '')
    setIdNivel(lector.id_nivel ? String(lector.id_nivel) : '')
    setIdEstablecimiento(lector.id_establecimiento ? String(lector.id_establecimiento) : '')
    setGradoCiclo(lector.grado_ciclo || '')
    setEsEstudiante(!!lector.id_nivel)
    setResultadosLector([])
    setBusquedaLector('')
  }

  async function buscarLibros() {
    const termino = normalizarTexto(busquedaLibro)
    setBusquedaLibroRealizada(true)
    setEjemplarSeleccionado(null)

    if (!termino) {
      setLibros([])
      setBusquedaLibroRealizada(false)
      return
    }

    const { data, error } = await supabase
      .from('titulo')
      .select(`
        id_titulo, titulo, autor, isbn,
        categoria (nombre, permite_prestamo_formal),
        ejemplar (id_ejemplar, codigo_inventario, ubicacion_dewey, estado)
      `)
      .eq('activo', true)
      .order('titulo')

    if (error) {
      console.error('Error buscando libros:', error)
      setLibros([])
      return
    }

    const resultados = (data || []).filter(libro => {
      const campos = [
        libro.titulo,
        libro.autor,
        libro.isbn,
        libro.categoria?.nombre,
        ...(libro.ejemplar || []).map(ej => ej.codigo_inventario),
      ]
      return campos.some(campo => normalizarTexto(campo).includes(termino))
    })

    setLibros(resultados.slice(0, 20))
  }

  async function registrarPrestamo() {
    setMensaje({ texto: '', error: false })

    if (!ejemplarSeleccionado) {
      setMensaje({ texto: 'Seleccione un ejemplar disponible.', error: true })
      return
    }

    if (tipo === 'FORMAL') {
      if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
        setMensaje({ texto: 'Nombre, teléfono y dirección son obligatorios.', error: true })
        return
      }
      if (!esMenor && !dpi.trim()) {
        setMensaje({ texto: 'El DPI es obligatorio para mayores de edad.', error: true })
        return
      }
      if (esMenor && (!nombreTutor.trim() || !telefonoTutor.trim())) {
        setMensaje({ texto: 'Nombre y teléfono del tutor son obligatorios para menores.', error: true })
        return
      }
      if (!ejemplarSeleccionado.categoria?.permite_prestamo_formal) {
        setMensaje({ texto: 'Esta categoría no permite préstamo formal.', error: true })
        return
      }
    }

    if (tipo === 'EXTERNO_INMEDIATO' && !nombreInmediato.trim()) {
      setMensaje({ texto: 'El nombre es obligatorio.', error: true })
      return
    }

    setGuardando(true)

    try {
      let idLector = null
      const hoy = new Date()
      const fechaHoy = hoy.toISOString().split('T')[0]
      const horaHoy = hoy.toTimeString().split(' ')[0]

      if (tipo === 'FORMAL') {
        if (lectorEncontrado) {
          const { data: prestamoActivo } = await supabase
            .from('prestamo')
            .select('id_prestamo')
            .eq('id_lector', lectorEncontrado.id_lector)
            .eq('tipo', 'FORMAL')
            .eq('estado', 'ACTIVO')
            .single()

          if (prestamoActivo) {
            setMensaje({ texto: 'Este lector ya tiene un préstamo formal activo.', error: true })
            setGuardando(false)
            return
          }
          idLector = lectorEncontrado.id_lector
        } else {
          const { data: nuevoLector, error: errorLector } = await supabase
            .from('lector')
            .insert({
              nombre,
              dpi: dpi || null,
              telefono,
              direccion,
              es_menor: esMenor,
              nombre_tutor: esMenor ? nombreTutor : null,
              telefono_tutor: esMenor ? telefonoTutor : null,
              dpi_tutor: esMenor ? dpiTutor : null,
              id_nivel: esEstudiante && idNivel ? parseInt(idNivel) : null,
              id_establecimiento: esEstudiante && idEstablecimiento ? parseInt(idEstablecimiento) : null,
              grado_ciclo: esEstudiante && gradoCiclo ? gradoCiclo : null,
            })
            .select('id_lector')
            .single()

          if (errorLector) throw errorLector
          idLector = nuevoLector.id_lector
        }
      }

      const fechaDevolucion = new Date()
      fechaDevolucion.setDate(hoy.getDate() + 7)

      const payload = {
        id_ejemplar: ejemplarSeleccionado.id_ejemplar,
        id_lector: tipo === 'FORMAL' ? idLector : null,
        id_usuario_registra: usuario.id_usuario,
        tipo,
        estado: 'ACTIVO',
        fecha_salida: fechaHoy,
        hora_salida: tipo === 'EXTERNO_INMEDIATO' ? horaHoy : null,
        fecha_devolucion_esperada: tipo === 'FORMAL'
          ? fechaDevolucion.toISOString().split('T')[0]
          : fechaHoy,
        nombre_inmediato: tipo === 'EXTERNO_INMEDIATO' ? nombreInmediato.trim() : null,
        dpi_garantia: tipo === 'EXTERNO_INMEDIATO' ? dpiGarantia.trim() || null : null,
      }

      const { error: errorPrestamo } = await supabase.from('prestamo').insert(payload)
      if (errorPrestamo) throw errorPrestamo

      await supabase
        .from('ejemplar')
        .update({ estado: 'PRESTADO' })
        .eq('id_ejemplar', ejemplarSeleccionado.id_ejemplar)

      setMensaje({ texto: 'Préstamo registrado correctamente.', error: false })
      limpiarFormulario()
      cargarHistorialPrestamos(1, filtroEstado, filtroPeriodo)
    } catch (err) {
      console.error(err)
      setMensaje({ texto: 'Error al registrar el préstamo. Intente de nuevo.', error: true })
    }

    setGuardando(false)
  }

  function limpiarFormulario() {
    setBusquedaLibro(''); setLibros([]); setEjemplarSeleccionado(null); setBusquedaLibroRealizada(false)
    setNombre(''); setDpi(''); setTelefono(''); setDireccion('')
    setEsMenor(false); setNombreTutor(''); setTelefonoTutor(''); setDpiTutor('')
    setNombreInmediato(''); setDpiGarantia('')
    setBusquedaLector(''); setResultadosLector([]); setLectorEncontrado(null)
    setModoLector('buscar'); setEsEstudiante(false)
    setIdNivel(''); setIdEstablecimiento(''); setGradoCiclo('')
    setPasoActivo('libro')
  }

  const tipoFormal = tipo === 'FORMAL'
  const lectorListo = tipoFormal
    ? !!lectorEncontrado || (!!nombre.trim() && !!telefono.trim() && !!direccion.trim() && (esMenor ? !!nombreTutor.trim() && !!telefonoTutor.trim() : !!dpi.trim()))
    : !!nombreInmediato.trim()
  const fechaLimitePreview = (() => {
    const hoy = new Date()
    if (tipoFormal) hoy.setDate(hoy.getDate() + 7)
    return hoy.toISOString().split('T')[0]
  })()
  const totalPaginasH = Math.ceil(totalH / POR_PAGINA_H)

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '11px 12px',
    fontSize: '14px',
    background: 'white',
    color: '#0f172a',
  }
  const labelStyle = { fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }
  const fieldStyle = { marginBottom: '14px' }
  const panelStyle = { border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', padding: '18px' }
  const buttonPrimary = {
    border: 'none',
    borderRadius: '8px',
    background: guardando ? '#94a3b8' : '#2563eb',
    color: 'white',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: guardando ? 'default' : 'pointer',
    width: '100%',
  }
  const buttonSecondary = {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: 'white',
    color: '#0f172a',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  }
  const iconButton = {
    ...buttonSecondary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }
  const pasoStyle = activo => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '999px',
    background: activo ? '#e0f2fe' : '#f8fafc',
    color: activo ? '#0369a1' : '#64748b',
    border: `1px solid ${activo ? '#bae6fd' : '#e2e8f0'}`,
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  })
  const tabStyle = activo => ({
    border: 'none',
    borderBottom: `3px solid ${activo ? '#2563eb' : 'transparent'}`,
    background: activo ? '#eff6ff' : 'transparent',
    color: activo ? '#1d4ed8' : '#64748b',
    padding: '11px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  })

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', color: '#2563eb', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Circulación</p>
          <h1 style={{ margin: 0, fontSize: '30px', color: '#0f172a' }}>Registrar préstamo</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Selecciona un ejemplar, confirma el lector y revisa el resumen antes de guardar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
          <span style={pasoStyle(!!ejemplarSeleccionado)}><BookOpen size={16} /> Libro</span>
          <span style={pasoStyle(lectorListo)}><User size={16} /> Lector</span>
          <span style={pasoStyle(!!ejemplarSeleccionado && lectorListo)}><Check size={16} /> Confirmar</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '20px', alignItems: 'start' }}>
        <main style={{ display: 'grid', gap: '18px' }}>
          <section style={panelStyle}>
            <button
              type="button"
              onClick={() => setTipoAbierto(prev => !prev)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '16px',
                alignItems: 'center',
                textAlign: 'left',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Tipo de préstamo</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                  {tipoFormal ? 'Formal · 7 días' : 'Inmediato · regresa hoy'}
                </p>
              </div>
              <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800 }}>
                {tipoAbierto ? 'Ocultar' : 'Cambiar'} {tipoAbierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </button>

            {tipoAbierto && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: '320px' }}>
                Elige el tipo antes de buscar el libro. Puedes contraer este bloque cuando ya esté decidido.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', minWidth: '320px' }}>
                {[
                  { value: 'FORMAL', label: 'Formal', icon: CalendarDays, meta: '7 días' },
                  { value: 'EXTERNO_INMEDIATO', label: 'Inmediato', icon: Clock, meta: 'Hoy' },
                ].map(opcion => {
                  const Icon = opcion.icon
                  const activo = tipo === opcion.value
                  return (
                    <button
                      key={opcion.value}
                      onClick={() => { setTipo(opcion.value); limpiarFormulario(); setTipoAbierto(false) }}
                      style={{
                        border: `1px solid ${activo ? '#2563eb' : '#cbd5e1'}`,
                        borderRadius: '8px',
                        background: activo ? '#eff6ff' : 'white',
                        color: activo ? '#1d4ed8' : '#334155',
                        padding: '11px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        textAlign: 'left',
                      }}
                    >
                      <Icon size={18} />
                      <span style={{ display: 'grid' }}>
                        <strong style={{ fontSize: '13px' }}>{opcion.label}</strong>
                        <span style={{ fontSize: '12px', color: activo ? '#2563eb' : '#64748b' }}>{opcion.meta}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', margin: '-18px -18px 18px -18px', padding: '0 14px', background: '#fbfdff', borderRadius: '8px 8px 0 0' }}>
              <button type="button" onClick={() => setPasoActivo('libro')} style={tabStyle(pasoActivo === 'libro')}>
                <BookOpen size={16} /> Libro
              </button>
              <button type="button" onClick={() => setPasoActivo('lector')} style={tabStyle(pasoActivo === 'lector')}>
                <User size={16} /> Datos del lector
              </button>
            </div>

            <div style={{ display: pasoActivo === 'libro' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center' }}>
                <BookOpen size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Libro y ejemplar</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>Busca por título y elige una copia disponible.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: libros.length > 0 ? '14px' : 0 }}>
              <input
                type="text"
                placeholder="Buscar por título, autor, ISBN o código"
                value={busquedaLibro}
                onChange={e => {
                  setBusquedaLibro(e.target.value)
                  if (!e.target.value.trim()) {
                    setLibros([])
                    setBusquedaLibroRealizada(false)
                    setEjemplarSeleccionado(null)
                  }
                }}
                onKeyDown={e => e.key === 'Enter' && buscarLibros()}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={buscarLibros} style={iconButton}>
                <Search size={16} /> Buscar
              </button>
            </div>

            {busquedaLibroRealizada && libros.length === 0 && (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '18px', background: '#f8fafc', color: '#64748b', fontSize: '14px' }}>
                No se encontraron libros con esa búsqueda. Puedes probar con título, autor, ISBN o código de inventario, sin importar mayúsculas ni tildes.
              </div>
            )}

            {libros.length > 0 && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {libros.map(libro => {
                  const disponibles = libro.ejemplar?.filter(e => e.estado === 'DISPONIBLE') || []
                  const bloqueadoFormal = tipoFormal && !libro.categoria?.permite_prestamo_formal
                  return (
                    <article key={libro.id_titulo} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#fbfdff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{libro.titulo}</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            {libro.autor} · {libro.categoria?.nombre}
                          </p>
                        </div>
                        <span style={{
                          borderRadius: '999px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: disponibles.length > 0 && !bloqueadoFormal ? '#dcfce7' : '#fee2e2',
                          color: disponibles.length > 0 && !bloqueadoFormal ? '#166534' : '#991b1b',
                          whiteSpace: 'nowrap',
                        }}>
                          {bloqueadoFormal ? 'No formal' : `${disponibles.length} disponible(s)`}
                        </span>
                      </div>

                      {bloqueadoFormal && (
                        <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#b91c1c' }}>
                          Esta categoría no permite préstamo formal. Cambia a inmediato para usarla.
                        </p>
                      )}

                      {!bloqueadoFormal && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                          {disponibles.length === 0 ? (
                            <span style={{ fontSize: '13px', color: '#b91c1c' }}>Sin ejemplares disponibles.</span>
                          ) : (
                            disponibles.map(ej => {
                              const activo = ejemplarSeleccionado?.id_ejemplar === ej.id_ejemplar
                              return (
                                <button
                                  key={ej.id_ejemplar}
                                  onClick={() => {
                                    setEjemplarSeleccionado({ ...ej, categoria: libro.categoria, titulo: libro.titulo, autor: libro.autor })
                                    setPasoActivo('lector')
                                  }}
                                  style={{
                                    border: `1px solid ${activo ? '#16a34a' : '#cbd5e1'}`,
                                    borderRadius: '999px',
                                    background: activo ? '#16a34a' : 'white',
                                    color: activo ? 'white' : '#334155',
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {activo ? 'Seleccionado · ' : ''}{ej.codigo_inventario} · {ej.ubicacion_dewey}
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
            </div>

            <div style={{ display: pasoActivo === 'lector' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center' }}>
                <User size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Datos del lector</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {tipoFormal ? 'Usa un lector existente o registra uno nuevo.' : 'Registra a quién se entrega el libro por salida inmediata.'}
                </p>
              </div>
            </div>

            {tipoFormal && (
              <div>

                {modoLector === 'buscar' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <label style={labelStyle}>Buscar lector existente por nombre o DPI</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Nombre o DPI..."
                  value={busquedaLector}
                  onChange={e => setBusquedaLector(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarLector()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={buscarLector} style={iconButton}><Search size={16} /> Buscar</button>
              </div>

              {resultadosLector.length > 0 && (
                <div>
                  {resultadosLector.map(l => (
                    <div
                      key={l.id_lector}
                      style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'white' }}
                    >
                      <span style={{ fontSize: '13px' }}>
                        {l.nombre} {l.dpi ? `— DPI: ${l.dpi}` : ''} {l.telefono ? `— Tel: ${l.telefono}` : ''}
                      </span>
                      <button onClick={() => seleccionarLector(l)} style={{ ...buttonSecondary, padding: '7px 10px', fontSize: '13px' }}>
                        Usar lector
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {resultadosLector.length === 0 && busquedaLector && (
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>Sin resultados.</p>
              )}

              <button
                onClick={() => setModoLector('nuevo')}
                style={{ ...iconButton, marginTop: '8px', padding: '9px 12px', fontSize: '13px' }}
              >
                <UserPlus size={15} /> Registrar lector nuevo
              </button>
            </div>
          )}

          {modoLector === 'encontrado' && lectorEncontrado && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>
                ✓ Lector existente seleccionado
              </p>
              <p style={{ margin: '0', fontSize: '13px' }}>
                {lectorEncontrado.nombre} {lectorEncontrado.dpi ? `— DPI: ${lectorEncontrado.dpi}` : ''} {lectorEncontrado.telefono ? `— Tel: ${lectorEncontrado.telefono}` : ''}
              </p>
              <button
                onClick={() => { setLectorEncontrado(null); setModoLector('buscar') }}
                style={{ ...buttonSecondary, marginTop: '10px', padding: '8px 12px', fontSize: '13px' }}
              >
                Cambiar lector
              </button>
            </div>
          )}

          {modoLector === 'nuevo' && (
            <div style={{ display: 'grid', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Registrar lector nuevo</p>
                <button onClick={() => { setModoLector('buscar'); setResultadosLector([]) }} style={{ ...iconButton, padding: '8px 12px', fontSize: '13px' }}>
                  <RotateCcw size={15} /> Volver a buscar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Nombre completo *</label>
                  <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
                {!esMenor && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>DPI *</label>
                    <input style={inputStyle} value={dpi} onChange={e => setDpi(e.target.value)} />
                  </div>
                )}
                <div style={fieldStyle}>
                  <label style={labelStyle}>Teléfono *</label>
                  <input style={inputStyle} value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Dirección *</label>
                  <input style={inputStyle} value={direccion} onChange={e => setDireccion(e.target.value)} />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <input type="checkbox" checked={esMenor} onChange={e => setEsMenor(e.target.checked)} style={{ marginRight: '6px' }} />
                  Es menor de edad
                </label>
              </div>
              {esMenor && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Nombre del tutor *</label>
                    <input style={inputStyle} value={nombreTutor} onChange={e => setNombreTutor(e.target.value)} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Teléfono del tutor *</label>
                    <input style={inputStyle} value={telefonoTutor} onChange={e => setTelefonoTutor(e.target.value)} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>DPI del tutor</label>
                    <input style={inputStyle} value={dpiTutor} onChange={e => setDpiTutor(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ ...fieldStyle, borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <label style={labelStyle}>
                  <input type="checkbox" checked={esEstudiante} onChange={e => setEsEstudiante(e.target.checked)} style={{ marginRight: '6px' }} />
                  Es estudiante
                </label>
              </div>

              {esEstudiante && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Nivel educativo</label>
                    <select style={inputStyle} value={idNivel} onChange={e => setIdNivel(e.target.value)}>
                      <option value="">Seleccione...</option>
                      {niveles.map(n => (
                        <option key={n.id_nivel} value={n.id_nivel}>{n.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {idNivel && (
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Establecimiento</label>
                      <select style={inputStyle} value={idEstablecimiento} onChange={e => setIdEstablecimiento(e.target.value)}>
                        <option value="">Seleccione...</option>
                        {establecimientosFiltrados.map(e => (
                          <option key={e.id_establecimiento} value={e.id_establecimiento}>{e.nombre}</option>
                        ))}
                      </select>
                      {establecimientosFiltrados.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>
                          Sin establecimientos registrados para este nivel.
                        </p>
                      )}
                    </div>
                  )}
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Grado o ciclo</label>
                    <input style={inputStyle} placeholder="ej: Segundo Básico" value={gradoCiclo} onChange={e => setGradoCiclo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
              </div>
            )}

      {tipo === 'EXTERNO_INMEDIATO' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={nombreInmediato} onChange={e => setNombreInmediato(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>DPI de garantía (opcional)</label>
            <input style={inputStyle} value={dpiGarantia} onChange={e => setDpiGarantia(e.target.value)} />
          </div>
        </div>
      )}
            </div>
          </section>
        </main>

        <aside style={{ ...panelStyle, position: 'sticky', top: '20px' }}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: '18px', color: '#0f172a' }}>Resumen</h2>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ejemplar</p>
              {ejemplarSeleccionado ? (
                <>
                  <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{ejemplarSeleccionado.titulo || 'Libro seleccionado'}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    {ejemplarSeleccionado.codigo_inventario} · {ejemplarSeleccionado.ubicacion_dewey}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Pendiente de selección</p>
              )}
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lector</p>
              <p style={{ margin: 0, fontWeight: 800, color: lectorListo ? '#0f172a' : '#94a3b8' }}>
                {tipoFormal
                  ? lectorEncontrado?.nombre || nombre || 'Pendiente'
                  : nombreInmediato || 'Pendiente'}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {tipoFormal ? 'Préstamo formal' : 'Préstamo inmediato'}
              </p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fecha límite</p>
              <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{fechaLimitePreview}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {tipoFormal ? 'Se calcula a 7 días desde hoy.' : 'Debe regresar hoy.'}
              </p>
            </div>
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
        }}>
          {mensaje.texto}
        </p>
      )}

      <button
        onClick={registrarPrestamo}
        disabled={guardando}
        style={buttonPrimary}
      >
        {guardando ? 'Guardando...' : 'Registrar préstamo'}
      </button>
        </aside>
      </div>

      {/* MODAL EDICIÓN */}
      {prestamoEditando && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Editar préstamo</h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px 0' }}>
              Tipo: {prestamoEditando.tipo} — Solo se pueden editar campos básicos.
            </p>

            {prestamoEditando.tipo === 'EXTERNO_INMEDIATO' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Nombre del lector
                </label>
                <input
                  style={{ padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                  value={editNombreInmediato}
                  onChange={e => setEditNombreInmediato(e.target.value)}
                />
              </div>
            )}

            {prestamoEditando.tipo === 'FORMAL' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  Nombre del lector
                </label>
                <input
                  style={{ padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                  value={editNombreLector}
                  onChange={e => setEditNombreLector(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Fecha de salida
              </label>
              <input
                type="date"
                style={{ padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                value={editFechaSalida}
                onChange={e => setEditFechaSalida(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Fecha límite de devolución
              </label>
              <input
                type="date"
                style={{ padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                value={editFechaDevolucion}
                onChange={e => setEditFechaDevolucion(e.target.value)}
              />
            </div>

            {mensajeEdicion.texto && (
              <p style={{ color: mensajeEdicion.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginBottom: '12px' }}>
                {mensajeEdicion.texto}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={guardarEdicionPrestamo}
                disabled={guardandoEdicion}
                style={{ padding: '10px 20px', cursor: 'pointer', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                onClick={() => setPrestamoEditando(null)}
                style={{ padding: '10px 16px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <section style={{ ...panelStyle, marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 6px 0', color: '#2563eb', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Consulta</p>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>Historial de préstamos</h2>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Revisa, filtra y edita préstamos activos sin mezclarlo con el registro nuevo.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={filtroEstado}
            onChange={e => { setFiltroEstado(e.target.value); setPaginaH(1); cargarHistorialPrestamos(1, e.target.value, filtroPeriodo) }}
            style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="DEVUELTO">Devueltos</option>
            <option value="VENCIDO">Vencidos</option>
          </select>
          <select
            value={filtroPeriodo}
            onChange={e => { setFiltroPeriodo(e.target.value); setPaginaH(1); cargarHistorialPrestamos(1, filtroEstado, e.target.value) }}
            style={{ ...inputStyle, width: 'auto', minWidth: '170px' }}
          >
            <option value="dia">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
          </select>
          <button onClick={() => cargarHistorialPrestamos(paginaH, filtroEstado, filtroPeriodo)} style={iconButton}>
            <RotateCcw size={16} />
            Actualizar
          </button>
        </div>

        {cargandoHistorial && <p style={{ color: '#64748b', margin: 0 }}>Cargando historial...</p>}

        {!cargandoHistorial && (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              {totalH} {totalH === 1 ? 'préstamo encontrado' : 'préstamos encontrados'}
            </p>
            {historialPrestamos.length === 0 ? (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '22px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
                Sin préstamos en este período.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '760px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '12px' }}>Lector</th>
                      <th style={{ padding: '12px' }}>Libro</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Salida</th>
                      <th style={{ padding: '12px' }}>Límite</th>
                      <th style={{ padding: '12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPrestamos.map(p => {
                      const estadoColor = p.estado === 'ACTIVO'
                        ? { bg: '#fef3c7', text: '#92400e' }
                        : p.estado === 'DEVUELTO'
                          ? { bg: '#dcfce7', text: '#166534' }
                          : { bg: '#fee2e2', text: '#991b1b' }
                      return (
                        <tr key={p.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{p.lector?.nombre || p.nombre_inmediato || '—'}</td>
                          <td style={{ padding: '12px', color: '#334155' }}>{p.ejemplar?.titulo?.titulo}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{p.tipo === 'FORMAL' ? 'Formal' : 'Inmediato'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ display: 'inline-flex', padding: '5px 9px', borderRadius: '999px', background: estadoColor.bg, color: estadoColor.text, fontSize: '12px', fontWeight: 800 }}>
                              {p.estado}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_salida}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_devolucion_esperada || '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {p.estado === 'ACTIVO' && (
                              <button
                                onClick={() => abrirEdicion(p)}
                                style={{ ...buttonSecondary, padding: '7px 10px', fontSize: '13px' }}
                              >
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {totalPaginasH > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => { setPaginaH(paginaH - 1); cargarHistorialPrestamos(paginaH - 1, filtroEstado, filtroPeriodo) }}
                  disabled={paginaH === 1} style={{ ...buttonSecondary, opacity: paginaH === 1 ? 0.55 : 1 }}>Anterior</button>
                <span style={{ fontSize: '14px', color: '#475569' }}>Página {paginaH} de {totalPaginasH}</span>
                <button onClick={() => { setPaginaH(paginaH + 1); cargarHistorialPrestamos(paginaH + 1, filtroEstado, filtroPeriodo) }}
                  disabled={paginaH === totalPaginasH} style={{ ...buttonSecondary, opacity: paginaH === totalPaginasH ? 0.55 : 1 }}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </section>

    </div>
  )
}
