import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Reportes() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [masSolicitados, setMasSolicitados] = useState([])
  const [multas, setMultas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [generado, setGenerado] = useState(false)

  async function generarReporte() {
    if (!fechaInicio || !fechaFin) return
    setCargando(true)
    setGenerado(false)

    const { data: dataPrestamos } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida, fecha_devolucion_esperada, fecha_devolucion_real,
        lector (nombre),
        ejemplar (titulo (titulo))
      `)
      .gte('fecha_salida', fechaInicio)
      .lte('fecha_salida', fechaFin)
      .order('fecha_salida', { ascending: false })

    const { data: dataMultas } = await supabase
      .from('multa')
      .select(`
        id_multa, dias_retraso, monto_total, pagada, estado_libro, generada_en,
        prestamo (
          lector (nombre),
          ejemplar (titulo (titulo))
        )
      `)
      .gte('generada_en', fechaInicio)
      .lte('generada_en', fechaFin + 'T23:59:59')

    setPrestamos(dataPrestamos || [])
    setMultas(dataMultas || [])

    // Calcular más solicitados
    const conteo = {}
    for (const p of dataPrestamos || []) {
      const titulo = p.ejemplar?.titulo?.titulo
      if (titulo) conteo[titulo] = (conteo[titulo] || 0) + 1
    }
    const ordenados = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([titulo, cantidad]) => ({ titulo, cantidad }))
    setMasSolicitados(ordenados)

    setCargando(false)
    setGenerado(true)
  }

  function colorEstado(estado) {
    if (estado === 'ACTIVO') return '#d97706'
    if (estado === 'DEVUELTO') return '#16a34a'
    return '#dc2626'
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Reportes</h1>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            Desde
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            style={{ padding: '8px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            Hasta
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            style={{ padding: '8px', fontSize: '14px' }}
          />
        </div>
        <button
          onClick={generarReporte}
          disabled={cargando || !fechaInicio || !fechaFin}
          style={{ padding: '8px 20px', cursor: 'pointer' }}
        >
          {cargando ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>

      {generado && (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2>Préstamos en el período ({prestamos.length})</h2>
            {prestamos.length === 0 ? (
              <p style={{ color: '#666' }}>Sin préstamos en este período.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Estado</th>
                    <th style={{ padding: '8px' }}>Fecha salida</th>
                    <th style={{ padding: '8px' }}>Devuelto</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre || '—'}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{p.tipo}</td>
                      <td style={{ padding: '8px', color: colorEstado(p.estado), fontWeight: 'bold' }}>{p.estado}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_salida}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_devolucion_real || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2>Libros más solicitados</h2>
            {masSolicitados.length === 0 ? (
              <p style={{ color: '#666' }}>Sin datos.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Título</th>
                    <th style={{ padding: '8px' }}>Préstamos</th>
                  </tr>
                </thead>
                <tbody>
                  {masSolicitados.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{item.titulo}</td>
                      <td style={{ padding: '8px' }}>{item.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Multas en el período ({multas.length})</h2>
            {multas.length === 0 ? (
              <p style={{ color: '#666' }}>Sin multas en este período.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Días retraso</th>
                    <th style={{ padding: '8px' }}>Estado libro</th>
                    <th style={{ padding: '8px' }}>Monto</th>
                    <th style={{ padding: '8px' }}>Pagada</th>
                  </tr>
                </thead>
                <tbody>
                  {multas.map(m => (
                    <tr key={m.id_multa} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{m.prestamo?.lector?.nombre || '—'}</td>
                      <td style={{ padding: '8px' }}>{m.prestamo?.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{m.dias_retraso}</td>
                      <td style={{ padding: '8px' }}>{m.estado_libro}</td>
                      <td style={{ padding: '8px' }}>Q{Number(m.monto_total).toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>{m.pagada ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}