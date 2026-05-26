import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const DIAS_ALERTA = 7

export default function Dashboard() {
  const navigate = useNavigate()
  const { usuario, rol } = useAuth()
  const [porVencer, setPorVencer] = useState([])
  const [vencidos, setVencidos] = useState([])
  const [inmediatos, setInmediatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [configMulta, setConfigMulta] = useState(null)
  const [devolucionPendiente, setDevolucionPendiente] = useState(null)
  const [estadoLibroDevolucion, setEstadoLibroDevolucion] = useState('BUENO')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [procesandoId, setProcesandoId] = useState(null)
  const [filtroPrestamos, setFiltroPrestamos] = useState('todos')

  const [actividad, setActividad] = useState(null)
  const [periodoActividad, setPeriodoActividad] = useState('semana')
  const [cargandoActividad, setCargandoActividad] = useState(false)

  async function cargarConfig() {
    const { data } = await supabase.from('configuracionmulta').select('*').single()
    if (data) setConfigMulta(data)
    return data
  }

  async function cargarAlertas() {
    setCargando(true)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(hoy)
    limite.setDate(hoy.getDate() + DIAS_ALERTA)
    const hoyStr = hoy.toISOString().split('T')[0]
    const limiteStr = limite.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, id_ejemplar, fecha_salida, fecha_devolucion_esperada, estado, tipo,
        nombre_inmediato, dpi_garantia, hora_salida,
        lector (
          id_lector, nombre, dpi, telefono, direccion, es_menor,
          nombre_tutor, telefono_tutor, dpi_tutor, grado_ciclo
        ),
        ejemplar (id_ejemplar, codigo_inventario, ubicacion_dewey, titulo (titulo, autor))
      `)
      .in('estado', ['ACTIVO', 'VENCIDO'])
      .order('fecha_devolucion_esperada', { ascending: true })

    if (error) {
      console.error('Error cargando alertas:', error)
      setMensaje({ texto: 'No se pudieron cargar las alertas.', error: true })
      setCargando(false)
      return
    }

    const prestamos = data || []
    const prestamosFormales = prestamos.filter(p => p.tipo === 'FORMAL')

    const porVencerFiltro = prestamosFormales.filter(p =>
      p.estado === 'ACTIVO' &&
      p.fecha_devolucion_esperada >= hoyStr &&
      p.fecha_devolucion_esperada <= limiteStr
    )

    const vencidosFiltro = prestamosFormales.filter(p =>
      p.estado === 'VENCIDO' ||
      (p.estado === 'ACTIVO' && p.fecha_devolucion_esperada < hoyStr)
    )

    const inmediatosFiltro = prestamos.filter(p =>
      p.tipo === 'EXTERNO_INMEDIATO' && p.estado === 'ACTIVO'
    )

    setPorVencer(porVencerFiltro)
    setVencidos(vencidosFiltro)
    setInmediatos(inmediatosFiltro)
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

    const [{ count: prestamosCount }, { count: devolucionesCount }, { count: multasCount }] =
      await Promise.all([
        supabase.from('prestamo').select('*', { count: 'exact', head: true }).gte('fecha_salida', desdeStr),
        supabase.from('prestamo').select('*', { count: 'exact', head: true }).eq('estado', 'DEVUELTO').gte('fecha_devolucion_real', desdeStr),
        supabase.from('multa').select('*', { count: 'exact', head: true }).gte('generada_en', desdeStr + 'T00:00:00'),
      ])

    setActividad({
      prestamos: prestamosCount || 0,
      devoluciones: devolucionesCount || 0,
      multas: multasCount || 0,
    })
    setCargandoActividad(false)
  }

  useEffect(() => {
    let activo = true

    async function cargarDashboard() {
      await cargarConfig()
      if (!activo) return
      await Promise.all([cargarAlertas(), cargarActividad('semana')])
    }

    cargarDashboard()
    return () => { activo = false }
  }, [])

  function diasRetraso(fecha) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(fecha)
    return Math.max(0, Math.floor((hoy - limite) / (1000 * 60 * 60 * 24)))
  }

  function calcularMulta(prestamo, estadoLibro = 'BUENO') {
    const diasPrestamo = prestamo.tipo === 'FORMAL'
      ? diasRetraso(prestamo.fecha_devolucion_esperada)
      : 0
    if (!configMulta) {
      return { dias: diasPrestamo, cargoBase: 0, cargoPorDia: 0, totalDias: 0, cargoDano: 0, total: 0, tieneMulta: false }
    }
    const dias = diasPrestamo
    const cargoBase = dias > 0 ? Number(configMulta.cargo_base_vencimiento) : 0
    const cargoPorDia = Number(configMulta.cargo_por_dia)
    const totalDias = dias > 0 ? dias * cargoPorDia : 0
    const cargoDano = estadoLibro === 'DAÑADO_LEVE'
      ? Number(configMulta.cargo_daño_leve)
      : estadoLibro === 'DAÑADO_GRAVE'
        ? Number(configMulta.cargo_daño_grave)
        : 0
    const total = cargoBase + totalDias + cargoDano
    return { dias, cargoBase, cargoPorDia, totalDias, cargoDano, total, tieneMulta: total > 0 }
  }

  function multaEstimada(prestamo) {
    const multa = calcularMulta(prestamo)
    return `Q${multa.total.toFixed(2)}`
  }

  function diasRestantes(fecha) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(fecha)
    const diff = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Vence hoy'
    if (diff === 1) return 'Vence manana'
    return `Vence en ${diff} dias`
  }

  function abrirConfirmacionDevolucion(prestamo) {
    setDevolucionPendiente(prestamo)
    setEstadoLibroDevolucion('BUENO')
    setMensaje({ texto: '', error: false })
  }

  async function confirmarDevolucion() {
    if (!devolucionPendiente) return
    const prestamo = devolucionPendiente
    setProcesandoId(prestamo.id_prestamo)
    setMensaje({ texto: '', error: false })

    try {
      const hoy = new Date()
      const fechaHoy = hoy.toISOString().split('T')[0]
      const horaHoy = hoy.toTimeString().split(' ')[0]
      const multa = calcularMulta(prestamo, estadoLibroDevolucion)

      const { error: prestamoError } = await supabase
        .from('prestamo')
        .update({
          estado: 'DEVUELTO',
          fecha_devolucion_real: fechaHoy,
          hora_regreso: prestamo.tipo === 'EXTERNO_INMEDIATO' ? horaHoy : null,
        })
        .eq('id_prestamo', prestamo.id_prestamo)
      if (prestamoError) throw prestamoError

      const estadoEjemplar = estadoLibroDevolucion === 'DAÑADO_GRAVE' ? 'FUERA_DE_SERVICIO' : 'DISPONIBLE'
      const { error: ejemplarError } = await supabase
        .from('ejemplar')
        .update({ estado: estadoEjemplar })
        .eq('id_ejemplar', prestamo.ejemplar?.id_ejemplar || prestamo.id_ejemplar)
      if (ejemplarError) throw ejemplarError

      if (multa.tieneMulta) {
        const { error: multaError } = await supabase.from('multa').upsert({
          id_prestamo: prestamo.id_prestamo,
          dias_retraso: multa.dias,
          cargo_base: multa.cargoBase,
          cargo_por_dia: multa.cargoPorDia,
          cargo_por_daño: multa.cargoDano,
          estado_libro: estadoLibroDevolucion,
          monto_total: multa.total,
          pagada: false,
        }, { onConflict: 'id_prestamo' })
        if (multaError) throw multaError
      }

      setMensaje({ texto: 'Devolucion confirmada correctamente.', error: false })
      setDevolucionPendiente(null)
      await Promise.all([cargarAlertas(), cargarActividad(periodoActividad)])
    } catch (err) {
      console.error(err)
      setMensaje({ texto: 'No se pudo confirmar la devolucion.', error: true })
    }

    setProcesandoId(null)
  }

  function generarReportePago(prestamo) {
    const multa = calcularMulta(prestamo)
    const doc = new jsPDF()
    const fechaHora = new Date().toLocaleString('es-GT')
    let y = 20

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Biblioteca Municipal', 105, y, { align: 'center' }); y += 8
    doc.setFontSize(12)
    doc.text('Reporte de pago por prestamo vencido', 105, y, { align: 'center' }); y += 10
    doc.line(15, y, 195, y); y += 10

    doc.setFontSize(10)
    doc.text('DATOS DEL LECTOR', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${prestamo.lector?.nombre || 'No registrado'}`, 15, y); y += 6
    doc.text(`DPI: ${prestamo.lector?.dpi || 'No registrado'}`, 15, y); y += 6
    doc.text(`Telefono: ${prestamo.lector?.telefono || 'No registrado'}`, 15, y); y += 10

    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL PRESTAMO', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Libro: ${prestamo.ejemplar?.titulo?.titulo || 'No registrado'}`, 15, y); y += 6
    doc.text(`Autor: ${prestamo.ejemplar?.titulo?.autor || 'No registrado'}`, 15, y); y += 6
    doc.text(`Codigo ejemplar: ${prestamo.ejemplar?.codigo_inventario || 'No registrado'}`, 15, y); y += 6
    doc.text(`Fecha limite: ${prestamo.fecha_devolucion_esperada}`, 15, y); y += 6
    doc.text(`Dias de retraso: ${multa.dias}`, 15, y); y += 10

    doc.line(15, y, 195, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('DESGLOSE DE COBRO', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Cargo base por vencimiento: Q${multa.cargoBase.toFixed(2)}`, 15, y); y += 6
    doc.text(`Cargo por dias (${multa.dias} x Q${multa.cargoPorDia.toFixed(2)}): Q${multa.totalDias.toFixed(2)}`, 15, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`TOTAL A PAGAR: Q${multa.total.toFixed(2)}`, 15, y); y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Reporte generado el ${fechaHora}`, 105, y, { align: 'center' })

    doc.save(`reporte-pago-${prestamo.lector?.nombre?.replace(/\s+/g, '-') || 'lector'}-${prestamo.id_prestamo}.pdf`)
  }

  const panelStyle = { border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', padding: '18px' }
  const buttonSecondary = {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: 'white',
    color: '#0f172a',
    padding: '9px 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
  }
  const buttonPrimary = {
    ...buttonSecondary,
    border: 'none',
    background: '#2563eb',
    color: 'white',
  }
  const maxActividad = Math.max(1, actividad?.prestamos || 0, actividad?.devoluciones || 0, actividad?.multas || 0)
  const actividadItems = actividad ? [
    { label: 'Prestamos registrados', valor: actividad.prestamos, color: '#2563eb', icon: BookOpen, ruta: '/prestamos' },
    { label: 'Devoluciones realizadas', valor: actividad.devoluciones, color: '#16a34a', icon: CheckCircle2, ruta: '/devoluciones' },
    { label: 'Multas generadas', valor: actividad.multas, color: '#dc2626', icon: CreditCard, ruta: '/devoluciones', state: { vista: 'multas' } },
  ] : []
  const prestamosAlertas = [...inmediatos, ...porVencer, ...vencidos]
  const prestamosFiltrados = prestamosAlertas.filter(p => {
    if (filtroPrestamos === 'formal') return p.tipo === 'FORMAL'
    if (filtroPrestamos === 'inmediato') return p.tipo === 'EXTERNO_INMEDIATO'
    return true
  })
  const tabsPrestamos = [
    { id: 'todos', label: 'Todos', total: prestamosAlertas.length },
    { id: 'inmediato', label: 'Inmediato', total: inmediatos.length },
    { id: 'formal', label: 'Formal', total: porVencer.length + vencidos.length },
  ]

  function renderPanelPrestamos() {
    return (
      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Prestamos en alerta</h2>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Revisa prestamos inmediatos activos, formales por vencer y formales vencidos desde una sola vista.
            </p>
          </div>
          <span style={{
            borderRadius: '999px',
            padding: '6px 10px',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '13px',
            fontWeight: 800,
          }}>
            {prestamosFiltrados.length}
          </span>
        </div>

        <div style={{
          display: 'inline-flex',
          gap: '4px',
          padding: '4px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          background: '#f8fafc',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}>
          {tabsPrestamos.map(tab => {
            const activo = filtroPrestamos === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFiltroPrestamos(tab.id)}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: activo ? '#2563eb' : 'transparent',
                  color: activo ? 'white' : '#475569',
                  fontSize: '13px',
                  fontWeight: 900,
                }}
              >
                {tab.label} <span style={{ opacity: activo ? 0.95 : 0.7 }}>({tab.total})</span>
              </button>
            )
          })}
        </div>

        {prestamosFiltrados.length === 0 ? (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '22px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
            No hay registros para mostrar.
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '1020px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Lector</th>
                  <th style={{ padding: '12px' }}>Tipo</th>
                  <th style={{ padding: '12px' }}>Libro</th>
                  <th style={{ padding: '12px' }}>Fecha / salida</th>
                  <th style={{ padding: '12px' }}>Estado</th>
                  <th style={{ padding: '12px' }}>Contacto / multa</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prestamosFiltrados.map(p => {
                  const esInmediato = p.tipo === 'EXTERNO_INMEDIATO'
                  const vencido = !esInmediato && (
                    p.estado === 'VENCIDO' ||
                    (p.estado === 'ACTIVO' && diasRetraso(p.fecha_devolucion_esperada) > 0)
                  )
                  const nombreLector = p.lector?.nombre || p.nombre_inmediato || 'Sin lector'
                  const tipoTexto = esInmediato ? 'Inmediato' : 'Formal'
                  const contacto = esInmediato
                    ? `DPI garantia: ${p.dpi_garantia || '-'}`
                    : p.lector?.telefono || '-'

                  return (
                    <tr key={p.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#0f172a' }}>{nombreLector}</strong>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          borderRadius: '999px',
                          padding: '5px 9px',
                          background: esInmediato ? '#dbeafe' : '#ecfdf5',
                          color: esInmediato ? '#1d4ed8' : '#047857',
                          fontSize: '12px',
                          fontWeight: 900,
                        }}>
                          {tipoTexto}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        <strong>{p.ejemplar?.titulo?.titulo}</strong>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{p.ejemplar?.codigo_inventario}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        {esInmediato ? `${p.fecha_salida || '-'} ${p.hora_salida || ''}`.trim() : p.fecha_devolucion_esperada}
                      </td>
                      <td style={{ padding: '12px', color: vencido ? '#dc2626' : esInmediato ? '#1d4ed8' : '#b45309', fontWeight: 800 }}>
                        {esInmediato ? 'Inmediato activo' : vencido ? `Vencido por ${diasRetraso(p.fecha_devolucion_esperada)} dias` : diasRestantes(p.fecha_devolucion_esperada)}
                      </td>
                      <td style={{ padding: '12px', color: vencido ? '#dc2626' : '#475569', fontWeight: vencido ? 800 : 400 }}>
                        {vencido ? multaEstimada(p) : contacto}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => navigate('/lectores', { state: { busqueda: nombreLector } })} style={buttonSecondary}>
                            Ver en lectores
                          </button>
                          {vencido && (
                            <button onClick={() => generarReportePago(p)} style={buttonSecondary}>
                              <FileText size={15} /> PDF pago
                            </button>
                          )}
                          <button
                            onClick={() => abrirConfirmacionDevolucion(p)}
                            disabled={procesandoId === p.id_prestamo}
                            style={{ ...buttonPrimary, opacity: procesandoId === p.id_prestamo ? 0.65 : 1 }}
                          >
                            <CheckCircle2 size={15} /> Confirmar devolucion
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', color: '#2563eb', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Biblioteca Municipal</p>
          <h1 style={{ margin: 0, fontSize: '30px', color: '#0f172a' }}>Panel de alertas</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            {usuario?.nombre} - {rol}
          </p>
        </div>
        <button
          onClick={() => Promise.all([cargarAlertas(), cargarActividad(periodoActividad)])}
          style={buttonSecondary}
        >
          <RotateCcw size={16} /> Actualizar
        </button>
      </div>

      {mensaje.texto && (
        <p style={{
          color: mensaje.error ? '#991b1b' : '#166534',
          background: mensaje.error ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${mensaje.error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          fontWeight: 700,
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {mensaje.texto}
        </p>
      )}

      <section style={{ ...panelStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Actividad reciente</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Haz clic en una grafica para ir a sus registros.</p>
            </div>
          </div>
          <select
            value={periodoActividad}
            onChange={e => { setPeriodoActividad(e.target.value); cargarActividad(e.target.value) }}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', background: 'white' }}
          >
            <option value="dia">Hoy</option>
            <option value="semana">Ultima semana</option>
            <option value="mes">Ultimo mes</option>
          </select>
        </div>

        {cargandoActividad && <p style={{ color: '#64748b' }}>Cargando actividad...</p>}

        {!cargandoActividad && actividad && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {actividadItems.map(item => {
              const Icon = item.icon
              const porcentaje = Math.max(6, Math.round((item.valor / maxActividad) * 100))
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.ruta, item.state ? { state: item.state } : undefined)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ color: '#475569', fontSize: '13px', fontWeight: 800 }}>{item.label}</span>
                    <Icon size={18} color={item.color} />
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, color: item.color }}>{item.valor}</p>
                  <div style={{ height: '9px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${porcentaje}%`, height: '100%', background: item.color, borderRadius: '999px' }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {cargando ? (
        <section style={panelStyle}>
          <p style={{ margin: 0, color: '#64748b' }}>Cargando alertas...</p>
        </section>
      ) : (
        renderPanelPrestamos()
      )}

      {devolucionPendiente && (() => {
        const multa = calcularMulta(devolucionPendiente, estadoLibroDevolucion)
        const procesando = procesandoId === devolucionPendiente.id_prestamo

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{ background: 'white', borderRadius: '8px', padding: '22px', width: '560px', maxWidth: '100%', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Confirmar devolucion</h3>
                  <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    Revisa el estado del libro antes de cerrar el prestamo.
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>{devolucionPendiente.ejemplar?.titulo?.titulo}</p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  {devolucionPendiente.lector?.nombre || devolucionPendiente.nombre_inmediato || 'Sin lector'} · {devolucionPendiente.tipo === 'EXTERNO_INMEDIATO' ? 'Inmediato' : 'Formal'} · Codigo {devolucionPendiente.ejemplar?.codigo_inventario || '-'} · Limite {devolucionPendiente.fecha_devolucion_esperada}
                </p>
              </div>

              <label style={{ display: 'block', color: '#334155', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                Estado del libro al regresar
              </label>
              <select
                value={estadoLibroDevolucion}
                onChange={e => setEstadoLibroDevolucion(e.target.value)}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '11px 12px', fontSize: '14px', background: 'white', marginBottom: '14px' }}
              >
                <option value="BUENO">Bueno</option>
                <option value="DAÑADO_LEVE">Daño leve</option>
                <option value="DAÑADO_GRAVE">Daño grave</option>
              </select>

              <div style={{
                border: `1px solid ${multa.tieneMulta ? '#fecaca' : '#bbf7d0'}`,
                background: multa.tieneMulta ? '#fef2f2' : '#f0fdf4',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
              }}>
                <p style={{ margin: '0 0 10px 0', color: multa.tieneMulta ? '#991b1b' : '#166534', fontWeight: 900 }}>
                  {multa.tieneMulta ? 'Desglose de multa' : 'Sin multa'}
                </p>
                <div style={{ display: 'grid', gap: '6px', color: '#334155', fontSize: '14px' }}>
                  <span>Dias de retraso: <strong>{multa.dias}</strong></span>
                  <span>Cargo base: <strong>Q{multa.cargoBase.toFixed(2)}</strong></span>
                  <span>Cargo por dias: <strong>Q{multa.totalDias.toFixed(2)}</strong></span>
                  <span>Cargo por daño: <strong>Q{multa.cargoDano.toFixed(2)}</strong></span>
                  <span style={{ fontSize: '16px', color: multa.tieneMulta ? '#991b1b' : '#166534', fontWeight: 900 }}>
                    Total: Q{multa.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {estadoLibroDevolucion === 'DAÑADO_GRAVE' && (
                <p style={{ margin: '0 0 16px 0', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 700 }}>
                  El ejemplar quedara marcado como fuera de servicio.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setDevolucionPendiente(null)}
                  disabled={procesando}
                  style={{ ...buttonSecondary, opacity: procesando ? 0.6 : 1 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarDevolucion}
                  disabled={procesando}
                  style={{ ...buttonPrimary, opacity: procesando ? 0.65 : 1 }}
                >
                  <CheckCircle2 size={15} /> {procesando ? 'Confirmando...' : 'Confirmar devolucion'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
