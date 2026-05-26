 import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const POR_PAGINA = 20
const IMAGEN_PLACEHOLDER = 'https://via.placeholder.com/150x200?text=Libro'

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
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)

  async function cargarTitulos(pag, termino, filtroActual) {
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
      const filtrados = terminoNormalizado
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

      const desde = (pag - 1) * POR_PAGINA
      const hasta = desde + POR_PAGINA
      setResultados(filtrados.slice(desde, hasta))
      setTotal(filtrados.length)
    }
    setCargando(false)
  }

  useEffect(() => {
    let activo = true

    async function cargarInicial() {
      await Promise.resolve()
      if (activo) cargarTitulos(1, '', 'general')
    }

    cargarInicial()
    return () => { activo = false }
  }, [])

  function handleBuscar() {
    setPagina(1)
    cargarTitulos(1, busqueda, filtro)
  }

  function handleLimpiar() {
    setBusqueda('')
    setFiltro('general')
    setPagina(1)
    cargarTitulos(1, '', 'general')
  }

  function handlePagina(nueva) {
    setPagina(nueva)
    cargarTitulos(nueva, busqueda, filtro)
  }

  function contarDisponibles(ejemplares) {
    return (ejemplares || []).filter(e => e.estado === 'DISPONIBLE').length
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

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  }

  const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <h1>Catálogo de libros</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
            const totalEjemplares = libro.ejemplar?.length || 0
            const color = colorDisponibilidad(disponibles, totalEjemplares)

            return (
              <div key={libro.id_titulo} style={cardStyle}>
                {/* Imagen */}
                <img
                  src={libro.imagen_url || IMAGEN_PLACEHOLDER}
                  alt={libro.titulo}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  onError={e => { e.target.src = IMAGEN_PLACEHOLDER }}
                />

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
