import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BookCover from '@/components/BookCover'
import { supabase } from '@/lib/supabase'

const POR_PAGINA = 20

function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Catalogo() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('general')
  const [vistaCatalogo, setVistaCatalogo] = useState('activos')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [imagenesRotas, setImagenesRotas] = useState({})

  const cargarTitulos = useCallback(async (pag, termino, filtroActual, vistaActual) => {
    setCargando(true)
    const terminoNormalizado = normalizarTexto(termino)

    const { data, error } = await supabase
      .from('titulo')
      .select(`
        id_titulo, titulo, autor, isbn, anio_publicacion, imagen_url,
        categoria (nombre, codigo_dewey, permite_prestamo_formal),
        ejemplar (id_ejemplar, codigo_inventario, ubicacion_dewey, estado)
      `)
      .eq('activo', true)
      .order('titulo', { ascending: true })

    if (error) {
      console.error('Error en búsqueda:', error)
      setResultados([])
      setTotal(0)
    } else {
      const lista = data || []
      const filtradosPorTexto = terminoNormalizado
        ? lista.filter(libro => {
            const camposPorFiltro = {
              general: [
                libro.titulo,
                libro.autor,
                libro.isbn,
                libro.categoria?.nombre,
                libro.categoria?.codigo_dewey,
                ...(libro.ejemplar || []).map(ej => ej.codigo_inventario),
                ...(libro.ejemplar || []).map(ej => ej.ubicacion_dewey),
              ],
              titulo: [libro.titulo],
              autor: [libro.autor],
            }
            return (camposPorFiltro[filtroActual] || camposPorFiltro.general)
              .some(campo => normalizarTexto(campo).includes(terminoNormalizado))
          })
        : lista
      const filtrados = filtradosPorTexto.filter(libro => {
        const ejemplares = libro.ejemplar || []
        const tieneFueraServicio = ejemplares.some(ej => ej.estado === 'FUERA_DE_SERVICIO')
        const todosFueraServicio = ejemplares.length > 0 && ejemplares.every(ej => ej.estado === 'FUERA_DE_SERVICIO')

        if (vistaActual === 'fuera_servicio') return tieneFueraServicio
        if (!terminoNormalizado && todosFueraServicio) return false
        return true
      })

      const desde = (pag - 1) * POR_PAGINA
      const hasta = desde + POR_PAGINA
      setResultados(filtrados.slice(desde, hasta))
      setTotal(filtrados.length)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    let activo = true

    async function cargarInicial() {
      await Promise.resolve()
      if (activo) cargarTitulos(1, '', 'general', 'activos')
    }

    cargarInicial()
    return () => { activo = false }
  }, [cargarTitulos])

  function handleBuscar() {
    setPagina(1)
    cargarTitulos(1, busqueda, filtro, vistaCatalogo)
  }

  function handleLimpiar() {
    setBusqueda('')
    setFiltro('general')
    setVistaCatalogo('activos')
    setPagina(1)
    cargarTitulos(1, '', 'general', 'activos')
  }

  function handlePagina(nueva) {
    setPagina(nueva)
    cargarTitulos(nueva, busqueda, filtro, vistaCatalogo)
  }

  function handleVistaCatalogo(nuevaVista) {
    setVistaCatalogo(nuevaVista)
    setPagina(1)
    cargarTitulos(1, busqueda, filtro, nuevaVista)
  }

  function contarDisponibles(ejemplares) {
    return (ejemplares || []).filter(e => e.estado === 'DISPONIBLE').length
  }

  function contarEstados(ejemplares) {
    return (ejemplares || []).reduce((acc, ejemplar) => {
      acc[ejemplar.estado] = (acc[ejemplar.estado] || 0) + 1
      return acc
    }, { DISPONIBLE: 0, PRESTADO: 0, FUERA_DE_SERVICIO: 0 })
  }

  function ubicacionPrincipal(ejemplares) {
    if (!ejemplares || ejemplares.length === 0) return '—'
    return ejemplares[0].ubicacion_dewey
  }

  function colorDisponibilidad(disponibles, total) {
    if (disponibles === 0) return '#dc2626'
    if (disponibles < total) return '#d97706'
    return '#16a34a'
  }

  function estadoEjemplarTexto(estado) {
    const estados = {
      DISPONIBLE: 'Disponible',
      PRESTADO: 'Prestado',
      FUERA_DE_SERVICIO: 'Fuera de servicio',
    }
    return estados[estado] || estado || 'Sin estado'
  }

  function colorEstadoEjemplar(estado) {
    const colores = {
      DISPONIBLE: '#16a34a',
      PRESTADO: '#d97706',
      FUERA_DE_SERVICIO: '#dc2626',
    }
    return colores[estado] || 'var(--muted-ink)'
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  }

  const cardStyle = {
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface-panel)',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <h1>Catálogo de libros</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ padding: '8px', fontSize: '14px' }}
        >
          <option value="general">Todo el catálogo</option>
          <option value="titulo">Solo título</option>
          <option value="autor">Solo autor</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por título, autor, ISBN, categoría o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleBuscar()}
          style={{ padding: '8px', fontSize: '14px', flex: 1, minWidth: '200px' }}
        />
        <button onClick={handleBuscar} style={{ padding: '8px 16px', cursor: 'pointer' }}>Buscar</button>
        <button onClick={handleLimpiar} style={{ padding: '8px 16px', cursor: 'pointer' }}>Limpiar</button>
      </div>
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'var(--surface-muted)', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'activos', label: 'Catalogo activo' },
          { id: 'fuera_servicio', label: 'Fuera de servicio' },
        ].map(vista => {
          const activo = vistaCatalogo === vista.id
          return (
            <button
              key={vista.id}
              onClick={() => handleVistaCatalogo(vista.id)}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                background: activo ? 'var(--brand-primary)' : 'transparent',
                color: activo ? 'white' : '#475569',
                fontSize: '13px',
                fontWeight: 900,
              }}
            >
              {vista.label}
            </button>
          )
        })}
      </div>

      {!cargando && (
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          {total} {total === 1 ? 'título encontrado' : 'títulos encontrados'}
          {totalPaginas > 1 ? ` — Página ${pagina} de ${totalPaginas}` : ''}
        </p>
      )}

      {cargando && <p>Cargando...</p>}

      {!cargando && resultados.length === 0 && (
        <p style={{ color: '#666' }}>
          No se encontraron resultados. Puedes buscar sin importar mayúsculas o tildes.
        </p>
      )}

      {!cargando && (
        <div style={gridStyle}>
          {resultados.map(libro => {
            const disponibles = contarDisponibles(libro.ejemplar)
            const estados = contarEstados(libro.ejemplar)
            const totalEjemplares = libro.ejemplar?.length || 0
            const color = colorDisponibilidad(disponibles, totalEjemplares)
            const deweyCode = libro.categoria?.codigo_dewey || ubicacionPrincipal(libro.ejemplar)
            const mostrarPortadaGenerada = !libro.imagen_url || imagenesRotas[libro.id_titulo]

            return (
              <div key={libro.id_titulo} style={cardStyle}>
                <div style={{ padding: '12px 12px 0 12px' }}>
                  {mostrarPortadaGenerada ? (
                    <BookCover deweyCode={deweyCode} title={libro.titulo} id={libro.id_titulo} />
                  ) : (
                    <img
                      src={libro.imagen_url}
                      alt={libro.titulo}
                      style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-soft)' }}
                      onError={() => setImagenesRotas(prev => ({ ...prev, [libro.id_titulo]: true }))}
                    />
                  )}
                </div>

                {/* Contenido */}
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', lineHeight: '1.3' }}>
                    {libro.titulo}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                    {libro.autor}
                  </p>
                  {libro.isbn && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                      ISBN: {libro.isbn}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Dewey: {libro.categoria?.codigo_dewey} — {ubicacionPrincipal(libro.ejemplar)}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 'bold', color }}>
                    {disponibles}/{totalEjemplares} disponibles
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {estados.PRESTADO > 0 && (
                      <span style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', borderRadius: '999px', padding: '3px 7px', fontSize: '11px', fontWeight: 800 }}>
                        {estados.PRESTADO} prestado{estados.PRESTADO === 1 ? '' : 's'}
                      </span>
                    )}
                    {estados.FUERA_DE_SERVICIO > 0 && (
                      <span style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: '999px', padding: '3px 7px', fontSize: '11px', fontWeight: 800 }}>
                        {estados.FUERA_DE_SERVICIO} fuera de servicio
                      </span>
                    )}
                  </div>
                  {(libro.ejemplar || []).length > 0 && (
                    <div style={{ display: 'grid', gap: '4px', marginTop: '8px' }}>
                      {(libro.ejemplar || []).slice(0, 3).map(ejemplar => (
                        <div key={ejemplar.id_ejemplar} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: 'var(--muted-ink)', fontSize: '11px' }}>
                          <span>{ejemplar.codigo_inventario}</span>
                          <span style={{ color: colorEstadoEjemplar(ejemplar.estado), fontWeight: 800 }}>
                            {estadoEjemplarTexto(ejemplar.estado)}
                          </span>
                        </div>
                      ))}
                      {(libro.ejemplar || []).length > 3 && (
                        <span style={{ color: 'var(--muted-ink)', fontSize: '11px' }}>
                          +{libro.ejemplar.length - 3} ejemplares mas
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => navigate('/prestamos', { state: { libroPreseleccionado: libro, tipoPreseleccionado: 'EXTERNO_INMEDIATO' } })}
                    style={{
                      width: '100%', padding: '7px', cursor: 'pointer', fontSize: '13px',
                      background: disponibles === 0 ? '#e5e7eb' : '#059669',
                      color: disponibles === 0 ? '#9ca3af' : 'white',
                      border: 'none', borderRadius: '4px',
                    }}
                    disabled={disponibles === 0}
                  >
                    Préstamo inmediato
                  </button>
                  {libro.categoria?.permite_prestamo_formal === true && (
  <button
    onClick={() => navigate('/prestamos', { state: { libroPreseleccionado: libro, tipoPreseleccionado: 'FORMAL' } })}
    style={{
      width: '100%', padding: '7px', cursor: 'pointer', fontSize: '13px',
      background: disponibles === 0 ? '#e5e7eb' : '#1d4ed8',
      color: disponibles === 0 ? '#9ca3af' : 'white',
      border: 'none', borderRadius: '4px',
    }}
    disabled={disponibles === 0}
  >
    Préstamo formal
  </button>
)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
          <button
            onClick={() => handlePagina(pagina - 1)}
            disabled={pagina === 1}
            style={{ padding: '6px 14px', cursor: pagina === 1 ? 'default' : 'pointer' }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: '14px' }}>Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => handlePagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            style={{ padding: '6px 14px', cursor: pagina === totalPaginas ? 'default' : 'pointer' }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
