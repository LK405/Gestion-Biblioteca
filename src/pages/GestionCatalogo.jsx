import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BookOpen,
  Building2,
  CheckCircle2,
  Edit3,
  Library,
  Plus,
  RotateCcw,
  Save,
  Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const VISTAS = [
  { id: 'titulos', label: 'Títulos', icon: BookOpen },
  { id: 'formulario', label: 'Nuevo título / ejemplares', icon: Plus },
  { id: 'establecimientos', label: 'Establecimientos', icon: Building2 },
  { id: 'configuracion', label: 'Config. multas', icon: Settings },
]

export default function GestionCatalogo() {
  const { usuario } = useAuth()
  const [vista, setVista] = useState('titulos')
  const [modoFormulario, setModoFormulario] = useState('titulo')
  const [categorias, setCategorias] = useState([])
  const [titulos, setTitulos] = useState([])
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)
  const [mostrarTitulosBaja, setMostrarTitulosBaja] = useState(false)
  const [mostrarEstablecimientosBaja, setMostrarEstablecimientosBaja] = useState(false)

  const [editandoTitulo, setEditandoTitulo] = useState(null)
  const [tituloNombre, setTituloNombre] = useState('')
  const [autor, setAutor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [anio, setAnio] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  const [idTituloEjemplar, setIdTituloEjemplar] = useState('')
  const [ubicacionDewey, setUbicacionDewey] = useState('')
  const [cantidadEjemplares, setCantidadEjemplares] = useState(1)
  const [codigosEjemplares, setCodigosEjemplares] = useState([])

  const [config, setConfig] = useState(null)
  const [cfgBase, setCfgBase] = useState('')
  const [cfgDia, setCfgDia] = useState('')
  const [cfgLeve, setCfgLeve] = useState('')
  const [cfgGrave, setCfgGrave] = useState('')

  const [editandoEstablecimiento, setEditandoEstablecimiento] = useState(null)
  const [nombreEstablecimiento, setNombreEstablecimiento] = useState('')
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState([])

  const cargarCategorias = useCallback(async () => {
    const { data } = await supabase.from('categoria').select('*').order('codigo_dewey')
    setCategorias(data || [])
  }, [])

  const cargarTitulos = useCallback(async () => {
    const { data } = await supabase
      .from('titulo')
      .select('id_titulo, titulo, autor, isbn, anio_publicacion, imagen_url, activo, id_categoria, categoria (nombre, codigo_dewey), ejemplar (id_ejemplar, codigo_inventario, estado)')
      .order('titulo')
    setTitulos(data || [])
  }, [])

  const cargarNiveles = useCallback(async () => {
    const { data } = await supabase.from('niveleducativo').select('*').order('id_nivel')
    setNiveles(data || [])
  }, [])

  const cargarEstablecimientos = useCallback(async () => {
    const { data } = await supabase
      .from('establecimiento')
      .select(`
        id_establecimiento, nombre, activo,
        establecimiento_nivel (id_nivel, niveleducativo (nombre))
      `)
      .order('nombre')
    setEstablecimientos(data || [])
  }, [])

  const cargarConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracionmulta').select('*').single()
    if (data) {
      setConfig(data)
      setCfgBase(data.cargo_base_vencimiento)
      setCfgDia(data.cargo_por_dia)
      setCfgLeve(data.cargo_daño_leve)
      setCfgGrave(data.cargo_daño_grave)
    }
  }, [])

  const construirCodigosAuto = useCallback(async (cantidad) => {
    const { data } = await supabase
      .from('ejemplar')
      .select('codigo_inventario')
      .ilike('codigo_inventario', 'EJ-%')

    const ultimo = (data || []).reduce((max, item) => {
      const numero = parseInt(String(item.codigo_inventario || '').replace('EJ-', ''), 10)
      return Number.isNaN(numero) ? max : Math.max(max, numero)
    }, 0)

    return Array.from({ length: cantidad }, (_, i) => `EJ-${String(ultimo + i + 1).padStart(3, '0')}`)
  }, [])

  const refrescarVistaCodigos = useCallback(async (cantidad = cantidadEjemplares) => {
    const nuevos = await construirCodigosAuto(cantidad)
    setCodigosEjemplares(nuevos)
  }, [cantidadEjemplares, construirCodigosAuto])

  useEffect(() => {
    cargarCategorias()
    cargarTitulos()
    cargarNiveles()
    cargarEstablecimientos()
  }, [cargarCategorias, cargarEstablecimientos, cargarNiveles, cargarTitulos])

  useEffect(() => {
    if (vista === 'configuracion') cargarConfig()
  }, [vista, cargarConfig])

  useEffect(() => {
    refrescarVistaCodigos()
  }, [refrescarVistaCodigos])

  const titulosActivos = useMemo(() => titulos.filter(t => t.activo), [titulos])
  const titulosBaja = useMemo(() => titulos.filter(t => !t.activo), [titulos])
  const establecimientosActivos = useMemo(() => establecimientos.filter(e => e.activo), [establecimientos])
  const establecimientosBaja = useMemo(() => establecimientos.filter(e => !e.activo), [establecimientos])

  const resumenCatalogo = useMemo(() => {
    const ejemplares = titulos.flatMap(t => t.ejemplar || [])
    return {
      titulos: titulosActivos.length,
      ejemplares: ejemplares.length,
      disponibles: ejemplares.filter(e => e.estado === 'DISPONIBLE').length,
      fueraServicio: ejemplares.filter(e => e.estado === 'FUERA_DE_SERVICIO').length,
    }
  }, [titulos, titulosActivos])

  function limpiarMensaje() {
    setMensaje({ texto: '', error: false })
  }

  function resetTitulo() {
    setEditandoTitulo(null)
    setTituloNombre('')
    setAutor('')
    setIsbn('')
    setAnio('')
    setIdCategoria('')
    setImagenUrl('')
    setUbicacionDewey('')
    setCantidadEjemplares(1)
    refrescarVistaCodigos(1)
  }

  function abrirNuevoTitulo() {
    resetTitulo()
    setModoFormulario('titulo')
    setVista('formulario')
    limpiarMensaje()
  }

  function abrirEditarTitulo(titulo) {
    setEditandoTitulo(titulo)
    setTituloNombre(titulo.titulo)
    setAutor(titulo.autor)
    setIsbn(titulo.isbn || '')
    setAnio(titulo.anio_publicacion || '')
    setIdCategoria(String(titulo.id_categoria))
    setImagenUrl(titulo.imagen_url || '')
    setUbicacionDewey(titulo.categoria?.codigo_dewey || '')
    setModoFormulario('titulo')
    setVista('formulario')
    limpiarMensaje()
  }

  function seleccionarCategoria(valor) {
    setIdCategoria(valor)
    const categoria = categorias.find(c => String(c.id_categoria) === valor)
    setUbicacionDewey(categoria?.codigo_dewey || '')
  }

  function abrirAgregarEjemplares(titulo) {
    setEditandoTitulo(null)
    setIdTituloEjemplar(String(titulo.id_titulo))
    setUbicacionDewey(titulo.categoria?.codigo_dewey || '')
    setCantidadEjemplares(1)
    refrescarVistaCodigos(1)
    setModoFormulario('ejemplar')
    setVista('formulario')
    limpiarMensaje()
  }

  function cambiarCantidad(valor) {
    const cantidad = Math.min(200, Math.max(1, parseInt(valor, 10) || 1))
    setCantidadEjemplares(cantidad)
    refrescarVistaCodigos(cantidad)
  }

  async function insertarEjemplares(idTitulo, ubicacion, cantidad) {
    const codigos = await construirCodigosAuto(cantidad)
    const filas = codigos.map(codigo => ({
      id_titulo: idTitulo,
      codigo_inventario: codigo,
      ubicacion_dewey: ubicacion.trim(),
      estado: 'DISPONIBLE',
    }))

    const { error } = await supabase.from('ejemplar').insert(filas)
    if (error) throw error
    setCodigosEjemplares(codigos)
    return codigos
  }

  async function guardarTitulo() {
    if (!tituloNombre.trim() || !autor.trim() || !idCategoria) {
      setMensaje({ texto: 'Título, autor y categoría son obligatorios.', error: true })
      return
    }

    if (!editandoTitulo && !ubicacionDewey.trim()) {
      setMensaje({ texto: 'La ubicación Dewey es obligatoria para crear el primer ejemplar.', error: true })
      return
    }

    setGuardando(true)
    const payload = {
      titulo: tituloNombre.trim(),
      autor: autor.trim(),
      isbn: isbn.trim() || null,
      anio_publicacion: anio ? parseInt(anio, 10) : null,
      id_categoria: parseInt(idCategoria, 10),
      imagen_url: imagenUrl.trim() || null,
    }

    try {
      if (editandoTitulo) {
        const { error } = await supabase.from('titulo').update(payload).eq('id_titulo', editandoTitulo.id_titulo)
        if (error) throw error
        setMensaje({ texto: 'Título actualizado.', error: false })
      } else {
        const { data, error } = await supabase
          .from('titulo')
          .insert({ ...payload, activo: true })
          .select('id_titulo')
          .single()
        if (error) throw error
        await insertarEjemplares(data.id_titulo, ubicacionDewey, cantidadEjemplares)
        setMensaje({ texto: `Título registrado con ${cantidadEjemplares} ejemplar(es) generado(s).`, error: false })
      }

      setTimeout(() => limpiarMensaje(), 3000)
      resetTitulo()
      setVista('titulos')
      await cargarTitulos()
    } catch (error) {
      console.error('Error guardando título:', error)
      setMensaje({ texto: 'Error al guardar. Verifique los datos o códigos duplicados.', error: true })
    } finally {
      setGuardando(false)
    }
  }

  async function guardarEjemplares() {
    if (!idTituloEjemplar || !ubicacionDewey.trim()) {
      setMensaje({ texto: 'Título y ubicación Dewey son obligatorios.', error: true })
      return
    }

    setGuardando(true)
    try {
      await insertarEjemplares(parseInt(idTituloEjemplar, 10), ubicacionDewey, cantidadEjemplares)
      setMensaje({ texto: `${cantidadEjemplares} ejemplar(es) registrado(s) con código automático.`, error: false })
      setTimeout(() => limpiarMensaje(), 3000)
      setIdTituloEjemplar('')
      setUbicacionDewey('')
      setCantidadEjemplares(1)
      await refrescarVistaCodigos(1)
      await cargarTitulos()
    } catch (error) {
      console.error('Error guardando ejemplares:', error)
      setMensaje({ texto: 'Error al guardar. Algún código puede estar duplicado.', error: true })
    } finally {
      setGuardando(false)
    }
  }

  async function darDeBajaTitulo(id) {
    if (!confirm('¿Dar de baja este título?')) return
    await supabase.from('titulo').update({ activo: false }).eq('id_titulo', id)
    await cargarTitulos()
  }

  async function reactivarTitulo(id) {
    await supabase.from('titulo').update({ activo: true }).eq('id_titulo', id)
    await cargarTitulos()
  }

  function abrirNuevoEstablecimiento() {
    setEditandoEstablecimiento(null)
    setNombreEstablecimiento('')
    setNivelesSeleccionados([])
    limpiarMensaje()
  }

  function abrirEditarEstablecimiento(est) {
    setEditandoEstablecimiento(est)
    setNombreEstablecimiento(est.nombre)
    setNivelesSeleccionados(est.establecimiento_nivel?.map(en => en.id_nivel) || [])
    limpiarMensaje()
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
    let idEstablecimiento

    try {
      if (editandoEstablecimiento) {
        const { error } = await supabase
          .from('establecimiento')
          .update({ nombre: nombreEstablecimiento.trim() })
          .eq('id_establecimiento', editandoEstablecimiento.id_establecimiento)
        if (error) throw error
        idEstablecimiento = editandoEstablecimiento.id_establecimiento
        await supabase.from('establecimiento_nivel').delete().eq('id_establecimiento', idEstablecimiento)
      } else {
        const { data, error } = await supabase
          .from('establecimiento')
          .insert({ nombre: nombreEstablecimiento.trim(), activo: true })
          .select('id_establecimiento')
          .single()
        if (error) throw error
        idEstablecimiento = data.id_establecimiento
      }

      const filas = nivelesSeleccionados.map(idNivel => ({ id_establecimiento: idEstablecimiento, id_nivel: idNivel }))
      const { error: errorNiveles } = await supabase.from('establecimiento_nivel').insert(filas)
      if (errorNiveles) throw errorNiveles

      setMensaje({ texto: editandoEstablecimiento ? 'Establecimiento actualizado.' : 'Establecimiento registrado.', error: false })
      setTimeout(() => limpiarMensaje(), 3000)
      abrirNuevoEstablecimiento()
      await cargarEstablecimientos()
    } catch (error) {
      console.error('Error guardando establecimiento:', error)
      setMensaje({ texto: 'Error al guardar establecimiento.', error: true })
    } finally {
      setGuardando(false)
    }
  }

  async function darDeBajaEstablecimiento(id) {
    if (!confirm('¿Dar de baja este establecimiento?')) return
    await supabase.from('establecimiento').update({ activo: false }).eq('id_establecimiento', id)
    await cargarEstablecimientos()
  }

  async function reactivarEstablecimiento(id) {
    await supabase.from('establecimiento').update({ activo: true }).eq('id_establecimiento', id)
    await cargarEstablecimientos()
  }

  async function guardarConfig() {
    if (!config) return
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
    if (!error) setTimeout(() => limpiarMensaje(), 3000)
    setGuardando(false)
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '14px',
    color: '#0f172a',
    background: 'white',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 800,
    color: '#475569',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  }

  const panelStyle = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
  }

  const primaryButton = {
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: 'white',
    padding: '11px 16px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }

  const secondaryButton = {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    background: 'white',
    color: '#334155',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }

  const dangerButton = {
    ...secondaryButton,
    color: '#b91c1c',
    borderColor: '#fecaca',
    background: '#fff7f7',
  }

  const tabStyle = (activo) => ({
    border: 'none',
    borderRadius: '12px',
    background: activo ? '#0f172a' : 'transparent',
    color: activo ? 'white' : '#475569',
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 800,
  })

  const metricas = [
    { label: 'Títulos activos', value: resumenCatalogo.titulos, icon: BookOpen, color: '#2563eb' },
    { label: 'Ejemplares', value: resumenCatalogo.ejemplares, icon: Library, color: '#059669' },
    { label: 'Disponibles', value: resumenCatalogo.disponibles, icon: CheckCircle2, color: '#16a34a' },
    { label: 'Fuera de servicio', value: resumenCatalogo.fueraServicio, icon: Archive, color: '#dc2626' },
  ]

  function renderTitleRow(titulo, esBaja = false) {
    const ejemplares = titulo.ejemplar || []
    const disponibles = ejemplares.filter(e => e.estado === 'DISPONIBLE').length
    const prestados = ejemplares.filter(e => e.estado === 'PRESTADO').length
    const fueraServicio = ejemplares.filter(e => e.estado === 'FUERA_DE_SERVICIO').length

    return (
      <tr key={titulo.id_titulo} style={{ borderBottom: '1px solid #edf2f7' }}>
        <td style={{ padding: '14px 10px' }}>
          <strong style={{ display: 'block', color: '#0f172a' }}>{titulo.titulo}</strong>
          <span style={{ color: '#64748b', fontSize: '13px' }}>{titulo.autor}</span>
        </td>
        <td style={{ padding: '14px 10px', color: '#475569' }}>
          <span style={{ display: 'block', fontWeight: 700 }}>{titulo.categoria?.nombre || 'Sin categoría'}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{titulo.categoria?.codigo_dewey || 'Sin Dewey'}</span>
        </td>
        <td style={{ padding: '14px 10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={pill('#dbeafe', '#1d4ed8')}>{ejemplares.length} total</span>
            <span style={pill('#dcfce7', '#15803d')}>{disponibles} disp.</span>
            {prestados > 0 && <span style={pill('#fef3c7', '#92400e')}>{prestados} prest.</span>}
            {fueraServicio > 0 && <span style={pill('#fee2e2', '#991b1b')}>{fueraServicio} fuera</span>}
          </div>
        </td>
        <td style={{ padding: '14px 10px', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!esBaja && (
              <>
                <button style={secondaryButton} onClick={() => abrirEditarTitulo(titulo)}>
                  <Edit3 size={16} /> Editar
                </button>
                <button style={secondaryButton} onClick={() => abrirAgregarEjemplares(titulo)}>
                  <Library size={16} /> Añadir copias
                </button>
                <button style={dangerButton} onClick={() => darDeBajaTitulo(titulo.id_titulo)}>
                  <Archive size={16} /> Baja
                </button>
              </>
            )}
            {esBaja && (
              <button style={secondaryButton} onClick={() => reactivarTitulo(titulo.id_titulo)}>
                <RotateCcw size={16} /> Reactivar
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  function renderEstablecimientoRow(est, esBaja = false) {
    return (
      <tr key={est.id_establecimiento} style={{ borderBottom: '1px solid #edf2f7' }}>
        <td style={{ padding: '14px 10px' }}>
          <strong style={{ color: '#0f172a' }}>{est.nombre}</strong>
        </td>
        <td style={{ padding: '14px 10px', color: '#475569', fontSize: '13px' }}>
          {est.establecimiento_nivel?.map(en => en.niveleducativo?.nombre).filter(Boolean).join(', ') || 'Sin niveles'}
        </td>
        <td style={{ padding: '14px 10px', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!esBaja && (
              <>
                <button style={secondaryButton} onClick={() => abrirEditarEstablecimiento(est)}>
                  <Edit3 size={16} /> Editar
                </button>
                <button style={dangerButton} onClick={() => darDeBajaEstablecimiento(est.id_establecimiento)}>
                  <Archive size={16} /> Baja
                </button>
              </>
            )}
            {esBaja && (
              <button style={secondaryButton} onClick={() => reactivarEstablecimiento(est.id_establecimiento)}>
                <RotateCcw size={16} /> Reactivar
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  function pill(background, color) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '999px',
      background,
      color,
      padding: '5px 9px',
      fontSize: '12px',
      fontWeight: 800,
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px', color: '#0f172a' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px' }}>
          <div>
            <span style={{ ...pill('#e0f2fe', '#0369a1'), marginBottom: '10px' }}>Administración</span>
            <h1 style={{ margin: '0 0 6px', fontSize: '32px', letterSpacing: 0 }}>Gestión de catálogo</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
              Registra títulos, genera ejemplares y mantiene ordenado el inventario de la biblioteca.
            </p>
          </div>
          <button style={primaryButton} onClick={abrirNuevoTitulo}>
            <Plus size={18} /> Nuevo título
          </button>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          {metricas.map(metrica => {
            const Icon = metrica.icon
            return (
              <article key={metrica.label} style={{ ...panelStyle, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 800 }}>{metrica.label}</span>
                  <Icon size={20} color={metrica.color} />
                </div>
                <strong style={{ fontSize: '30px', lineHeight: 1 }}>{metrica.value}</strong>
              </article>
            )
          })}
        </section>

        <nav style={{ ...panelStyle, padding: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {VISTAS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                style={tabStyle(vista === item.id)}
                onClick={() => {
                  setVista(item.id)
                  limpiarMensaje()
                  if (item.id === 'formulario') {
                    setModoFormulario(editandoTitulo ? 'titulo' : modoFormulario)
                  }
                }}
              >
                <Icon size={17} /> {item.label}
              </button>
            )
          })}
        </nav>

        {mensaje.texto && (
          <div style={{
            marginBottom: '18px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: mensaje.error ? '#fef2f2' : '#ecfdf5',
            color: mensaje.error ? '#991b1b' : '#047857',
            fontWeight: 800,
            border: `1px solid ${mensaje.error ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {mensaje.texto}
          </div>
        )}

        {vista === 'titulos' && (
          <section style={panelStyle}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Títulos activos</h2>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Los títulos dados de baja quedan separados al final para consulta.</p>
              </div>
              <span style={{ ...pill('#f1f5f9', '#475569'), alignSelf: 'center' }}>
                Usa “Añadir copias” en cada título
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 10px 12px 20px' }}>Título</th>
                    <th style={{ padding: '12px 10px' }}>Categoría</th>
                    <th style={{ padding: '12px 10px' }}>Ejemplares</th>
                    <th style={{ padding: '12px 20px 12px 10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {titulosActivos.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '24px 20px', color: '#64748b' }}>Sin títulos activos.</td></tr>
                  ) : titulosActivos.map(titulo => renderTitleRow(titulo))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '18px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button style={secondaryButton} onClick={() => setMostrarTitulosBaja(prev => !prev)}>
                <Archive size={16} /> Títulos dados de baja ({titulosBaja.length})
              </button>
              {mostrarTitulosBaja && (
                <div style={{ marginTop: '14px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px', background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
                    <tbody>
                      {titulosBaja.length === 0 ? (
                        <tr><td style={{ padding: '18px', color: '#64748b' }}>No hay títulos dados de baja.</td></tr>
                      ) : titulosBaja.map(titulo => renderTitleRow(titulo, true))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {vista === 'formulario' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div style={{ ...panelStyle, padding: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <button style={tabStyle(modoFormulario === 'titulo')} onClick={() => { setModoFormulario('titulo'); limpiarMensaje() }}>
                  <BookOpen size={17} /> {editandoTitulo ? 'Editar título' : 'Nuevo título con ejemplares'}
                </button>
                <button style={tabStyle(modoFormulario === 'ejemplar')} onClick={() => { setModoFormulario('ejemplar'); setEditandoTitulo(null); limpiarMensaje() }}>
                  <Library size={17} /> Añadir copias
                </button>
              </div>

              {modoFormulario === 'titulo' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <Field label="Título *" inputStyle={inputStyle}>
                      <input style={inputStyle} value={tituloNombre} onChange={e => setTituloNombre(e.target.value)} />
                    </Field>
                    <Field label="Autor *" inputStyle={inputStyle}>
                      <input style={inputStyle} value={autor} onChange={e => setAutor(e.target.value)} />
                    </Field>
                    <Field label="Categoría *" inputStyle={inputStyle}>
                      <select style={inputStyle} value={idCategoria} onChange={e => seleccionarCategoria(e.target.value)}>
                        <option value="">Seleccione...</option>
                        {categorias.map(c => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.codigo_dewey} - {c.nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Ubicación Dewey *" inputStyle={inputStyle}>
                      <input style={inputStyle} value={ubicacionDewey} onChange={e => setUbicacionDewey(e.target.value)} placeholder="ej: 863.44/G217" />
                    </Field>
                    <Field label="ISBN" inputStyle={inputStyle}>
                      <input style={inputStyle} value={isbn} onChange={e => setIsbn(e.target.value)} />
                    </Field>
                    <Field label="Año de publicación" inputStyle={inputStyle}>
                      <input style={inputStyle} type="number" value={anio} onChange={e => setAnio(e.target.value)} />
                    </Field>
                    <Field label="URL de imagen" inputStyle={inputStyle}>
                      <input style={inputStyle} value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..." />
                    </Field>
                    {!editandoTitulo && (
                      <Field label="Ejemplares iniciales" inputStyle={inputStyle}>
                        <input style={inputStyle} type="number" min="1" max="200" value={cantidadEjemplares} onChange={e => cambiarCantidad(e.target.value)} />
                      </Field>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <button style={primaryButton} onClick={guardarTitulo} disabled={guardando}>
                      <Save size={17} /> {guardando ? 'Guardando...' : editandoTitulo ? 'Actualizar título' : 'Guardar título y ejemplares'}
                    </button>
                    <button style={secondaryButton} onClick={() => { resetTitulo(); setVista('titulos') }}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {modoFormulario === 'ejemplar' && (
                <>
                  {idTituloEjemplar ? (
                    <div style={{ marginBottom: '14px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                        Título seleccionado
                      </span>
                      <strong style={{ display: 'block', marginTop: '4px' }}>
                        {titulos.find(t => String(t.id_titulo) === idTituloEjemplar)?.titulo || 'Título'}
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>
                        Dewey: {ubicacionDewey || 'sin código asignado'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '14px', padding: '14px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontWeight: 800 }}>
                      Selecciona primero un título desde la pestaña “Títulos activos” usando el botón “Añadir copias”.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <Field label="Cantidad de ejemplares" inputStyle={inputStyle}>
                      <input style={inputStyle} type="number" min="1" max="200" value={cantidadEjemplares} onChange={e => cambiarCantidad(e.target.value)} />
                    </Field>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <button style={primaryButton} onClick={guardarEjemplares} disabled={guardando}>
                      <Save size={17} /> {guardando ? 'Guardando...' : 'Guardar ejemplares'}
                    </button>
                    <button style={secondaryButton} onClick={() => setVista('titulos')}>
                      Volver a títulos
                    </button>
                  </div>
                </>
              )}
            </div>

            <aside style={{ ...panelStyle, padding: '20px', alignSelf: 'start' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Códigos automáticos</h3>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '14px' }}>
                Se generan al guardar con el siguiente correlativo disponible.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {codigosEjemplares.slice(0, 40).map(codigo => (
                  <span key={codigo} style={pill('#eef2ff', '#3730a3')}>{codigo}</span>
                ))}
                {codigosEjemplares.length > 40 && (
                  <span style={pill('#f1f5f9', '#475569')}>+{codigosEjemplares.length - 40} más</span>
                )}
              </div>
            </aside>
          </section>
        )}

        {vista === 'establecimientos' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div style={{ ...panelStyle, padding: '20px', alignSelf: 'start' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>
                {editandoEstablecimiento ? 'Editar establecimiento' : 'Agregar establecimiento'}
              </h2>
              <Field label="Nombre *" inputStyle={inputStyle}>
                <input style={inputStyle} value={nombreEstablecimiento} onChange={e => setNombreEstablecimiento(e.target.value)} />
              </Field>
              <div style={{ marginTop: '14px' }}>
                <label style={labelStyle}>Niveles educativos *</label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {niveles.map(nivel => (
                    <label key={nivel.id_nivel} style={{ display: 'flex', gap: '9px', alignItems: 'center', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                      <input type="checkbox" checked={nivelesSeleccionados.includes(nivel.id_nivel)} onChange={() => toggleNivel(nivel.id_nivel)} />
                      {nivel.nombre}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                <button style={primaryButton} onClick={guardarEstablecimiento} disabled={guardando}>
                  <Save size={17} /> {guardando ? 'Guardando...' : editandoEstablecimiento ? 'Actualizar' : 'Agregar'}
                </button>
                <button style={secondaryButton} onClick={abrirNuevoEstablecimiento}>
                  Limpiar
                </button>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Establecimientos activos</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
                  <tbody>
                    {establecimientosActivos.length === 0 ? (
                      <tr><td style={{ padding: '22px 20px', color: '#64748b' }}>Sin establecimientos activos.</td></tr>
                    ) : establecimientosActivos.map(est => renderEstablecimientoRow(est))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '18px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <button style={secondaryButton} onClick={() => setMostrarEstablecimientosBaja(prev => !prev)}>
                  <Archive size={16} /> Establecimientos dados de baja ({establecimientosBaja.length})
                </button>
                {mostrarEstablecimientosBaja && (
                  <div style={{ marginTop: '14px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px', background: 'white' }}>
                      <tbody>
                        {establecimientosBaja.length === 0 ? (
                          <tr><td style={{ padding: '18px', color: '#64748b' }}>No hay establecimientos dados de baja.</td></tr>
                        ) : establecimientosBaja.map(est => renderEstablecimientoRow(est, true))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {vista === 'configuracion' && config && (
          <section style={{ ...panelStyle, padding: '20px', maxWidth: '620px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>Configuración de multas</h2>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '14px' }}>
              Estos valores se aplican en devoluciones y panel de alertas.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <Field label="Cargo base por vencimiento (Q)" inputStyle={inputStyle}>
                <input style={inputStyle} type="number" step="0.01" value={cfgBase} onChange={e => setCfgBase(e.target.value)} />
              </Field>
              <Field label="Cargo por día de retraso (Q)" inputStyle={inputStyle}>
                <input style={inputStyle} type="number" step="0.01" value={cfgDia} onChange={e => setCfgDia(e.target.value)} />
              </Field>
              <Field label="Cargo por daño leve (Q)" inputStyle={inputStyle}>
                <input style={inputStyle} type="number" step="0.01" value={cfgLeve} onChange={e => setCfgLeve(e.target.value)} />
              </Field>
              <Field label="Cargo por daño grave (Q)" inputStyle={inputStyle}>
                <input style={inputStyle} type="number" step="0.01" value={cfgGrave} onChange={e => setCfgGrave(e.target.value)} />
              </Field>
            </div>
            <button style={{ ...primaryButton, marginTop: '18px' }} onClick={guardarConfig} disabled={guardando}>
              <Save size={17} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 800,
        color: '#475569',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}
