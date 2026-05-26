import { useMemo, useState } from 'react'
import { BarChart3, BookOpen, CreditCard, Repeat2, Search, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Reportes() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [masSolicitados, setMasSolicitados] = useState([])
  const [multas, setMultas] = useState([])
  const [usuariosRecurrentes, setUsuariosRecurrentes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function generarReporte() {
    if (!fechaInicio || !fechaFin) return
    setCargando(true)
    setGenerado(false)
    setMensaje('')

    const { data: dataPrestamos, error: errorPrestamos } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida, fecha_devolucion_esperada, fecha_devolucion_real,
        nombre_inmediato, dpi_garantia,
        lector (nombre, dpi),
        ejemplar (codigo_inventario, titulo (titulo))
      `)
      .gte('fecha_salida', fechaInicio)
      .lte('fecha_salida', fechaFin)
      .order('fecha_salida', { ascending: false })

    const { data: dataMultas, error: errorMultas } = await supabase
      .from('multa')
      .select(`
        id_multa, dias_retraso, monto_total, pagada, estado_libro, generada_en,
        prestamo (
          tipo, nombre_inmediato, dpi_garantia,
          lector (nombre, dpi),
          ejemplar (codigo_inventario, titulo (titulo))
        )
      `)
      .gte('generada_en', fechaInicio)
      .lte('generada_en', `${fechaFin}T23:59:59`)
      .order('generada_en', { ascending: false })

    if (errorPrestamos || errorMultas) {
      console.error('Error generando reporte:', errorPrestamos || errorMultas)
      setMensaje('No se pudo generar el reporte.')
      setCargando(false)
      return
    }

    const prestamosPeriodo = dataPrestamos || []
    const multasPeriodo = dataMultas || []
    setPrestamos(prestamosPeriodo)
    setMultas(multasPeriodo)

    const conteoLibros = {}
    const conteoUsuarios = {}

    prestamosPeriodo.forEach(prestamo => {
      const titulo = prestamo.ejemplar?.titulo?.titulo
      if (titulo) conteoLibros[titulo] = (conteoLibros[titulo] || 0) + 1

      const nombre = prestamo.lector?.nombre || prestamo.nombre_inmediato
      const dpi = prestamo.lector?.dpi || prestamo.dpi_garantia || ''
      const clave = dpi ? `dpi:${dpi}` : `nombre:${nombre || 'Sin nombre'}`
      if (!conteoUsuarios[clave]) {
        conteoUsuarios[clave] = {
          nombre: nombre || 'Sin nombre',
          dpi,
          cantidad: 0,
          formales: 0,
          inmediatos: 0,
        }
      }
      conteoUsuarios[clave].cantidad += 1
      if (prestamo.tipo === 'FORMAL') conteoUsuarios[clave].formales += 1
      if (prestamo.tipo === 'EXTERNO_INMEDIATO') conteoUsuarios[clave].inmediatos += 1
    })

    setMasSolicitados(
      Object.entries(conteoLibros)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([titulo, cantidad]) => ({ titulo, cantidad }))
    )

    setUsuariosRecurrentes(
      Object.values(conteoUsuarios)
        .filter(usuario => usuario.cantidad >= 2)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)
    )

    setCargando(false)
    setGenerado(true)
  }

  const analisis = useMemo(() => {
    const totalPrestamos = prestamos.length
    const formales = prestamos.filter(p => p.tipo === 'FORMAL').length
    const inmediatos = prestamos.filter(p => p.tipo === 'EXTERNO_INMEDIATO').length
    const activos = prestamos.filter(p => p.estado === 'ACTIVO').length
    const devueltos = prestamos.filter(p => p.estado === 'DEVUELTO').length
    const vencidos = prestamos.filter(p => p.estado === 'VENCIDO').length
    const totalMultas = multas.reduce((sum, multa) => sum + Number(multa.monto_total || 0), 0)
    const multasPendientes = multas.filter(m => !m.pagada).length
    const multasPagadas = multas.filter(m => m.pagada).length
    const recaudado = multas.filter(m => m.pagada).reduce((sum, multa) => sum + Number(multa.monto_total || 0), 0)
    const tasaDevolucion = totalPrestamos > 0 ? Math.round((devueltos / totalPrestamos) * 100) : 0

    return {
      totalPrestamos,
      formales,
      inmediatos,
      activos,
      devueltos,
      vencidos,
      totalMultas,
      multasPendientes,
      multasPagadas,
      recaudado,
      tasaDevolucion,
    }
  }, [prestamos, multas])

  function estadoColor(estado) {
    if (estado === 'ACTIVO') return '#d97706'
    if (estado === 'DEVUELTO') return '#16a34a'
    return '#dc2626'
  }

  function barra(valor, maximo) {
    return `${Math.max(5, Math.round((valor / Math.max(1, maximo)) * 100))}%`
  }

  const panelStyle = { border: '1px solid var(--border-soft)', borderRadius: '10px', background: 'var(--surface-panel)', padding: '18px', boxShadow: 'var(--shadow-panel)', backdropFilter: 'blur(12px)' }
  const inputStyle = {
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    background: 'var(--surface-panel)',
    color: 'var(--ink)',
  }
  const buttonPrimary = {
    border: 'none',
    borderRadius: '8px',
    background: cargando || !fechaInicio || !fechaFin ? 'rgba(100, 116, 139, 0.68)' : 'var(--brand-primary)',
    color: 'white',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: cargando || !fechaInicio || !fechaFin ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
  }

  const metricas = [
    { label: 'Prestamos', valor: analisis.totalPrestamos, color: 'var(--brand-primary)', icon: BookOpen },
    { label: 'Tasa devolucion', valor: `${analisis.tasaDevolucion}%`, color: '#16a34a', icon: TrendingUp },
    { label: 'Multas', valor: multas.length, color: '#dc2626', icon: CreditCard },
    { label: 'Usuarios recurrentes', valor: usuariosRecurrentes.length, color: '#7c3aed', icon: Repeat2 },
  ]

  const distribucionTipo = [
    { label: 'Formales', valor: analisis.formales, color: '#047857' },
    { label: 'Inmediatos', valor: analisis.inmediatos, color: 'var(--brand-primary)' },
  ]
  const distribucionEstado = [
    { label: 'Activos', valor: analisis.activos, color: '#d97706' },
    { label: 'Devueltos', valor: analisis.devueltos, color: '#16a34a' },
    { label: 'Vencidos', valor: analisis.vencidos, color: '#dc2626' },
  ]
  const maxLibros = Math.max(1, ...masSolicitados.map(item => item.cantidad))
  const maxUsuarios = Math.max(1, ...usuariosRecurrentes.map(item => item.cantidad))

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', background: 'var(--surface-muted)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Administracion</p>
          <h1 style={{ margin: 0, fontSize: '30px', color: 'var(--ink)' }}>Reportes</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--muted-ink)', fontSize: '14px' }}>
            Analisis de prestamos, demanda de libros, multas y usuarios recurrentes.
          </p>
        </div>
      </div>

      <section style={{ ...panelStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 800, display: 'block', marginBottom: '6px', color: '#334155' }}>Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 800, display: 'block', marginBottom: '6px', color: '#334155' }}>Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={generarReporte} disabled={cargando || !fechaInicio || !fechaFin} style={buttonPrimary}>
            <Search size={15} /> {cargando ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
        {mensaje && (
          <p style={{ margin: '14px 0 0 0', color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontWeight: 700 }}>
            {mensaje}
          </p>
        )}
      </section>

      {!generado && (
        <section style={panelStyle}>
          <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '28px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>
            Selecciona un rango de fechas para generar el dashboard.
          </div>
        </section>
      )}

      {generado && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            {metricas.map(item => {
              const Icon = item.icon
              return (
                <section key={item.label} style={panelStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--muted-ink)', fontSize: '13px', fontWeight: 800 }}>{item.label}</p>
                      <p style={{ margin: 0, color: item.color, fontSize: '32px', fontWeight: 950 }}>{item.valor}</p>
                    </div>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--surface-muted)', color: item.color, display: 'grid', placeItems: 'center' }}>
                      <Icon size={21} />
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
            <section style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <BarChart3 size={20} color="var(--brand-primary)" />
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Distribucion de prestamos</h2>
              </div>
              {[...distribucionTipo, ...distribucionEstado].map(item => (
                <div key={item.label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', fontWeight: 800, marginBottom: '6px' }}>
                    <span>{item.label}</span>
                    <span>{item.valor}</span>
                  </div>
                  <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: barra(item.valor, analisis.totalPrestamos), height: '100%', background: item.color, borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </section>

            <section style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CreditCard size={20} color="#dc2626" />
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Multas del periodo</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', background: 'var(--surface-muted)' }}>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>Generado</p>
                  <p style={{ margin: 0, color: '#dc2626', fontSize: '22px', fontWeight: 900 }}>Q{analisis.totalMultas.toFixed(2)}</p>
                </div>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', background: 'var(--surface-muted)' }}>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>Recaudado</p>
                  <p style={{ margin: 0, color: '#16a34a', fontSize: '22px', fontWeight: 900 }}>Q{analisis.recaudado.toFixed(2)}</p>
                </div>
              </div>
              {[
                { label: 'Pagadas', valor: analisis.multasPagadas, color: '#16a34a' },
                { label: 'Pendientes', valor: analisis.multasPendientes, color: '#d97706' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', fontWeight: 800, marginBottom: '6px' }}>
                    <span>{item.label}</span>
                    <span>{item.valor}</span>
                  </div>
                  <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: barra(item.valor, multas.length), height: '100%', background: item.color, borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '20px' }}>
            <section style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <BookOpen size={20} color="var(--brand-primary)" />
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Libros mas solicitados</h2>
              </div>
              {masSolicitados.length === 0 ? (
                <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '22px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>Sin datos.</div>
              ) : (
                masSolicitados.map((item, index) => (
                  <div key={item.titulo} style={{ marginBottom: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', color: '#334155', fontWeight: 800, marginBottom: '6px' }}>
                      <span>{index + 1}. {item.titulo}</span>
                      <span>{item.cantidad}</span>
                    </div>
                    <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: barra(item.cantidad, maxLibros), height: '100%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))', borderRadius: '999px' }} />
                    </div>
                  </div>
                ))
              )}
            </section>

            <section style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Users size={20} color="#7c3aed" />
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Usuarios recurrentes</h2>
              </div>
              {usuariosRecurrentes.length === 0 ? (
                <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '22px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>
                  No hay usuarios con 2 o mas prestamos en este periodo.
                </div>
              ) : (
                usuariosRecurrentes.map(usuario => (
                  <div key={`${usuario.nombre}-${usuario.dpi}`} style={{ marginBottom: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px', color: '#334155', fontWeight: 800, marginBottom: '6px' }}>
                      <span>{usuario.nombre}</span>
                      <span>{usuario.cantidad}</span>
                    </div>
                    <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: barra(usuario.cantidad, maxUsuarios), height: '100%', background: '#7c3aed', borderRadius: '999px' }} />
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--muted-ink)', fontSize: '12px' }}>
                      Formal: {usuario.formales} · Inmediato: {usuario.inmediatos}
                    </p>
                  </div>
                ))
              )}
            </section>
          </div>

          <section style={panelStyle}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--ink)' }}>Prestamos en el periodo</h2>
            {prestamos.length === 0 ? (
              <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '22px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>Sin prestamos en este periodo.</div>
            ) : (
              <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '860px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-muted)', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Usuario</th>
                      <th style={{ padding: '12px' }}>Libro</th>
                      <th style={{ padding: '12px' }}>Tipo</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Salida</th>
                      <th style={{ padding: '12px' }}>Devuelto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prestamos.slice(0, 12).map(p => (
                      <tr key={p.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', color: 'var(--ink)', fontWeight: 800 }}>{p.lector?.nombre || p.nombre_inmediato || '-'}</td>
                        <td style={{ padding: '12px', color: '#334155' }}>{p.ejemplar?.titulo?.titulo}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{p.tipo === 'FORMAL' ? 'Formal' : 'Inmediato'}</td>
                        <td style={{ padding: '12px', color: estadoColor(p.estado), fontWeight: 900 }}>{p.estado}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_salida}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_devolucion_real || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
