import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const DIAS_ALERTA = 7

export default function Dashboard() {
  const { usuario, rol } = useAuth()
  const [porVencer, setPorVencer] = useState([])
  const [vencidos, setVencidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [configMulta, setConfigMulta] = useState(null)

  // Actividad reciente
  const [actividad, setActividad] = useState(null)
  const [periodoActividad, setPeriodoActividad] = useState('semana')
  const [cargandoActividad, setCargandoActividad] = useState(false)

  useEffect(() => {
    cargarConfig().then(cargarAlertas)
    cargarActividad('semana')
  }, [])

  async function cargarConfig() {
    const { data } = await supabase.from('configuracionmulta').select('*').single()
    if (data) setConfigMulta(data)
  }

  async function cargarAlertas() {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(hoy)
    limite.setDate(hoy.getDate() + DIAS_ALERTA)
    const hoyStr = hoy.toISOString().split('T')[0]
    const limiteStr = limite.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, fecha_devolucion_esperada, estado,
        lector (nombre, telefono),
        ejemplar (titulo (titulo))
      `)
      .eq('tipo', 'FORMAL')
      .in('estado', ['ACTIVO', 'VENCIDO'])
      .order('fecha_devolucion_esperada', { ascending: true })

    if (error) {
      console.error('Error cargando alertas:', error)
      setCargando(false)
      return
    }

    const porVencerFiltro = (data || []).filter(p =>
      p.estado === 'ACTIVO' &&
      p.fecha_devolucion_esperada >= hoyStr &&
      p.fecha_devolucion_esperada <= limiteStr
    )

    const vencidosFiltro = (data || []).filter(p =>
      p.estado === 'VENCIDO' ||
      (p.estado === 'ACTIVO' && p.fecha_devolucion_esperada < hoyStr)
    )

    setPorVencer(porVencerFiltro)
    setVencidos(vencidosFiltro)
    setCargando(false)
  }

  async function cargarActividad(periodo) {
    setCargandoActividad(true)
    const hoy = new Date()
    let fechaDesde
    if (periodo === 'dia') {
      fechaDesde = new Date(hoy); fechaDesde.setHours(0, 0, 0, 0)
    } else if (periodo === 'semana') {
      fechaDesde = new Date(hoy); fechaDesde.setDate(hoy.getDate() - 7)
    } else {
      fechaDesde = new Date(hoy); fechaDesde.setMonth(hoy.getMonth() - 1)
    }
    const desdeStr = fechaDesde.toISOString().split('T')[0]

    const [{ count: prestamosCount }, { count: devolucionesCount }, { count: multasCount }, { data: sinEjemplares }] =
      await Promise.all([
        supabase.from('prestamo').select('*', { count: 'exact', head: true }).gte('fecha_salida', desdeStr),
        supabase.from('prestamo').select('*', { count: 'exact', head: true }).eq('estado', 'DEVUELTO').gte('fecha_devolucion_real', desdeStr),
        supabase.from('multa').select('*', { count: 'exact', head: true }).gte('generada_en', desdeStr + 'T00:00:00'),
        supabase.from('titulo').select('id_titulo, titulo, ejemplar!inner(estado)').eq('activo', true).eq('ejemplar.estado', 'DISPONIBLE'),
      ])

    const { data: todosLosTitulos } = await supabase.from('titulo').select('id_titulo').eq('activo', true)
    const conDisponibles = new Set((sinEjemplares || []).map(t => t.id_titulo))
    const sinDisponibles = (todosLosTitulos || []).filter(t => !conDisponibles.has(t.id_titulo)).length

    setActividad({
      prestamos: prestamosCount || 0,
      devoluciones: devolucionesCount || 0,
      multas: multasCount || 0,
      sinDisponibles,
    })
    setCargandoActividad(false)
  }

  function diasRetraso(fecha) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(fecha)
    return Math.max(0, Math.floor((hoy - limite) / (1000 * 60 * 60 * 24)))
  }

  function multaEstimada(fecha) {
    if (!configMulta) return '—'
    const dias = diasRetraso(fecha)
    if (dias === 0) return 'Q0.00'
    const monto = configMulta.cargo_base_vencimiento + (dias * configMulta.cargo_por_dia)
    return `Q${monto.toFixed(2)}`
  }

  function diasRestantes(fecha) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(fecha)
    const diff = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Vence hoy'
    if (diff === 1) return 'Vence mañana'
    return `Vence en ${diff} días`
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px 0' }}>Panel de alertas</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          {usuario?.nombre} — {rol}
        </p>
      </div>

      {cargando ? (
        <p>Cargando alertas...</p>
      ) : (
        <>
          <section style={{ marginBottom: '36px' }}>
            <h2 style={{ color: '#b45309', marginBottom: '12px' }}>
              Por vencer — próximos {DIAS_ALERTA} días ({porVencer.length})
            </h2>
            {porVencer.length === 0 ? (
              <p style={{ color: '#666' }}>Sin préstamos por vencer en los próximos {DIAS_ALERTA} días.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Lector</th>
                    <th style={{ padding: '8px' }}>Teléfono</th>
                    <th style={{ padding: '8px' }}>Libro</th>
                    <th style={{ padding: '8px' }}>Fecha límite</th>
                    <th style={{ padding: '8px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {porVencer.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre}</td>
                      <td style={{ padding: '8px' }}>{p.lector?.telefono}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada}</td>
                      <td style={{ padding: '8px', color: '#b45309', fontSize: '13px' }}>
                        {diasRestantes(p.fecha_devolucion_esperada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>
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
                    <th style={{ padding: '8px' }}>Fecha límite</th>
                    <th style={{ padding: '8px' }}>Días retraso</th>
                    <th style={{ padding: '8px' }}>Multa estimada</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map(p => (
                    <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.lector?.nombre}</td>
                      <td style={{ padding: '8px' }}>{p.lector?.telefono}</td>
                      <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                      <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada}</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 'bold' }}>
                        {diasRetraso(p.fecha_devolucion_esperada)} días
                      </td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 'bold' }}>
                        {multaEstimada(p.fecha_devolucion_esperada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {/* ACTIVIDAD RECIENTE */}
      <section style={{ marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Actividad reciente</h2>
          <select
            value={periodoActividad}
            onChange={e => { setPeriodoActividad(e.target.value); cargarActividad(e.target.value) }}
            style={{ padding: '8px', fontSize: '14px' }}
          >
            <option value="dia">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
          </select>
        </div>

        {cargandoActividad && <p>Cargando...</p>}

        {!cargandoActividad && actividad && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Préstamos registrados', valor: actividad.prestamos, color: '#1d4ed8' },
              { label: 'Devoluciones realizadas', valor: actividad.devoluciones, color: '#16a34a' },
              { label: 'Multas generadas', valor: actividad.multas, color: '#dc2626' },
              { label: 'Títulos sin disponibilidad', valor: actividad.sinDisponibles, color: '#d97706' },
            ].map(item => (
              <div key={item.label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#555' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: item.color }}>{item.valor}</p>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}