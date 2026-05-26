import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const POR_PAGINA = 20

export default function Lectores() {
  const [busqueda, setBusqueda] = useState('')
  const [lectores, setLectores] = useState([])
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [vista, setVista] = useState('lista') // lista | detalle | editar
  const [lectorSeleccionado, setLectorSeleccionado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)

  // Campos edición
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

  async function cargarLectores(pag, termino) {
  setCargando(true)

  const { data, error } = await supabase
    .from('lector')
    .select('id_lector, nombre, dpi, telefono, direccion, es_menor, nombre_tutor, telefono_tutor, dpi_tutor, id_nivel, id_establecimiento, grado_ciclo, registrado_en', { count: 'exact' })
    .order('id_lector', { ascending: false })

  if (error) {
    console.error('Error cargando lectores:', error)
    setLectores([])
    setTotal(0)
    setCargando(false)
    return
  }

  const lista = data || []
  const terminoNormalizado = termino.trim().toLowerCase()
  const filtrados = terminoNormalizado
    ? lista.filter(lector => lector.nombre?.toLowerCase().includes(terminoNormalizado))
    : lista
  const desde = (pag - 1) * POR_PAGINA
  const hasta = desde + POR_PAGINA

  setLectores(filtrados.slice(desde, hasta))
  setTotal(filtrados.length)
  setCargando(false)
}

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
      cargarLectores(1, '')
    }

    cargarDatosIniciales()
    return () => { activo = false }
  }, [])

  function handleBuscar() { setPagina(1); cargarLectores(1, busqueda) }
  function handleLimpiar() { setBusqueda(''); setPagina(1); cargarLectores(1, '') }
  function handlePagina(n) { setPagina(n); cargarLectores(n, busqueda) }

  async function verDetalle(lector) {
    setLectorSeleccionado(lector)
    setVista('detalle')
    setCargandoHistorial(true)
    const { data } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida,
        fecha_devolucion_esperada, fecha_devolucion_real,
        ejemplar (codigo_inventario, titulo (titulo))
      `)
      .eq('id_lector', lector.id_lector)
      .order('fecha_salida', { ascending: false })
    setHistorial(data || [])
    setCargandoHistorial(false)
  }

  function abrirEdicion(lector) {
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
    if (!editNombre.trim()) {
      setMensaje({ texto: 'El nombre es obligatorio.', error: true })
      return
    }
    setGuardando(true)
    const { error } = await supabase
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
      .eq('id_lector', lectorSeleccionado.id_lector)

    if (error) {
      setMensaje({ texto: 'Error al guardar.', error: true })
    } else {
      const { data } = await supabase.from('lector').select('*').eq('id_lector', lectorSeleccionado.id_lector).single()
      setLectorSeleccionado(data)
      setMensaje({ texto: 'Datos actualizados correctamente.', error: false })
      cargarLectores(pagina, busqueda)
      setVista('detalle')
    }
    setGuardando(false)
  }

  function nombreNivel(id) { return niveles.find(n => n.id_nivel === id)?.nombre || '—' }
  function nombreEstablecimiento(id) { return establecimientos.find(e => e.id_establecimiento === id)?.nombre || '—' }

  function colorEstado(estado) {
    if (estado === 'ACTIVO') return '#d97706'
    if (estado === 'DEVUELTO') return '#16a34a'
    return '#dc2626'
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const establecimientosFiltrados = editIdNivel
    ? establecimientos.filter(e =>
        e.activo &&
        e.establecimiento_nivel?.some(en => en.id_nivel === parseInt(editIdNivel))
      )
    : []
  const inputStyle = { padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Lectores</h1>

      {/* LISTA */}
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <input type="text" placeholder="Filtrar por nombre..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              style={{ padding: '8px', fontSize: '14px', flex: 1 }} />
            <button onClick={handleBuscar} style={{ padding: '8px 16px', cursor: 'pointer' }}>Buscar</button>
            <button onClick={handleLimpiar} style={{ padding: '8px 16px', cursor: 'pointer' }}>Limpiar</button>
          </div>

          {cargando && <p>Cargando...</p>}

          {!cargando && (
            <>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                {total} {total === 1 ? 'lector' : 'lectores'}
                {totalPaginas > 1 ? ` — Página ${pagina} de ${totalPaginas}` : ''}
              </p>
              {lectores.length === 0 ? (
                <p style={{ color: '#666' }}>Sin lectores registrados.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Nombre</th>
                      <th style={{ padding: '8px' }}>DPI</th>
                      <th style={{ padding: '8px' }}>Teléfono</th>
                      <th style={{ padding: '8px' }}>Menor</th>
                      <th style={{ padding: '8px' }}>Estudiante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectores.map(l => (
                      <tr
                        key={l.id_lector}
                        onClick={() => verDetalle(l)}
                        style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '8px', color: '#1d4ed8', textDecoration: 'underline' }}>{l.nombre}</td>
                        <td style={{ padding: '8px' }}>{l.dpi || '—'}</td>
                        <td style={{ padding: '8px' }}>{l.telefono || '—'}</td>
                        <td style={{ padding: '8px' }}>{l.es_menor ? 'Sí' : 'No'}</td>
                        <td style={{ padding: '8px' }}>{l.id_nivel ? 'Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                  <button onClick={() => handlePagina(pagina - 1)} disabled={pagina === 1}
                    style={{ padding: '6px 14px', cursor: pagina === 1 ? 'default' : 'pointer' }}>← Anterior</button>
                  <span style={{ fontSize: '14px' }}>Página {pagina} de {totalPaginas}</span>
                  <button onClick={() => handlePagina(pagina + 1)} disabled={pagina === totalPaginas}
                    style={{ padding: '6px 14px', cursor: pagina === totalPaginas ? 'default' : 'pointer' }}>Siguiente →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* DETALLE */}
      {vista === 'detalle' && lectorSeleccionado && (
        <div>
          <button onClick={() => setVista('lista')} style={{ marginBottom: '16px', padding: '6px 14px', cursor: 'pointer' }}>
            ← Volver
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>{lectorSeleccionado.nombre}</h2>
            <button onClick={() => abrirEdicion(lectorSeleccionado)} style={{ padding: '8px 16px', cursor: 'pointer', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '4px' }}>
              Editar datos
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '14px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '6px' }}>
            <p style={{ margin: '4px 0' }}><strong>DPI:</strong> {lectorSeleccionado.dpi || '—'}</p>
            <p style={{ margin: '4px 0' }}><strong>Teléfono:</strong> {lectorSeleccionado.telefono || '—'}</p>
            <p style={{ margin: '4px 0', gridColumn: '1/-1' }}><strong>Dirección:</strong> {lectorSeleccionado.direccion || '—'}</p>
            <p style={{ margin: '4px 0' }}><strong>Menor de edad:</strong> {lectorSeleccionado.es_menor ? 'Sí' : 'No'}</p>
            {lectorSeleccionado.es_menor && (
              <>
                <p style={{ margin: '4px 0' }}><strong>Tutor:</strong> {lectorSeleccionado.nombre_tutor || '—'}</p>
                <p style={{ margin: '4px 0' }}><strong>Tel. tutor:</strong> {lectorSeleccionado.telefono_tutor || '—'}</p>
                <p style={{ margin: '4px 0' }}><strong>DPI tutor:</strong> {lectorSeleccionado.dpi_tutor || '—'}</p>
              </>
            )}
            {lectorSeleccionado.id_nivel && (
              <>
                <p style={{ margin: '4px 0' }}><strong>Nivel:</strong> {nombreNivel(lectorSeleccionado.id_nivel)}</p>
                <p style={{ margin: '4px 0' }}><strong>Establecimiento:</strong> {nombreEstablecimiento(lectorSeleccionado.id_establecimiento)}</p>
                <p style={{ margin: '4px 0' }}><strong>Grado/Ciclo:</strong> {lectorSeleccionado.grado_ciclo || '—'}</p>
              </>
            )}
          </div>

          <h3>Historial de préstamos</h3>
          {cargandoHistorial && <p>Cargando...</p>}
          {!cargandoHistorial && historial.length === 0 && <p style={{ color: '#666' }}>Sin préstamos registrados.</p>}
          {!cargandoHistorial && historial.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Libro</th>
                  <th style={{ padding: '8px' }}>Tipo</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px' }}>Salida</th>
                  <th style={{ padding: '8px' }}>Límite</th>
                  <th style={{ padding: '8px' }}>Devuelto</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(p => (
                  <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                    <td style={{ padding: '8px' }}>{p.tipo}</td>
                    <td style={{ padding: '8px', color: colorEstado(p.estado), fontWeight: 'bold' }}>{p.estado}</td>
                    <td style={{ padding: '8px' }}>{p.fecha_salida}</td>
                    <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada || '—'}</td>
                    <td style={{ padding: '8px' }}>{p.fecha_devolucion_real || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EDICIÓN */}
      {vista === 'editar' && lectorSeleccionado && (
        <div style={{ maxWidth: '560px' }}>
          <button onClick={() => setVista('detalle')} style={{ marginBottom: '16px', padding: '6px 14px', cursor: 'pointer' }}>
            ← Cancelar
          </button>
          <h2>Editar: {lectorSeleccionado.nombre}</h2>

          {mensaje.texto && (
            <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginBottom: '12px' }}>
              {mensaje.texto}
            </p>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre completo *</label>
            <input style={inputStyle} value={editNombre} onChange={e => setEditNombre(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              <input type="checkbox" checked={editEsMenor} onChange={e => setEditEsMenor(e.target.checked)} style={{ marginRight: '6px' }} />
              Es menor de edad
            </label>
          </div>
          {!editEsMenor && (
            <div style={fieldStyle}>
              <label style={labelStyle}>DPI</label>
              <input style={inputStyle} value={editDpi} onChange={e => setEditDpi(e.target.value)} />
            </div>
          )}
          {editEsMenor && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Nombre del tutor</label>
                <input style={inputStyle} value={editNombreTutor} onChange={e => setEditNombreTutor(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Teléfono del tutor</label>
                <input style={inputStyle} value={editTelefonoTutor} onChange={e => setEditTelefonoTutor(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>DPI del tutor</label>
                <input style={inputStyle} value={editDpiTutor} onChange={e => setEditDpiTutor(e.target.value)} />
              </div>
            </>
          )}
          <div style={fieldStyle}>
            <label style={labelStyle}>Teléfono</label>
            <input style={inputStyle} value={editTelefono} onChange={e => setEditTelefono(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Dirección</label>
            <input style={inputStyle} value={editDireccion} onChange={e => setEditDireccion(e.target.value)} />
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '12px' }}>
            <label style={labelStyle}>
              <input type="checkbox" checked={editEsEstudiante} onChange={e => setEditEsEstudiante(e.target.checked)} style={{ marginRight: '6px' }} />
              Es estudiante
            </label>
          </div>

          {editEsEstudiante && (
            <>
              <div style={fieldStyle}>
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
              {editIdNivel && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Establecimiento</label>
                  <select style={inputStyle} value={editIdEstablecimiento} onChange={e => setEditIdEstablecimiento(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {establecimientosFiltrados.map(e => <option key={e.id_establecimiento} value={e.id_establecimiento}>{e.nombre}</option>)}
                  </select>
                  {establecimientosFiltrados.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>Sin establecimientos para este nivel.</p>
                  )}
                </div>
              )}
              <div style={fieldStyle}>
                <label style={labelStyle}>Grado o ciclo</label>
                <input style={inputStyle} placeholder="ej: Segundo Básico" value={editGradoCiclo} onChange={e => setEditGradoCiclo(e.target.value)} />
              </div>
            </>
          )}

          <button onClick={guardarEdicion} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}
