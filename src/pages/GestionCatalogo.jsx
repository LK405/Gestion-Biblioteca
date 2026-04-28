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

  // Nuevo título
  const [tituloNombre, setTituloNombre] = useState('')
  const [autor, setAutor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [anio, setAnio] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  // Nuevo ejemplar
  const [idTituloEjemplar, setIdTituloEjemplar] = useState('')
  const [codigoInventario, setCodigoInventario] = useState('')
  const [ubicacionDewey, setUbicacionDewey] = useState('')

  // Configuración multa
  const [config, setConfig] = useState(null)
  const [cfgBase, setCfgBase] = useState('')
  const [cfgDia, setCfgDia] = useState('')
  const [cfgLeve, setCfgLeve] = useState('')
  const [cfgGrave, setCfgGrave] = useState('')

  // Nuevo establecimiento
  const [nombreEstablecimiento, setNombreEstablecimiento] = useState('')
  const [idNivelEstablecimiento, setIdNivelEstablecimiento] = useState('')

  useEffect(() => {
    cargarCategorias()
    cargarTitulos()
    cargarNiveles()
    cargarEstablecimientos()
  }, [])

  useEffect(() => {
    if (vista === 'configuracion') cargarConfig()
  }, [vista])

  async function cargarCategorias() {
    const { data } = await supabase.from('categoria').select('*').order('codigo_dewey')
    setCategorias(data || [])
  }

  async function cargarTitulos() {
    const { data } = await supabase
      .from('titulo')
      .select('id_titulo, titulo, autor, activo, categoria (nombre), ejemplar (id_ejemplar, estado)')
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
      .select('*, niveleducativo (nombre)')
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

  async function guardarTitulo() {
    if (!tituloNombre.trim() || !autor.trim() || !idCategoria) {
      setMensaje({ texto: 'Título, autor y categoría son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('titulo').insert({
      titulo: tituloNombre, autor,
      isbn: isbn || null,
      anio_publicacion: anio ? parseInt(anio) : null,
      id_categoria: parseInt(idCategoria),
      imagen_url: imagenUrl || null,
      activo: true,
    })
    if (error) {
      setMensaje({ texto: 'Error al guardar. Verifique los datos.', error: true })
    } else {
      setMensaje({ texto: 'Título registrado correctamente.', error: false })
      setTituloNombre(''); setAutor(''); setIsbn(''); setAnio(''); setIdCategoria(''); setImagenUrl('')
      cargarTitulos()
    }
    setGuardando(false)
  }

  async function guardarEjemplar() {
    if (!idTituloEjemplar || !codigoInventario.trim() || !ubicacionDewey.trim()) {
      setMensaje({ texto: 'Todos los campos del ejemplar son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('ejemplar').insert({
      id_titulo: parseInt(idTituloEjemplar),
      codigo_inventario: codigoInventario,
      ubicacion_dewey: ubicacionDewey,
      estado: 'DISPONIBLE',
    })
    if (error) {
      setMensaje({ texto: 'Error al guardar. El código de inventario puede estar duplicado.', error: true })
    } else {
      setMensaje({ texto: 'Ejemplar registrado correctamente.', error: false })
      setIdTituloEjemplar(''); setCodigoInventario(''); setUbicacionDewey('')
      cargarTitulos()
    }
    setGuardando(false)
  }

  async function darDeBajaTitulo(idTitulo) {
    if (!confirm('¿Dar de baja este título? Se marcará como inactivo.')) return
    await supabase.from('titulo').update({ activo: false }).eq('id_titulo', idTitulo)
    cargarTitulos()
  }

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
    setGuardando(false)
  }

  async function guardarEstablecimiento() {
    if (!nombreEstablecimiento.trim() || !idNivelEstablecimiento) {
      setMensaje({ texto: 'Nombre y nivel son obligatorios.', error: true })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('establecimiento').insert({
      nombre: nombreEstablecimiento,
      id_nivel: parseInt(idNivelEstablecimiento),
      activo: true,
    })
    if (error) {
      setMensaje({ texto: 'Error al guardar establecimiento.', error: true })
    } else {
      setMensaje({ texto: 'Establecimiento registrado correctamente.', error: false })
      setNombreEstablecimiento('')
      setIdNivelEstablecimiento('')
      cargarEstablecimientos()
    }
    setGuardando(false)
  }

  async function darDeBajaEstablecimiento(id) {
    if (!confirm('¿Dar de baja este establecimiento?')) return
    await supabase.from('establecimiento').update({ activo: false }).eq('id_establecimiento', id)
    cargarEstablecimientos()
  }

  const inputStyle = { padding: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }
  const fieldStyle = { marginBottom: '12px' }
  const tabStyle = (activo) => ({
    padding: '8px 14px', cursor: 'pointer', marginRight: '4px',
    background: activo ? '#1d4ed8' : '#e5e7eb',
    color: activo ? 'white' : 'black',
    border: 'none', borderRadius: '4px', fontSize: '13px'
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Gestión de catálogo</h1>

      <div style={{ marginBottom: '24px', flexWrap: 'wrap', display: 'flex', gap: '4px' }}>
        <button style={tabStyle(vista === 'titulos')} onClick={() => { setVista('titulos'); setMensaje({ texto: '', error: false }) }}>Ver títulos</button>
        <button style={tabStyle(vista === 'nuevo_titulo')} onClick={() => { setVista('nuevo_titulo'); setMensaje({ texto: '', error: false }) }}>Nuevo título</button>
        <button style={tabStyle(vista === 'nuevo_ejemplar')} onClick={() => { setVista('nuevo_ejemplar'); setMensaje({ texto: '', error: false }) }}>Nuevo ejemplar</button>
        <button style={tabStyle(vista === 'establecimientos')} onClick={() => { setVista('establecimientos'); setMensaje({ texto: '', error: false }) }}>Establecimientos</button>
        <button style={tabStyle(vista === 'configuracion')} onClick={() => { setVista('configuracion'); setMensaje({ texto: '', error: false }) }}>Config. multas</button>
      </div>

      {mensaje.texto && (
        <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginBottom: '16px' }}>
          {mensaje.texto}
        </p>
      )}

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
                <td style={{ padding: '8px' }}>
                  {t.activo && (
                    <button onClick={() => darDeBajaTitulo(t.id_titulo)} style={{ cursor: 'pointer', padding: '4px 10px', color: '#dc2626' }}>
                      Dar de baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vista === 'nuevo_titulo' && (
        <div style={{ maxWidth: '500px' }}>
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
            <label style={labelStyle}>URL de imagen de portada</label>
            <input style={inputStyle} value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..." />
          </div>
          <button onClick={guardarTitulo} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar título'}
          </button>
        </div>
      )}

      {vista === 'nuevo_ejemplar' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Título al que pertenece *</label>
            <select style={inputStyle} value={idTituloEjemplar} onChange={e => setIdTituloEjemplar(e.target.value)}>
              <option value="">Seleccione...</option>
              {titulos.filter(t => t.activo).map(t => (
                <option key={t.id_titulo} value={t.id_titulo}>{t.titulo}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Código de inventario *</label>
            <input style={inputStyle} value={codigoInventario} onChange={e => setCodigoInventario(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Ubicación Dewey *</label>
            <input style={inputStyle} value={ubicacionDewey} onChange={e => setUbicacionDewey(e.target.value)} placeholder="ej: 863.44/G217" />
          </div>
          <button onClick={guardarEjemplar} disabled={guardando} style={{ padding: '10px 24px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar ejemplar'}
          </button>
        </div>
      )}

      {vista === 'establecimientos' && (
        <div>
          {/* Formulario nuevo establecimiento */}
          <div style={{ maxWidth: '500px', marginBottom: '32px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Agregar establecimiento</h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} value={nombreEstablecimiento} onChange={e => setNombreEstablecimiento(e.target.value)} placeholder="Nombre del establecimiento" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nivel educativo *</label>
              <select style={inputStyle} value={idNivelEstablecimiento} onChange={e => setIdNivelEstablecimiento(e.target.value)}>
                <option value="">Seleccione...</option>
                {niveles.map(n => (
                  <option key={n.id_nivel} value={n.id_nivel}>{n.nombre}</option>
                ))}
              </select>
            </div>
            <button onClick={guardarEstablecimiento} disabled={guardando} style={{ padding: '8px 20px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : 'Agregar'}
            </button>
          </div>

          {/* Lista de establecimientos */}
          <h3 style={{ marginBottom: '12px' }}>Establecimientos registrados</h3>
          {establecimientos.length === 0 ? (
            <p style={{ color: '#666' }}>Sin establecimientos registrados.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Nombre</th>
                  <th style={{ padding: '8px' }}>Nivel</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {establecimientos.map(e => (
                  <tr key={e.id_establecimiento} style={{ borderBottom: '1px solid #eee', opacity: e.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '8px' }}>{e.nombre}</td>
                    <td style={{ padding: '8px' }}>{e.niveleducativo?.nombre || '—'}</td>
                    <td style={{ padding: '8px' }}>{e.activo ? 'Activo' : 'Baja'}</td>
                    <td style={{ padding: '8px' }}>
                      {e.activo && (
                        <button
                          onClick={() => darDeBajaEstablecimiento(e.id_establecimiento)}
                          style={{ cursor: 'pointer', padding: '4px 10px', color: '#dc2626' }}
                        >
                          Dar de baja
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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