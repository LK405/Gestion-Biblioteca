import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const { usuario, rol, logout } = useAuth()
  const [porVencer, setPorVencer] = useState([])
  const [vencidos, setVencidos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarAlertas() {
      const hoy = new Date()
      const manana = new Date()
      manana.setDate(hoy.getDate() + 1)

      const hoyStr = hoy.toISOString().split('T')[0]
      const mananaStr = manana.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('prestamo')
        .select(`
          id_prestamo,
          fecha_devolucion_esperada,
          estado,
          lector (nombre, telefono),
          ejemplar (
            titulo (titulo)
          )
        `)
        .eq('tipo', 'FORMAL')
        .in('estado', ['ACTIVO', 'VENCIDO'])
        .order('fecha_devolucion_esperada', { ascending: true })

      if (error) {
        console.error('Error cargando alertas:', error)
        setCargando(false)
        return
      }

      const porVencerFiltro = data.filter(p =>
        p.estado === 'ACTIVO' &&
        p.fecha_devolucion_esperada >= hoyStr &&
        p.fecha_devolucion_esperada <= mananaStr
      )

      const vencidosFiltro = data.filter(p => {
        if (p.estado === 'VENCIDO') return true
        if (p.estado === 'ACTIVO' && p.fecha_devolucion_esperada < hoyStr) return true
        return false
      })

      setPorVencer(porVencerFiltro)
      setVencidos(vencidosFiltro)
      setCargando(false)
    }

    cargarAlertas()
  }, [])

  function diasRetraso(fecha) {
    const hoy = new Date()
    const limite = new Date(fecha)
    const diff = Math.floor((hoy - limite) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Panel de alertas</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            {usuario?.nombre} — {rol}
          </p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>

      {cargando ? (
        <p>Cargando alertas...</p>
      ) : (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#b45309' }}>
              Por vencer hoy o mañana ({porVencer.length})
            </h2>
            {porVencer.length === 0 ? (
              <p style={{ color: '#666' }}>Sin préstamos por vencer.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Teléfono</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Fecha límite</th>
                  </tr>
                </thead>
                <tbody>
                  {porVencer.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre}</td>
                      <td style={{ padding: '8px' }}>{p.lector?.telefono}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 style={{ color: '#dc2626' }}>
              Vencidos ({vencidos.length})
            </h2>
            {vencidos.length === 0 ? (
              <p style={{ color: '#666' }}>Sin préstamos vencidos.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Teléfono</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Días de retraso</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre}</td>
                      <td style={{ padding: '8px' }}>{p.lector?.telefono}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{diasRetraso(p.fecha_devolucion_esperada)} días</td>
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