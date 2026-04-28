import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Lectores() {
  const [busqueda, setBusqueda] = useState('')
  const [lectores, setLectores] = useState([])
  const [cargando, setCargando] = useState(false)
  const [lectorSeleccionado, setLectorSeleccionado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [niveles, setNiveles] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])

  useEffect(() => {
    cargarNiveles()
    cargarEstablecimientos()
  }, [])

  async function cargarNiveles() {
    const { data } = await supabase.from('niveleducativo').select('*').order('id_nivel')
    setNiveles(data || [])
  }

  async function cargarEstablecimientos() {
    const { data } = await supabase.from('establecimiento').select('*')
    setEstablecimientos(data || [])
  }

  function nombreNivel(idNivel) {
    return niveles.find(n => n.id_nivel === idNivel)?.nombre || '—'
  }

  function nombreEstablecimiento(idEstablecimiento) {
    return establecimientos.find(e => e.id_establecimiento === idEstablecimiento)?.nombre || '—'
  }

  async function buscarLectores() {
    if (!busqueda.trim()) return
    setCargando(true)
    const { data } = await supabase
      .from('lector')
      .select('*')
      .ilike('nombre', `%${busqueda}%`)
      .order('nombre')
      .limit(20)
    setLectores(data || [])
    setCargando(false)
    setLectorSeleccionado(null)
    setHistorial([])
  }

  async function verHistorial(lector) {
    setLectorSeleccionado(lector)
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

  function colorEstado(estado) {
    if (estado === 'ACTIVO') return '#d97706'
    if (estado === 'DEVUELTO') return '#16a34a'
    return '#dc2626'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Historial de lectores</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Buscar lector por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscarLectores()}
          style={{ padding: '8px', fontSize: '14px', flex: 1 }}
        />
        <button onClick={buscarLectores} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Buscar
        </button>
      </div>

      {cargando && <p>Buscando...</p>}

      {!lectorSeleccionado && lectores.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Nombre</th>
              <th style={{ padding: '8px' }}>DPI</th>
              <th style={{ padding: '8px' }}>Teléfono</th>
              <th style={{ padding: '8px' }}>Menor</th>
              <th style={{ padding: '8px' }}>Estudiante</th>
              <th style={{ padding: '8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lectores.map(l => (
              <tr key={l.id_lector} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{l.nombre}</td>
                <td style={{ padding: '8px' }}>{l.dpi || '—'}</td>
                <td style={{ padding: '8px' }}>{l.telefono || '—'}</td>
                <td style={{ padding: '8px' }}>{l.es_menor ? 'Sí' : 'No'}</td>
                <td style={{ padding: '8px' }}>{l.id_nivel ? 'Sí' : 'No'}</td>
                <td style={{ padding: '8px' }}>
                  <button onClick={() => verHistorial(l)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
                    Ver historial
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {lectorSeleccionado && (
        <div>
          <button
            onClick={() => { setLectorSeleccionado(null); setHistorial([]) }}
            style={{ marginBottom: '16px', padding: '6px 14px', cursor: 'pointer' }}
          >
            ← Volver
          </button>
          <h2>{lectorSeleccionado.nombre}</h2>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            <p style={{ margin: '2px 0' }}>DPI: {lectorSeleccionado.dpi || '—'}</p>
            <p style={{ margin: '2px 0' }}>Teléfono: {lectorSeleccionado.telefono || '—'}</p>
            <p style={{ margin: '2px 0' }}>Dirección: {lectorSeleccionado.direccion || '—'}</p>
            <p style={{ margin: '2px 0' }}>Menor de edad: {lectorSeleccionado.es_menor ? 'Sí' : 'No'}</p>
            {lectorSeleccionado.es_menor && (
              <>
                <p style={{ margin: '2px 0' }}>Tutor: {lectorSeleccionado.nombre_tutor || '—'}</p>
                <p style={{ margin: '2px 0' }}>Tel. tutor: {lectorSeleccionado.telefono_tutor || '—'}</p>
              </>
            )}
            {lectorSeleccionado.id_nivel && (
              <>
                <p style={{ margin: '2px 0' }}>Nivel: {nombreNivel(lectorSeleccionado.id_nivel)}</p>
                <p style={{ margin: '2px 0' }}>Establecimiento: {nombreEstablecimiento(lectorSeleccionado.id_establecimiento)}</p>
                <p style={{ margin: '2px 0' }}>Grado/Ciclo: {lectorSeleccionado.grado_ciclo || '—'}</p>
              </>
            )}
          </div>

          {cargandoHistorial && <p>Cargando historial...</p>}

          {!cargandoHistorial && historial.length === 0 && (
            <p style={{ color: '#666' }}>Este lector no tiene préstamos registrados.</p>
          )}

          {!cargandoHistorial && historial.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Libro</th>
                  <th style={{ padding: '8px' }}>Tipo</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px' }}>Fecha salida</th>
                  <th style={{ padding: '8px' }}>Fecha límite</th>
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
    </div>
  )
}