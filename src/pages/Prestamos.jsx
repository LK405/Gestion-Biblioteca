import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function Prestamos() {
  const { usuario } = useAuth()
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

  useEffect(() => {
    cargarNiveles()
    cargarEstablecimientos()
  }, [])

  useEffect(() => {
    if (idNivel) {
      setEstablecimientosFiltrados(establecimientos.filter(e => e.id_nivel === parseInt(idNivel) && e.activo))
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
    const { data } = await supabase.from('establecimiento').select('*').eq('activo', true)
    setEstablecimientos(data || [])
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

      if (tipo === 'FORMAL') {
        if (lectorEncontrado) {
          // Lector existente — verificar préstamo activo
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
          // Lector nuevo
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

      const hoy = new Date()
      const fechaDevolucion = new Date()
      fechaDevolucion.setDate(hoy.getDate() + 7)

      const { error: errorPrestamo } = await supabase
        .from('prestamo')
        .insert({
          id_ejemplar: ejemplarSeleccionado.id_ejemplar,
          id_lector: idLector,
          id_usuario_registra: usuario.id_usuario,
          tipo,
          estado: 'ACTIVO',
          fecha_salida: hoy.toISOString().split('T')[0],
          hora_salida: tipo === 'EXTERNO_INMEDIATO' ? hoy.toTimeString().split(' ')[0] : null,
          fecha_devolucion_esperada: tipo === 'FORMAL' ? fechaDevolucion.toISOString().split('T')[0] : null,
          nombre_inmediato: tipo === 'EXTERNO_INMEDIATO' ? nombreInmediato : null,
          dpi_garantia: tipo === 'EXTERNO_INMEDIATO' ? dpiGarantia || null : null,
        })

      if (errorPrestamo) throw errorPrestamo

      await supabase
        .from('ejemplar')
        .update({ estado: 'PRESTADO' })
        .eq('id_ejemplar', ejemplarSeleccionado.id_ejemplar)

      setMensaje({ texto: 'Préstamo registrado correctamente.', error: false })
      limpiarFormulario()
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

          {/* Búsqueda lector existente */}
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
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>
                  Sin resultados.
                </p>
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

              {/* Datos educativos */}
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
    </div>
  )
}