import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Catalogo() {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('titulo')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function buscar() {
    setCargando(true)
    setBuscado(true)

    let query = supabase
      .from('titulo')
      .select(`
        id_titulo, titulo, autor, isbn, anio_publicacion, imagen_url,
        categoria (nombre, codigo_dewey),
        ejemplar (id_ejemplar, codigo_inventario, ubicacion_dewey, estado)
      `)
      .eq('activo', true)

    if (busqueda.trim()) {
      if (filtro === 'titulo') query = query.ilike('titulo', `%${busqueda}%`)
      else if (filtro === 'autor') query = query.ilike('autor', `%${busqueda}%`)
      else if (filtro === 'dewey') query = query.ilike('categoria.codigo_dewey', `%${busqueda}%`)
    }

    query = query.order('titulo', { ascending: true }).limit(50)

    const { data, error } = await query

    if (error) {
      console.error('Error en búsqueda:', error)
      setResultados([])
    } else {
      setResultados(data || [])
    }

    setCargando(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') buscar()
  }

  function contarDisponibles(ejemplares) {
    if (!ejemplares) return 0
    return ejemplares.filter(e => e.estado === 'DISPONIBLE').length
  }

  function colorEstado(estado) {
    if (estado === 'DISPONIBLE') return '#16a34a'
    if (estado === 'PRESTADO') return '#d97706'
    return '#dc2626'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Catálogo de libros</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ padding: '8px', fontSize: '14px' }}
        >
          <option value="titulo">Por título</option>
          <option value="autor">Por autor</option>
          <option value="dewey">Por categoría Dewey</option>
        </select>
        <input
          type="text"
          placeholder="Escriba para buscar..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: '8px', fontSize: '14px', flex: 1, minWidth: '200px' }}
        />
        <button
          onClick={buscar}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Buscar
        </button>
        <button
          onClick={() => { setBusqueda(''); setResultados([]); setBuscado(false) }}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Limpiar
        </button>
      </div>

      {cargando && <p>Buscando...</p>}

      {!cargando && buscado && resultados.length === 0 && (
        <p style={{ color: '#666' }}>No se encontraron resultados.</p>
      )}

      {!cargando && resultados.map(libro => (
        <div
          key={libro.id_titulo}
          style={{
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>{libro.titulo}</h3>
              <p style={{ margin: '0 0 4px 0', color: '#555', fontSize: '14px' }}>
                {libro.autor} {libro.anio_publicacion ? `(${libro.anio_publicacion})` : ''}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#888' }}>
                {libro.categoria?.nombre} — Dewey: {libro.categoria?.codigo_dewey}
                {libro.isbn ? ` — ISBN: ${libro.isbn}` : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: '120px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
                Disponibles: {contarDisponibles(libro.ejemplar)} / {libro.ejemplar?.length || 0}
              </p>
            </div>
          </div>

          {libro.ejemplar && libro.ejemplar.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '8px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Código</th>
                  <th style={{ padding: '4px 8px' }}>Ubicación Dewey</th>
                  <th style={{ padding: '4px 8px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {libro.ejemplar.map(ej => (
                  <tr key={ej.id_ejemplar} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px' }}>{ej.codigo_inventario}</td>
                    <td style={{ padding: '4px 8px' }}>{ej.ubicacion_dewey}</td>
                    <td style={{ padding: '4px 8px', color: colorEstado(ej.estado), fontWeight: 'bold' }}>
                      {ej.estado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}