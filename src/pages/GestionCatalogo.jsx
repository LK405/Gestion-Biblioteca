import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function GestionCatalogo() {
  const { usuario } = useAuth()
  const [vista, setVista] = useState('titulos')
  const [categorias, setCategorias] = useState([])
  const [titulos, setTitulos] = useState([])
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)

  // Título — nuevo y edición
  const [editandoTitulo, setEditandoTitulo] = useState(null)
  const [tituloNombre, setTituloNombre] = useState('')
  const [autor, setAutor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [anio, setAnio] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  // Ejemplar — múltiples
  const [idTituloEjemplar, setIdTituloEjemplar] = useState('')
  const [ubicacionDewey, setUbicacionDewey] = useState('')
  const [cantidadEjemplares, setCantidadEjemplares] = useState(1)
  const [codigosEjemplares, setCodigosEjemplares] = useState([''])
  const [autoGenerar, setAutoGenerar] = useState(false)

  // Configuración multa
  const [config, setConfig] = useState(null)
  const [cfgBase, setCfgBase] = useState('')
  const [cfgDia, setCfgDia] = useState('')
  const [cfgLeve, setCfgLeve] = useState('')
  const [cfgGrave, setCfgGrave] = useState('')

  // Establecimiento — nuevo y edición
  const [editandoEstablecimiento, setEditandoEstablecimiento] = useState(null)
  const [nombreEstablecimiento, setNombreEstablecimiento] = useState('')
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState([])

  useEffect(() => {
    cargarCategorias()
    cargarTitulos()
    cargarNiveles()
    cargarEstablecimientos()
  }, [])

  useEffect(() => {
    if (vista === 'configuracion') cargarConfig()
  }, [vista])

  useEffect(() => {
    if (autoGenerar) generarCodigosAuto()
  }, [cantidadEjemplares, autoGenerar])

  async function cargarCategorias() {
    const { data } = await supabase.from('categoria').select('*').order('codigo_dewey')
    setCategorias(data || [])
  }

  async function cargarTitulos() {
    const { data } = await supabase
      .from('titulo')
      .select('id_titulo, titulo, autor, isbn, anio_publicacion, imagen_url, activo, id_categoria, categoria (nombre, codigo_dewey), ejemplar (id_ejemplar, estado)')
      .order('titulo')
    setTitulos(data || [])
  }

  async function cargarNiveles() {
    const { data } = await supabase.from('niveleducativo').select('*').order('id_nivel')
    setNiveles(data || [])
  }

  async function cargarEstablecimientos() {
    const { data } = await supabase
      .from('establecimiento')
      .select(`
        id_establecimiento, nombre, activo,
        establecimiento_nivel (id_nivel, niveleducativo (nombre))
      `)
      .order('nombre')
    setEstablecimientos(data || [])
  }

  async function cargarConfig() {
    const { data } = await supabase.from('configuracionmulta').select('*').single()
    if (data) {
      setConfig(data)
      setCfgBase(data.cargo_base_vencimiento)
      setCfgDia(data.cargo_por_dia)
      setCfgLeve(data.cargo_daño_leve)
      setCfgGrave(data.cargo_daño_grave)
    }
  }

  async function obtenerUltimoCodigoEJ() {
    const { data } = await supabase
      .from('ejemplar')
      .select('codigo_inventario')
      .ilike('codigo_inventario', 'EJ-%')
      .order('codigo_inventario', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) return 0
    const ultimo = data[0].codigo_inventario
    const num = parseInt(ultimo.replace('EJ-', ''))
    return isNaN(num) ? 0 : num
  }

  async function generarCodigosAuto() {
    const ultimo = await obtenerUltimoCodigoEJ()
    const nuevos = Array.from({ length: cantidadEjemplares }, (_, i) => {
      const num = ultimo + i + 1
      return `EJ-${String(num).padStart(3, '0')}`
    })
    setCodigosEjemplares(nuevos)
  }

  function handleCantidad(val) {
    const n = Math.min(20, Math.max(1, parseInt(val) || 1))
    setCantidadEjemplares(n)
    if (!autoGenerar) {
      setCodigosEjemplares(prev => {
        const arr = [...prev]
        while (arr.length < n) arr.push('')
        return arr.slice(0, n)
      })
    }
  }

  function handleCodigo(i, val) {
    setCodigosEjemplares(prev => {
      const arr = [...prev]
      arr[i] = val
      return arr
    })
  }

  // --- Título ---
  function abrirNuevoTitulo() {
    setEditandoTitulo(null)
    setTituloNombre(''); setAutor(''); setIsbn(''); setAnio(''); setIdCategoria(''); setImagenUrl('')
    setVista('nuevo_titulo')
    setMensaje({ texto: '', error: false })
  }

  function abrirEditarTitulo(t) {
    setEditandoTitulo(t)
    setTituloNombre(t.titulo)
    setAutor(t.autor)
    setIsbn(t.isbn || '')
    setAnio(t.anio_publicacion || '')
    setIdCategoria(String(t.id_categoria))
    setImagenUrl(t.imagen_url || '')
    setVista('nuevo_titulo')
    setMensaje({ texto: '', error: false })
  }

  async function guardarTitulo() {
    if (!tituloNombre.trim() || !autor.trim() || !idCategoria) {
      setMensaje({ texto: 'Título, autor y categoría son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    const payload = {
      titulo: tituloNombre, autor,
      isbn: isbn || null,
      anio_publicacion: anio ? parseInt(anio) : null,
      id_categoria: parseInt(idCategoria),
      imagen_url: imagenUrl || null,
    }
    let error
    if (editandoTitulo) {
      ;({ error } = await supabase.from('titulo').update(payload).eq('id_titulo', editandoTitulo.id_titulo))
    } else {
      ;({ error } = await supabase.from('titulo').insert({ ...payload, activo: true }))
    }
    if (error) {
      setMensaje({ texto: 'Error al guardar. Verifique los datos.', error: true })
    } else {
      setMensaje({ texto: editandoTitulo ? 'Título actualizado.' : 'Título registrado.', error: false })
      setTimeout(() => setMensaje({ texto: '', error: false }), 3000)
      setEditandoTitulo(null)
      setTituloNombre(''); setAutor(''); setIsbn(''); setAnio(''); setIdCategoria(''); setImagenUrl('')
      cargarTitulos()
    }
    setGuardando(false)
  }

  async function darDeBajaTitulo(id) {
    if (!confirm('¿Dar de baja este título?')) return
    await supabase.from('titulo').update({ activo: false }).eq('id_titulo', id)
    cargarTitulos()
  }

  // --- Ejemplar ---
  async function guardarEjemplares() {
    if (!idTituloEjemplar || !ubicacionDewey.trim()) {
      setMensaje({ texto: 'Título y ubicación Dewey son obligatorios.', error: true })
      return
    }
    const codigos = codigosEjemplares.slice(0, cantidadEjemplares)
    if (codigos.some(c => !c.trim())) {
      setMensaje({ texto: 'Todos los códigos de inventario son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    const filas = codigos.map(c => ({
      id_titulo: parseInt(idTituloEjemplar),
      codigo_inventario: c.trim(),
      ubicacion_dewey: ubicacionDewey,
      estado: 'DISPONIBLE',
    }))
    const { error } = await supabase.from('ejemplar').insert(filas)
    if (error) {
      setMensaje({ texto: 'Error al guardar. Algún código puede estar duplicado.', error: true })
    } else {
      setMensaje({ texto: `${cantidadEjemplares} ejemplar(es) registrado(s).`, error: false })
      setTimeout(() => setMensaje({ texto: '', error: false }), 3000)
      setIdTituloEjemplar(''); setUbicacionDewey(''); setCantidadEjemplares(1)
      setCodigosEjemplares(['']); setAutoGenerar(false)
      cargarTitulos()
    }
    setGuardando(false)
  }

  // --- Establecimiento ---
  function abrirNuevoEstablecimiento() {
    setEditandoEstablecimiento(null)
    setNombreEstablecimiento('')
    setNivelesSeleccionados([])
    setVista('establecimientos')
    setMensaje({ texto: '', error: false })
  }

  function abrirEditarEstablecimiento(est) {
    setEditandoEstablecimiento(est)
    setNombreEstablecimiento(est.nombre)
    setNivelesSeleccionados(est.establecimiento_nivel?.map(en => en.id_nivel) || [])
    setMensaje({ texto: '', error: false })
  }

  function toggleNivel(idNivel) {
    setNivelesSeleccionados(prev =>
      prev.includes(idNivel) ? prev.filter(n => n !== idNivel) : [...prev, idNivel]
    )
  }

  async function guardarEstablecimiento() {
    if (!nombreEstablecimiento.trim() || nivelesSeleccionados.length === 0) {
      setMensaje({ texto: 'Nombre y al menos un nivel son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    let idEst

    if (editandoEstablecimiento) {
      const { error } = await supabase
        .from('establecimiento')
        .update({ nombre: nombreEstablecimiento })
        .eq('id_establecimiento', editandoEstablecimiento.id_establecimiento)
      if (error) {
        setMensaje({ texto: 'Error al actualizar.', error: true })
        setGuardando(false)
        return
      }
      idEst = editandoEstablecimiento.id_establecimiento
      await supabase.from('establecimiento_nivel').delete().eq('id_establecimiento', idEst)
    } else {
      const { data, error } = await supabase
        .from('establecimiento')
        .insert({ nombre: nombreEstablecimiento, activo: true })
        .select('id_establecimiento')
        .single()
      if (error) {
        setMensaje({ texto: 'Error al guardar.', error: true })
        setGuardando(false)
        return
      }
      idEst = data.id_establecimiento
    }

    const filas = nivelesSeleccionados.map(idNivel => ({ id_establecimiento: idEst, id_nivel: idNivel }))
    await supabase.from('establecimiento_nivel').insert(filas)

    setMensaje({ texto: editandoEstablecimiento ? 'Establecimiento actualizado.' : 'Establecimiento registrado.', error: false })
    setTimeout(() => setMensaje({ texto: '', error: false }), 3000)
    setEditandoEstablecimiento(null)
    setNombreEstablecimiento('')
    setNivelesSeleccionados([])
    cargarEstablecimientos()
    setGuardando(false)
  }

  async function darDeBajaEstablecimiento(id) {
    if (!confirm('¿Dar de baja este establecimiento?')) return
    await supabase.from('establecimiento').update({ activo: false }).eq('id_establecimiento', id)
    cargarEstablecimientos()
  }

  // --- Config multa ---
  async function guardarConfig() {
    setGuardando(true)
    const { error } = await supabase
      .from('configuracionmulta')
      .update({
        cargo_base_vencimiento: parseFloat(cfgBase),
        cargo_por_dia: parseFloat(cfgDia),
        cargo_daño_leve: parseFloat(cfgLeve),
        cargo_daño_grave: parseFloat(cfgGrave),
        actualizado_por: usuario.id_usuario,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id_config', config.id_config)
    setMensaje(error
      ? { texto: 'Error al guardar configuración.', error: true }
      : { texto: 'Configuración actualizada.', error: false }
    )
    if (!error) setTimeout(() => setMensaje({ texto: '', error: false }), 3000)
    setGuardando(false)
  }

  const inputStyle = { padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }
  const tabStyle = (activo) => ({
    padding: '8px 14px', cursor: 'pointer', marginRight: '4px', marginBottom: '4px',
    background: activo ? '#1d4ed8' : '#e5e7eb',
    color: activo ? 'white' : 'black',
    border: 'none', borderRadius: '4px', fontSize: '13px'
  })

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <h1>Gestión de catálogo</h1>

      <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        <button style={tabStyle(vista === 'titulos')} onClick={() => { setVista('titulos'); setMensaje({ texto: '', error: false }) }}>Ver títulos</button>
        <button style={tabStyle(vista === 'nuevo_titulo')} onClick={abrirNuevoTitulo}>Nuevo título</button>
        <button style={tabStyle(vista === 'nuevo_ejemplar')} onClick={() => { setVista('nuevo_ejemplar'); setMensaje({ texto: '', error: false }) }}>Nuevo ejemplar</button>
        <button style={tabStyle(vista === 'establecimientos')} onClick={() => { setVista('establecimientos'); setEditandoEstablecimiento(null); setNombreEstablecimiento(''); setNivelesSeleccionados([]); setMensaje({ texto: '', error: false }) }}>Establecimientos</button>
        <button style={tabStyle(vista === 'configuracion')} onClick={() => { setVista('configuracion'); setMensaje({ texto: '', error: false }) }}>Config. multas</button>
      </div>

      {mensaje.texto && (
        <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginBottom: '16px' }}>
          {mensaje.texto}
        </p>
      )}

      {/* TÍTULOS */}
      {vista === 'titulos' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Título</th>
              <th style={{ padding: '8px' }}>Autor</th>
              <th style={{ padding: '8px' }}>Categoría</th>
              <th style={{ padding: '8px' }}>Ejemplares</th>
              <th style={{ padding: '8px' }}>Estado</th>
              <th style={{ padding: '8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {titulos.map(t => (
              <tr key={t.id_titulo} style={{ borderBottom: '1px solid #eee', opacity: t.activo ? 1 : 0.5 }}>
                <td style={{ padding: '8px' }}>{t.titulo}</td>
                <td style={{ padding: '8px' }}>{t.autor}</td>
                <td style={{ padding: '8px' }}>{t.categoria?.nombre}</td>
                <td style={{ padding: '8px' }}>{t.ejemplar?.length || 0}</td>
                <td style={{ padding: '8px' }}>{t.activo ? 'Activo' : 'Baja'}</td>
                <td style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                  <button onClick={() => abrirEditarTitulo(t)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
                    Editar
                  </button>
                  {t.activo && (
                    <button onClick={() => darDeBajaTitulo(t.id_titulo)} style={{ cursor: 'pointer', padding: '4px 10px', color: '#dc2626' }}>
                      Baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* NUEVO / EDITAR TÍTULO */}
      {vista === 'nuevo_titulo' && (
        <div style={{ maxWidth: '500px' }}>
          <h3>{editandoTitulo ? 'Editar título' : 'Nuevo título'}</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={tituloNombre} onChange={e => setTituloNombre(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Autor *</label>
            <input style={inputStyle} value={autor} onChange={e => setAutor(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Categoría *</label>
            <select style={inputStyle} value={idCategoria} onChange={e => setIdCategoria(e.target.value)}>
              <option value="">Seleccione...</option>
              {categorias.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.codigo_dewey} — {c.nombre}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>ISBN</label>
            <input style={inputStyle} value={isbn} onChange={e => setIsbn(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Año de publicación</label>
            <input style={inputStyle} type="number" value={anio} onChange={e => setAnio(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>URL de imagen</label>
            <input style={inputStyle} value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarTitulo} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : editandoTitulo ? 'Actualizar' : 'Guardar título'}
            </button>
            <button onClick={() => { setVista('titulos'); setEditandoTitulo(null); setMensaje({ texto: '', error: false }) }} style={{ padding: '10px 16px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* NUEVO EJEMPLAR */}
      {vista === 'nuevo_ejemplar' && (
        <div style={{ maxWidth: '540px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Título *</label>
            <select
              style={inputStyle}
              value={idTituloEjemplar}
              onChange={e => {
                setIdTituloEjemplar(e.target.value)
                if (e.target.value) {
                  const tituloSeleccionado = titulos.find(t => t.id_titulo === parseInt(e.target.value))
                  if (tituloSeleccionado?.categoria?.codigo_dewey) {
                    setUbicacionDewey(tituloSeleccionado.categoria.codigo_dewey)
                  }
                } else {
                  setUbicacionDewey('')
                }
              }}
            >
              <option value="">Seleccione...</option>
              {titulos.filter(t => t.activo).map(t => (
                <option key={t.id_titulo} value={t.id_titulo}>{t.titulo}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Ubicación Dewey *</label>
            <input style={inputStyle} value={ubicacionDewey} onChange={e => setUbicacionDewey(e.target.value)} placeholder="ej: 863.44/G217" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>¿Cuántos ejemplares? (1–20)</label>
            <input
              style={{ ...inputStyle, width: '80px' }}
              type="number" min="1" max="20"
              value={cantidadEjemplares}
              onChange={e => handleCantidad(e.target.value)}
            />
          </div>
          <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="autoGenerar"
              checked={autoGenerar}
              onChange={e => {
                setAutoGenerar(e.target.checked)
                if (!e.target.checked) {
                  setCodigosEjemplares(Array.from({ length: cantidadEjemplares }, () => ''))
                }
              }}
            />
            <label htmlFor="autoGenerar" style={{ fontSize: '13px', cursor: 'pointer' }}>
              Generar códigos automáticamente (formato EJ-XXX)
            </label>
          </div>

          {Array.from({ length: cantidadEjemplares }).map((_, i) => (
            <div key={i} style={{ ...fieldStyle }}>
              <label style={labelStyle}>Código ejemplar {i + 1} *</label>
              <input
                style={inputStyle}
                value={codigosEjemplares[i] || ''}
                onChange={e => handleCodigo(i, e.target.value)}
                readOnly={autoGenerar}
                placeholder={autoGenerar ? 'Se generará automáticamente' : 'ej: EJ-008'}
              />
            </div>
          ))}

          <button onClick={guardarEjemplares} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : `Guardar ${cantidadEjemplares} ejemplar(es)`}
          </button>
        </div>
      )}

      {/* ESTABLECIMIENTOS */}
      {vista === 'establecimientos' && (
        <div>
          <div style={{ maxWidth: '500px', marginBottom: '32px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>
              {editandoEstablecimiento ? `Editando: ${editandoEstablecimiento.nombre}` : 'Agregar establecimiento'}
            </h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} value={nombreEstablecimiento} onChange={e => setNombreEstablecimiento(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Niveles educativos * (puede seleccionar varios)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {niveles.map(n => (
                  <label key={n.id_nivel} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={nivelesSeleccionados.includes(n.id_nivel)}
                      onChange={() => toggleNivel(n.id_nivel)}
                    />
                    {n.nombre}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={guardarEstablecimiento} disabled={guardando} style={{ padding: '8px 20px', cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : editandoEstablecimiento ? 'Actualizar' : 'Agregar'}
              </button>
              {editandoEstablecimiento && (
                <button onClick={() => { setEditandoEstablecimiento(null); setNombreEstablecimiento(''); setNivelesSeleccionados([]) }} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <h3 style={{ marginBottom: '12px' }}>Establecimientos registrados</h3>
          {establecimientos.length === 0 ? (
            <p style={{ color: '#666' }}>Sin establecimientos.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Nombre</th>
                  <th style={{ padding: '8px' }}>Niveles</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {establecimientos.map(e => (
                  <tr key={e.id_establecimiento} style={{ borderBottom: '1px solid #eee', opacity: e.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '8px' }}>{e.nombre}</td>
                    <td style={{ padding: '8px', fontSize: '13px' }}>
                      {e.establecimiento_nivel?.map(en => en.niveleducativo?.nombre).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '8px' }}>{e.activo ? 'Activo' : 'Baja'}</td>
                    <td style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                      {e.activo && (
                        <>
                          <button onClick={() => abrirEditarEstablecimiento(e)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
                            Editar
                          </button>
                          <button onClick={() => darDeBajaEstablecimiento(e.id_establecimiento)} style={{ cursor: 'pointer', padding: '4px 10px', color: '#dc2626' }}>
                            Baja
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONFIG MULTAS */}
      {vista === 'configuracion' && config && (
        <div style={{ maxWidth: '400px' }}>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
            Estos valores se aplican al calcular multas en devoluciones.
          </p>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cargo base por vencimiento (Q)</label>
            <input style={inputStyle} type="number" step="0.01" value={cfgBase} onChange={e => setCfgBase(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cargo por día de retraso (Q)</label>
            <input style={inputStyle} type="number" step="0.01" value={cfgDia} onChange={e => setCfgDia(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cargo por daño leve (Q)</label>
            <input style={inputStyle} type="number" step="0.01" value={cfgLeve} onChange={e => setCfgLeve(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cargo por daño grave (Q)</label>
            <input style={inputStyle} type="number" step="0.01" value={cfgGrave} onChange={e => setCfgGrave(e.target.value)} />
          </div>
          <button onClick={guardarConfig} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      )}
    </div>
  )
}