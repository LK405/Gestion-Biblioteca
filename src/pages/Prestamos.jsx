import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const POR_PAGINA_H = 10

export default function Prestamos() {
  const { usuario } = useAuth()
  const location = useLocation()

  const [tipo, setTipo] = useState('FORMAL')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)

  // Búsqueda de libro
  const [busquedaLibro, setBusquedaLibro] = useState('')
  const [libros, setLibros] = useState([])
  const [ejemplarSeleccionado, setEjemplarSeleccionado] = useState(null)

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
    if (!busquedaLibro.trim()) return
    const { data } = await supabase
      .from('titulo')
      .select(`
        id_titulo, titulo, autor,
        categoria (nombre, permite_prestamo_formal),
        ejemplar (id_ejemplar, codigo_inventario, ubicacion_dewey, estado)
      `)
      .eq('activo', true)
      .ilike('titulo', `%${busquedaLibro}%`)
      .limit(10)
    setLibros(data || [])
    setEjemplarSeleccionado(null)
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
    setBusquedaLibro(''); setLibros([]); setEjemplarSeleccionado(null)
    setNombre(''); setDpi(''); setTelefono(''); setDireccion('')
    setEsMenor(false); setNombreTutor(''); setTelefonoTutor(''); setDpiTutor('')
    setNombreInmediato(''); setDpiGarantia('')
    setBusquedaLector(''); setResultadosLector([]); setLectorEncontrado(null)
    setModoLector('buscar'); setEsEstudiante(false)
    setIdNivel(''); setIdEstablecimiento(''); setGradoCiclo('')
  }

  const inputStyle = { padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <h1>Registro de préstamos</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Tipo de préstamo</label>
        <select value={tipo} onChange={e => { setTipo(e.target.value); limpiarFormulario() }} style={{ padding: '8px', fontSize: '14px' }}>
          <option value="FORMAL">Formal (7 días)</option>
          <option value="EXTERNO_INMEDIATO">Externo inmediato</option>
        </select>
      </div>

      {/* Búsqueda de libro */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Buscar libro</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Título del libro..."
            value={busquedaLibro}
            onChange={e => setBusquedaLibro(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarLibros()}
            style={{ ...inputStyle, width: 'auto', flex: 1 }}
          />
          <button onClick={buscarLibros} style={{ padding: '8px 16px', cursor: 'pointer' }}>Buscar</button>
        </div>

        {libros.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {libros.map(libro => {
              const disponibles = libro.ejemplar?.filter(e => e.estado === 'DISPONIBLE') || []
              return (
                <div key={libro.id_titulo} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{libro.titulo}</p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                    {libro.autor} — {libro.categoria?.nombre}
                    {tipo === 'FORMAL' && !libro.categoria?.permite_prestamo_formal &&
                      <span style={{ color: '#dc2626', marginLeft: '8px' }}>(No permite préstamo formal)</span>
                    }
                  </p>
                  {disponibles.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#dc2626' }}>Sin ejemplares disponibles</p>
                  ) : (
                    disponibles.map(ej => (
                      <button
                        key={ej.id_ejemplar}
                        onClick={() => setEjemplarSeleccionado({ ...ej, categoria: libro.categoria })}
                        style={{
                          padding: '4px 10px', marginRight: '6px', cursor: 'pointer', fontSize: '13px',
                          background: ejemplarSeleccionado?.id_ejemplar === ej.id_ejemplar ? '#16a34a' : '',
                          color: ejemplarSeleccionado?.id_ejemplar === ej.id_ejemplar ? 'white' : '',
                        }}
                      >
                        {ej.codigo_inventario} — {ej.ubicacion_dewey}
                      </button>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {ejemplarSeleccionado && (
          <p style={{ marginTop: '8px', color: '#16a34a', fontWeight: 'bold', fontSize: '14px' }}>
            ✓ Ejemplar seleccionado: {ejemplarSeleccionado.codigo_inventario}
          </p>
        )}
      </div>

      {/* Sección lector formal */}
      {tipo === 'FORMAL' && (
        <div>
          <h3 style={{ marginBottom: '12px' }}>Datos del lector</h3>

          {modoLector === 'buscar' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
              <label style={labelStyle}>Buscar lector existente por nombre o DPI</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Nombre o DPI..."
                  value={busquedaLector}
                  onChange={e => setBusquedaLector(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarLector()}
                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                />
                <button onClick={buscarLector} style={{ padding: '8px 16px', cursor: 'pointer' }}>Buscar</button>
              </div>

              {resultadosLector.length > 0 && (
                <div>
                  {resultadosLector.map(l => (
                    <div
                      key={l.id_lector}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontSize: '13px' }}>
                        {l.nombre} {l.dpi ? `— DPI: ${l.dpi}` : ''} {l.telefono ? `— Tel: ${l.telefono}` : ''}
                      </span>
                      <button onClick={() => seleccionarLector(l)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>
                        Seleccionar
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
                style={{ marginTop: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                + Registrar lector nuevo
              </button>
            </div>
          )}

          {modoLector === 'encontrado' && lectorEncontrado && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>
                ✓ Lector existente seleccionado
              </p>
              <p style={{ margin: '0', fontSize: '13px' }}>
                {lectorEncontrado.nombre} {lectorEncontrado.dpi ? `— DPI: ${lectorEncontrado.dpi}` : ''} {lectorEncontrado.telefono ? `— Tel: ${lectorEncontrado.telefono}` : ''}
              </p>
              <button
                onClick={() => { setLectorEncontrado(null); setModoLector('buscar') }}
                style={{ marginTop: '8px', padding: '4px 12px', cursor: 'pointer', fontSize: '13px' }}
              >
                Cambiar lector
              </button>
            </div>
          )}

          {modoLector === 'nuevo' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Registrar lector nuevo</p>
                <button onClick={() => { setModoLector('buscar'); setResultadosLector([]) }} style={{ padding: '4px 12px', cursor: 'pointer', fontSize: '13px' }}>
                  ← Volver a buscar
                </button>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Nombre completo *</label>
                <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <input type="checkbox" checked={esMenor} onChange={e => setEsMenor(e.target.checked)} style={{ marginRight: '6px' }} />
                  Es menor de edad
                </label>
              </div>
              {!esMenor && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>DPI *</label>
                  <input style={inputStyle} value={dpi} onChange={e => setDpi(e.target.value)} />
                </div>
              )}
              {esMenor && (
                <>
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
                </>
              )}
              <div style={fieldStyle}>
                <label style={labelStyle}>Teléfono *</label>
                <input style={inputStyle} value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Dirección *</label>
                <input style={inputStyle} value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>

              <div style={{ ...fieldStyle, borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                <label style={labelStyle}>
                  <input type="checkbox" checked={esEstudiante} onChange={e => setEsEstudiante(e.target.checked)} style={{ marginRight: '6px' }} />
                  Es estudiante
                </label>
              </div>

              {esEstudiante && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tipo === 'EXTERNO_INMEDIATO' && (
        <div>
          <h3 style={{ marginBottom: '12px' }}>Datos del lector</h3>
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

      {mensaje.texto && (
        <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginTop: '16px' }}>
          {mensaje.texto}
        </p>
      )}

      <button
        onClick={registrarPrestamo}
        disabled={guardando}
        style={{ marginTop: '16px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}
      >
        {guardando ? 'Guardando...' : 'Registrar préstamo'}
      </button>

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

      {/* HISTORIAL */}
      <div style={{ marginTop: '48px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Historial de préstamos</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={filtroEstado}
            onChange={e => { setFiltroEstado(e.target.value); setPaginaH(1); cargarHistorialPrestamos(1, e.target.value, filtroPeriodo) }}
            style={{ padding: '8px', fontSize: '14px' }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="DEVUELTO">Devueltos</option>
            <option value="VENCIDO">Vencidos</option>
          </select>
          <select
            value={filtroPeriodo}
            onChange={e => { setFiltroPeriodo(e.target.value); setPaginaH(1); cargarHistorialPrestamos(1, filtroEstado, e.target.value) }}
            style={{ padding: '8px', fontSize: '14px' }}
          >
            <option value="dia">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
          </select>
          <button onClick={() => cargarHistorialPrestamos(paginaH, filtroEstado, filtroPeriodo)} style={{ padding: '8px 14px', cursor: 'pointer' }}>
            Actualizar
          </button>
        </div>

        {cargandoHistorial && <p>Cargando...</p>}

        {!cargandoHistorial && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{totalH} préstamos</p>
            {historialPrestamos.length === 0 ? (
              <p style={{ color: '#666' }}>Sin préstamos en este período.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Estado</th>
                    <th style={{ padding: '8px' }}>Fecha salida</th>
                    <th style={{ padding: '8px' }}>Fecha límite</th>
                    <th style={{ padding: '8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {historialPrestamos.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre || p.nombre_inmediato || '—'}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{p.tipo}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: p.estado === 'ACTIVO' ? '#d97706' : p.estado === 'DEVUELTO' ? '#16a34a' : '#dc2626' }}>
                        {p.estado}
                      </td>
                      <td style={{ padding: '8px' }}>{p.fecha_salida}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        {p.estado === 'ACTIVO' && (
                          <button
                            onClick={() => abrirEdicion(p)}
                            style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {Math.ceil(totalH / POR_PAGINA_H) > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                <button onClick={() => { setPaginaH(paginaH - 1); cargarHistorialPrestamos(paginaH - 1, filtroEstado, filtroPeriodo) }}
                  disabled={paginaH === 1} style={{ padding: '6px 14px', cursor: paginaH === 1 ? 'default' : 'pointer' }}>← Anterior</button>
                <span style={{ fontSize: '14px' }}>Página {paginaH} de {Math.ceil(totalH / POR_PAGINA_H)}</span>
                <button onClick={() => { setPaginaH(paginaH + 1); cargarHistorialPrestamos(paginaH + 1, filtroEstado, filtroPeriodo) }}
                  disabled={paginaH === Math.ceil(totalH / POR_PAGINA_H)} style={{ padding: '6px 14px', cursor: 'pointer' }}>Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}