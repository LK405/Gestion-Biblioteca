import { useCallback, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'
import { CheckCircle2, CreditCard, FileText, RotateCcw, Search } from 'lucide-react'

const POR_PAGINA = 10

function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function obtenerMulta(prestamo) {
  if (Array.isArray(prestamo?.multa)) return prestamo.multa[0] || null
  return prestamo?.multa || null
}

export default function Devoluciones() {
  const location = useLocation()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [estadoLibro, setEstadoLibro] = useState('BUENO')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)
  const [multaPreview, setMultaPreview] = useState(null)
  const [resumenFinal, setResumenFinal] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [vistaConsulta, setVistaConsulta] = useState(location.state?.vista === 'multas' ? 'multas' : 'devoluciones')

  // Historial
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [paginaHistorial, setPaginaHistorial] = useState(1)
  const [totalHistorial, setTotalHistorial] = useState(0)
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState('TODOS')
  const [multas, setMultas] = useState([])
  const [cargandoMultas, setCargandoMultas] = useState(false)
  const [filtroMultas, setFiltroMultas] = useState('TODAS')
  const [procesandoMultaId, setProcesandoMultaId] = useState(null)

  const cargarHistorial = useCallback(async (pag, tipo = 'TODOS') => {
    setCargandoHistorial(true)
    const desde = (pag - 1) * POR_PAGINA
    const hasta = desde + POR_PAGINA - 1

    let query = supabase
      .from('prestamo')
      .select(`
        id_prestamo, fecha_devolucion_real, tipo, nombre_inmediato, dpi_garantia,
        lector (nombre, dpi, telefono),
        ejemplar (codigo_inventario, estado, titulo (titulo)),
        multa (monto_total, estado_libro)
      `, { count: 'exact' })
      .eq('estado', 'DEVUELTO')
      .not('fecha_devolucion_real', 'is', null)
      .order('fecha_devolucion_real', { ascending: false })
      .range(desde, hasta)

    if (tipo !== 'TODOS') query = query.eq('tipo', tipo)

    const { data, count } = await query
    setHistorial(data || [])
    setTotalHistorial(count || 0)
    setCargandoHistorial(false)
  }, [])

  const cargarMultas = useCallback(async (estado = 'TODAS') => {
    setCargandoMultas(true)

    let query = supabase
      .from('multa')
      .select(`
        id_multa, monto_total, estado_libro, dias_retraso, pagada, generada_en,
        prestamo (
          tipo, nombre_inmediato, dpi_garantia, fecha_salida, fecha_devolucion_real,
          lector (nombre, dpi, telefono),
          ejemplar (codigo_inventario, titulo (titulo))
        )
      `)
      .order('generada_en', { ascending: false })
      .limit(50)

    if (estado === 'PENDIENTES') query = query.eq('pagada', false)
    if (estado === 'PAGADAS') query = query.eq('pagada', true)

    const { data, error } = await query
    if (error) {
      console.error('Error cargando multas:', error)
      setMultas([])
    } else {
      setMultas(data || [])
    }
    setCargandoMultas(false)
  }, [])

  useEffect(() => {
    let activo = true

    async function cargarInicial() {
      await Promise.resolve()
      if (activo) {
        cargarHistorial(1, 'TODOS')
        cargarMultas('TODAS')
      }
    }

    cargarInicial()
    return () => { activo = false }
  }, [cargarHistorial, cargarMultas])

  function handlePaginaHistorial(nueva) {
    setPaginaHistorial(nueva)
    cargarHistorial(nueva, filtroTipoHistorial)
  }

async function buscarPrestamos() {
  const termino = normalizarTexto(busqueda)
  if (!termino) return
  setCargando(true)
  setSeleccionado(null)
  setMultaPreview(null)
  setResumenFinal(null)

  const { data, error } = await supabase
    .from('prestamo')
    .select(`
      id_prestamo, tipo, estado, fecha_salida,
      fecha_devolucion_esperada, hora_salida, nombre_inmediato, dpi_garantia,
      lector (id_lector, nombre, dpi, telefono, direccion, es_menor, nombre_tutor, telefono_tutor),
      ejemplar (id_ejemplar, codigo_inventario, titulo (titulo, autor))
    `)
    .eq('estado', 'ACTIVO')

  if (error) {
    console.error('Error buscando préstamos:', error)
    setPrestamos([])
    setCargando(false)
    return
  }

  const filtrados = (data || []).filter(p => {
    const campos = [
      p.lector?.nombre,
      p.lector?.dpi,
      p.lector?.telefono,
      p.nombre_inmediato,
      p.dpi_garantia,
      p.ejemplar?.titulo?.titulo,
      p.ejemplar?.titulo?.autor,
      p.ejemplar?.codigo_inventario,
    ]
    return campos.some(campo => normalizarTexto(campo).includes(termino))
  })

  setPrestamos(filtrados)
  setCargando(false)
}

  function filtrarPorTipo(lista, tipo) {
    if (tipo === 'FORMAL') return lista.filter(p => p.tipo === 'FORMAL')
    if (tipo === 'EXTERNO_INMEDIATO') return lista.filter(p => p.tipo === 'EXTERNO_INMEDIATO')
    return lista
  }

  function abrirEnLectores(nombre) {
    if (!nombre) return
    navigate('/lectores', { state: { busqueda: nombre } })
  }

  function generarPDFPagoMulta(multa) {
    const doc = new jsPDF()
    const fechaHora = new Date().toLocaleString('es-GT')
    let y = 20

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Biblioteca Municipal', 105, y, { align: 'center' }); y += 8
    doc.setFontSize(12)
    doc.text('Comprobante de pago de multa', 105, y, { align: 'center' }); y += 10
    doc.line(15, y, 195, y); y += 10

    doc.setFontSize(10)
    doc.text('DATOS DEL USUARIO', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${multa.prestamo?.lector?.nombre || multa.prestamo?.nombre_inmediato || 'No registrado'}`, 15, y); y += 6
    doc.text(`DPI: ${multa.prestamo?.lector?.dpi || multa.prestamo?.dpi_garantia || 'No registrado'}`, 15, y); y += 10

    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DE LA MULTA', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Libro: ${multa.prestamo?.ejemplar?.titulo?.titulo || 'No registrado'}`, 15, y); y += 6
    doc.text(`Codigo ejemplar: ${multa.prestamo?.ejemplar?.codigo_inventario || 'No registrado'}`, 15, y); y += 6
    doc.text(`Estado del libro: ${multa.estado_libro || 'No registrado'}`, 15, y); y += 6
    doc.text(`Dias de retraso: ${multa.dias_retraso || 0}`, 15, y); y += 6
    doc.text(`Fecha de pago: ${fechaHora}`, 15, y); y += 10

    doc.line(15, y, 195, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`MONTO PAGADO: Q${Number(multa.monto_total || 0).toFixed(2)}`, 15, y); y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Comprobante generado el ${fechaHora}`, 105, y, { align: 'center' })

    doc.save(`comprobante-pago-multa-${multa.id_multa}.pdf`)
  }

  async function registrarPagoMulta(multa) {
    setProcesandoMultaId(multa.id_multa)
    const { error } = await supabase
      .from('multa')
      .update({ pagada: true })
      .eq('id_multa', multa.id_multa)

    if (error) {
      console.error('Error registrando pago de multa:', error)
      setMensaje({ texto: 'No se pudo registrar el pago de la multa.', error: true })
    } else {
      setMensaje({ texto: 'Pago de multa registrado correctamente.', error: false })
      generarPDFPagoMulta({ ...multa, pagada: true })
      await cargarMultas(filtroMultas)
    }
    setProcesandoMultaId(null)
  }

  async function calcularMulta(prestamo, estadoL) {
    const { data: config } = await supabase
      .from('configuracionmulta')
      .select('*')
      .single()

    if (!config) return

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(prestamo.fecha_devolucion_esperada)
    const dias = prestamo.tipo === 'FORMAL'
      ? Math.max(0, Math.floor((hoy - limite) / (1000 * 60 * 60 * 24)))
      : 0

    const cargoRetraso = dias > 0 ? config.cargo_base_vencimiento : 0
    const cargoDias = dias > 0 ? dias * config.cargo_por_dia : 0
    const cargoDano = estadoL === 'DAÑADO_LEVE'
      ? config.cargo_daño_leve
      : estadoL === 'DAÑADO_GRAVE'
        ? config.cargo_daño_grave
        : 0
    const total = cargoRetraso + cargoDias + cargoDano

    setMultaPreview({
      dias,
      cargoBase: cargoRetraso,
      cargoPorDia: config.cargo_por_dia,
      totalDias: cargoDias,
      cargoDano,
      estadoLibro: estadoL,
      total,
      config,
      tieneMulta: total > 0,
    })
  }

  async function seleccionarPrestamo(prestamo) {
    setSeleccionado(prestamo)
    setEstadoLibro('BUENO')
    setMensaje({ texto: '', error: false })
    setResumenFinal(null)
    await calcularMulta(prestamo, 'BUENO')
  }

  async function handleEstadoLibro(nuevoEstado) {
    setEstadoLibro(nuevoEstado)
    if (seleccionado) await calcularMulta(seleccionado, nuevoEstado)
  }

  function generarPDF(datos) {
    const doc = new jsPDF()
    const ahora = new Date()
    const fechaHora = ahora.toLocaleString('es-GT')

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Biblioteca Municipal', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('Comprobante de Devolución', 105, 28, { align: 'center' })
    doc.setLineWidth(0.5)
    doc.line(15, 33, 195, 33)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let y = 42

    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL LECTOR', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${datos.lector.nombre}`, 15, y); y += 6
    doc.text(`DPI: ${datos.lector.dpi || 'No registrado'}`, 15, y); y += 6
    doc.text(`Teléfono: ${datos.lector.telefono || 'No registrado'}`, 15, y); y += 10

    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL PRÉSTAMO', 15, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Libro: ${datos.libro}`, 15, y); y += 6
    doc.text(`Código ejemplar: ${datos.codigoEjemplar}`, 15, y); y += 6
    doc.text(`Fecha de salida: ${datos.fechaSalida}`, 15, y); y += 6
    doc.text(`Fecha límite: ${datos.fechaLimite}`, 15, y); y += 6
    doc.text(`Fecha de devolución: ${datos.fechaDevolucion}`, 15, y); y += 6
    doc.text(`Días de retraso: ${datos.diasRetraso}`, 15, y); y += 6
    doc.text(`Estado del libro: ${datos.estadoLibro}`, 15, y); y += 10

    doc.line(15, y, 195, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('MULTA', 15, y); y += 7
    doc.setFont('helvetica', 'normal')

    if (datos.multa.tieneMulta) {
      if (datos.multa.cargoBase > 0) {
        doc.text(`Cargo base por vencimiento: Q${datos.multa.cargoBase.toFixed(2)}`, 15, y); y += 6
      }
      if (datos.multa.totalDias > 0) {
        doc.text(`Cargo por ${datos.multa.dias} día(s) × Q${datos.multa.cargoPorDia.toFixed(2)}: Q${datos.multa.totalDias.toFixed(2)}`, 15, y); y += 6
      }
      if (datos.multa.cargoDano > 0) {
        doc.text(`Cargo por daño (${datos.estadoLibro}): Q${datos.multa.cargoDano.toFixed(2)}`, 15, y); y += 6
      }
    } else {
      doc.text('Sin multa', 15, y); y += 6
    }

    y += 2
    doc.line(15, y, 195, y); y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`MONTO TOTAL: Q${datos.multa.total.toFixed(2)}`, 15, y); y += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Comprobante generado el ${fechaHora}`, 105, y, { align: 'center' })

    doc.save(`comprobante-devolucion-${datos.lector.nombre.replace(/\s+/g, '-')}.pdf`)
  }

  async function registrarDevolucion() {
    if (!seleccionado) return
    setGuardando(true)
    setMensaje({ texto: '', error: false })

    try {
      const hoy = new Date()
      const fechaHoy = hoy.toISOString().split('T')[0]
      const horaHoy = hoy.toTimeString().split(' ')[0]

      const { error: prestamoError } = await supabase
        .from('prestamo')
        .update({
          estado: 'DEVUELTO',
          fecha_devolucion_real: fechaHoy,
          hora_regreso: seleccionado.tipo === 'EXTERNO_INMEDIATO' ? horaHoy : null,
        })
        .eq('id_prestamo', seleccionado.id_prestamo)
      if (prestamoError) throw prestamoError

      const estadoEjemplar = estadoLibro === 'DAÑADO_GRAVE' ? 'FUERA_DE_SERVICIO' : 'DISPONIBLE'
      const { error: ejemplarError } = await supabase
        .from('ejemplar')
        .update({ estado: estadoEjemplar })
        .eq('id_ejemplar', seleccionado.ejemplar.id_ejemplar)
      if (ejemplarError) throw ejemplarError

      if (multaPreview?.tieneMulta) {
        const { error: multaError } = await supabase.from('multa').upsert({
          id_prestamo: seleccionado.id_prestamo,
          dias_retraso: multaPreview.dias,
          cargo_base: multaPreview.cargoBase,
          cargo_por_dia: multaPreview.cargoPorDia,
          cargo_por_daño: multaPreview.cargoDano,
          estado_libro: estadoLibro,
          monto_total: multaPreview.total,
          pagada: false,
        }, { onConflict: 'id_prestamo' })
        if (multaError) throw multaError
      }

      const resumen = {
        lector: seleccionado.lector || { nombre: seleccionado.nombre_inmediato, dpi: null, telefono: null },
        libro: seleccionado.ejemplar?.titulo?.titulo,
        codigoEjemplar: seleccionado.ejemplar?.codigo_inventario,
        fechaSalida: seleccionado.fecha_salida,
        fechaLimite: seleccionado.fecha_devolucion_esperada || '—',
        fechaDevolucion: fechaHoy,
        diasRetraso: multaPreview?.dias || 0,
        estadoLibro,
        tipo: seleccionado.tipo,
        multa: multaPreview || { tieneMulta: false, total: 0, cargoBase: 0, totalDias: 0, cargoDano: 0, dias: 0, cargoPorDia: 0 },
      }

      setResumenFinal(resumen)
      setPrestamos(prev => prev.filter(p => p.id_prestamo !== seleccionado.id_prestamo))
      setSeleccionado(null)
      setMultaPreview(null)
      cargarHistorial(1)
      setPaginaHistorial(1)
      cargarMultas(filtroMultas)
    } catch (err) {
      console.error(err)
      setMensaje({ texto: 'Error al registrar la devolución.', error: true })
    }

    setGuardando(false)
  }

  const prestamosFiltrados = filtrarPorTipo(prestamos, filtroTipo)
  const totalPaginasHistorial = Math.ceil(totalHistorial / POR_PAGINA)
  const tipoTabs = [
    { id: 'TODOS', label: 'Todas' },
    { id: 'FORMAL', label: 'Formales' },
    { id: 'EXTERNO_INMEDIATO', label: 'Inmediatas' },
  ]
  const panelStyle = { border: '1px solid var(--border-soft)', borderRadius: '10px', background: 'var(--surface-panel)', padding: '18px', boxShadow: 'var(--shadow-panel)', backdropFilter: 'blur(12px)' }
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    padding: '11px 12px',
    fontSize: '14px',
    background: 'var(--surface-panel)',
    color: 'var(--ink)',
  }
  const buttonSecondary = {
    border: '1px solid var(--border-soft)',
    borderRadius: '8px',
    background: 'var(--surface-panel)',
    color: 'var(--ink)',
    padding: '10px 14px',
    fontSize: '14px',
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
    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
    color: 'white',
  }
  const tabStyle = activo => ({
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    background: activo ? 'var(--brand-primary)' : 'transparent',
    color: activo ? 'white' : '#475569',
    fontSize: '13px',
    fontWeight: 900,
  })

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', background: 'var(--surface-muted)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 6px 0', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Circulacion</p>
          <h1 style={{ margin: 0, fontSize: '30px', color: 'var(--ink)' }}>Devoluciones</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--muted-ink)', fontSize: '14px' }}>
            Busca prestamos, confirma devoluciones y consulta multas generadas.
          </p>
        </div>
        <button
          onClick={() => {
            cargarHistorial(paginaHistorial, filtroTipoHistorial)
            cargarMultas(filtroMultas)
          }}
          style={buttonSecondary}
        >
          <RotateCcw size={16} /> Actualizar
        </button>
      </div>

      {resumenFinal && (
        <section style={{ ...panelStyle, borderColor: '#bbf7d0', background: '#f0fdf4', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#166534', fontSize: '20px' }}>Devolucion registrada</h2>
              <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '13px' }}>
                {resumenFinal.lector?.nombre} devolvio {resumenFinal.libro}.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            {[
              ['Lector', resumenFinal.lector?.nombre || '-'],
              ['Libro', resumenFinal.libro || '-'],
              ['Codigo', resumenFinal.codigoEjemplar || '-'],
              ['Estado libro', resumenFinal.estadoLibro],
              ['Fecha devolucion', resumenFinal.fechaDevolucion],
              ['Multa', `Q${resumenFinal.multa.total.toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', background: 'var(--surface-panel)' }}>
                <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>{label}</p>
                <p style={{ margin: 0, color: 'var(--ink)', fontWeight: 800 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {resumenFinal.multa.tieneMulta && (
              <button onClick={() => generarPDF(resumenFinal)} style={buttonPrimary}>
                <FileText size={15} /> Descargar comprobante PDF
              </button>
            )}
            <button onClick={() => { setResumenFinal(null); setBusqueda(''); setPrestamos([]) }} style={buttonSecondary}>
              Nueva devolucion
            </button>
          </div>
        </section>
      )}

      {!resumenFinal && (
        <section style={{ ...panelStyle, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>Buscar prestamo</h2>
              <p style={{ margin: '6px 0 0 0', color: 'var(--muted-ink)', fontSize: '13px' }}>
                Busca por lector, visitante inmediato, DPI, telefono, titulo, autor o codigo de ejemplar.
              </p>
            </div>
            <span style={{ borderRadius: '999px', padding: '6px 10px', background: 'rgba(219, 234, 254, 0.72)', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 800 }}>
              {prestamosFiltrados.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'var(--surface-muted)', flexWrap: 'wrap' }}>
              {tipoTabs.map(tab => (
                <button key={tab.id} onClick={() => setFiltroTipo(tab.id)} style={tabStyle(filtroTipo === tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Buscar prestamo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarPrestamos()}
                style={inputStyle}
              />
              <button onClick={buscarPrestamos} style={buttonPrimary}>
                <Search size={15} /> Buscar
              </button>
            </div>
          </div>

          {cargando && <p style={{ margin: 0, color: 'var(--muted-ink)' }}>Buscando prestamos...</p>}

          {!cargando && busqueda.trim() && prestamos.length === 0 && (
            <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '18px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>
              No se encontraron prestamos con esa busqueda.
            </div>
          )}

          {!cargando && prestamos.length > 0 && !seleccionado && (
            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '880px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-muted)', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Usuario</th>
                    <th style={{ padding: '12px' }}>Libro</th>
                    <th style={{ padding: '12px' }}>Tipo</th>
                    <th style={{ padding: '12px' }}>Fecha limite</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamosFiltrados.map(p => (
                    <tr key={p.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => abrirEnLectores(p.lector?.nombre || p.nombre_inmediato)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                      >
                        {p.lector?.nombre || p.nombre_inmediato || '-'}
                      </button>
                    </td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        <strong>{p.ejemplar?.titulo?.titulo}</strong>
                        <div style={{ color: 'var(--muted-ink)', fontSize: '12px', marginTop: '2px' }}>{p.ejemplar?.codigo_inventario}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          borderRadius: '999px',
                          padding: '5px 9px',
                          background: p.tipo === 'FORMAL' ? '#ecfdf5' : '#dbeafe',
                          color: p.tipo === 'FORMAL' ? '#047857' : '#1d4ed8',
                          fontSize: '12px',
                          fontWeight: 900,
                        }}>
                          {p.tipo === 'FORMAL' ? 'Formal' : 'Inmediata'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_devolucion_esperada || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => seleccionarPrestamo(p)} style={buttonPrimary}>
                            Seleccionar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!cargando && prestamos.length > 0 && prestamosFiltrados.length === 0 && !seleccionado && (
            <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '18px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)', marginTop: '12px' }}>
              No hay prestamos en esta categoria.
            </div>
          )}

          {seleccionado && (
            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '16px', background: 'var(--surface-muted)', marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '20px' }}>Confirmar devolucion</h3>
                  <p style={{ margin: '5px 0 0 0', color: 'var(--muted-ink)', fontSize: '13px' }}>
                    {seleccionado.ejemplar?.titulo?.titulo} · {seleccionado.ejemplar?.codigo_inventario}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', background: 'var(--surface-panel)' }}>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>Usuario</p>
                  <button
                    onClick={() => abrirEnLectores(seleccionado.lector?.nombre || seleccionado.nombre_inmediato)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                  >
                    {seleccionado.lector?.nombre || seleccionado.nombre_inmediato}
                  </button>
                </div>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', background: 'var(--surface-panel)' }}>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>Salida</p>
                  <p style={{ margin: 0, color: 'var(--ink)', fontWeight: 800 }}>{seleccionado.fecha_salida}</p>
                </div>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', background: 'var(--surface-panel)' }}>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--muted-ink)', fontSize: '12px', fontWeight: 800 }}>Limite</p>
                  <p style={{ margin: 0, color: 'var(--ink)', fontWeight: 800 }}>{seleccionado.fecha_devolucion_esperada || '-'}</p>
                </div>
              </div>

              <label style={{ display: 'block', color: '#334155', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                Estado del libro al devolver
              </label>
              <select value={estadoLibro} onChange={e => handleEstadoLibro(e.target.value)} style={{ ...inputStyle, maxWidth: '260px', marginBottom: '14px' }}>
                <option value="BUENO">Bueno</option>
                <option value="DAÑADO_LEVE">Dañado leve</option>
                <option value="DAÑADO_GRAVE">Dañado grave</option>
              </select>

              {multaPreview && (
                <div style={{
                  border: `1px solid ${multaPreview.tieneMulta ? '#fecaca' : '#bbf7d0'}`,
                  background: multaPreview.tieneMulta ? '#fef2f2' : '#f0fdf4',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '14px',
                }}>
                  <p style={{ margin: '0 0 10px 0', color: multaPreview.tieneMulta ? '#991b1b' : '#166534', fontWeight: 900 }}>
                    {multaPreview.tieneMulta ? 'Desglose de multa' : 'Sin multa'}
                  </p>
                  <div style={{ display: 'grid', gap: '6px', color: '#334155', fontSize: '14px' }}>
                    <span>Dias de retraso: <strong>{multaPreview.dias}</strong></span>
                    <span>Cargo base: <strong>Q{multaPreview.cargoBase.toFixed(2)}</strong></span>
                    <span>Cargo por dias: <strong>Q{multaPreview.totalDias.toFixed(2)}</strong></span>
                    <span>Cargo por dano: <strong>Q{multaPreview.cargoDano.toFixed(2)}</strong></span>
                    <span style={{ fontSize: '16px', color: multaPreview.tieneMulta ? '#991b1b' : '#166534', fontWeight: 900 }}>
                      Total: Q{multaPreview.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {mensaje.texto && (
                <p style={{
                  color: mensaje.error ? '#991b1b' : '#166534',
                  background: mensaje.error ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${mensaje.error ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontWeight: 700,
                  fontSize: '13px',
                }}>
                  {mensaje.texto}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={registrarDevolucion} disabled={guardando} style={{ ...buttonPrimary, opacity: guardando ? 0.65 : 1 }}>
                  <CheckCircle2 size={15} /> {guardando ? 'Guardando...' : 'Confirmar devolucion'}
                </button>
                <button onClick={() => { setSeleccionado(null); setMultaPreview(null) }} style={buttonSecondary}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)' }}>
              {vistaConsulta === 'multas' ? 'Multas generadas' : 'Historial de devoluciones'}
            </h2>
            <p style={{ margin: '6px 0 0 0', color: 'var(--muted-ink)', fontSize: '13px' }}>
              {vistaConsulta === 'multas'
                ? 'Consulta las multas registradas por retraso o dano.'
                : 'Consulta devoluciones registradas por categoria.'}
            </p>
          </div>
          <span style={{ borderRadius: '999px', padding: '6px 10px', background: 'rgba(219, 234, 254, 0.72)', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 800 }}>
            {vistaConsulta === 'multas' ? multas.length : totalHistorial}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'var(--surface-muted)', flexWrap: 'wrap' }}>
            {[
              { id: 'devoluciones', label: 'Devoluciones' },
              { id: 'multas', label: 'Multas' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setVistaConsulta(tab.id)} style={tabStyle(vistaConsulta === tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {vistaConsulta === 'devoluciones' && (
          <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'var(--surface-muted)', flexWrap: 'wrap' }}>
            {tipoTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setFiltroTipoHistorial(tab.id)
                setPaginaHistorial(1)
                cargarHistorial(1, tab.id)
              }}
              style={tabStyle(filtroTipoHistorial === tab.id)}
            >
              {tab.label}
            </button>
            ))}
          </div>
          )}

          {vistaConsulta === 'multas' && (
          <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid var(--border-soft)', borderRadius: '8px', background: 'var(--surface-muted)', flexWrap: 'wrap' }}>
            {[
              { id: 'TODAS', label: 'Todas' },
              { id: 'PENDIENTES', label: 'Pendientes' },
              { id: 'PAGADAS', label: 'Pagadas' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setFiltroMultas(tab.id)
                  cargarMultas(tab.id)
                }}
                style={tabStyle(filtroMultas === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          )}
        </div>

        {vistaConsulta === 'devoluciones' && cargandoHistorial && <p style={{ margin: 0, color: 'var(--muted-ink)' }}>Cargando historial...</p>}

        {vistaConsulta === 'devoluciones' && !cargandoHistorial && historial.length === 0 && (
          <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '22px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>
            Sin devoluciones registradas.
          </div>
        )}

        {vistaConsulta === 'devoluciones' && !cargandoHistorial && historial.length > 0 && (
          <>
            <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '860px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-muted)', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Usuario</th>
                    <th style={{ padding: '12px' }}>Libro</th>
                    <th style={{ padding: '12px' }}>Tipo</th>
                    <th style={{ padding: '12px' }}>Fecha devolucion</th>
                    <th style={{ padding: '12px' }}>Estado libro</th>
                    <th style={{ padding: '12px' }}>Multa</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(p => {
                    const multa = obtenerMulta(p)
                    const estadoMostrado = multa?.estado_libro || (p.ejemplar?.estado === 'FUERA_DE_SERVICIO' ? 'FUERA_DE_SERVICIO' : 'BUENO')
                    return (
                      <tr key={p.id_prestamo} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => abrirEnLectores(p.lector?.nombre || p.nombre_inmediato)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                          >
                            {p.lector?.nombre || p.nombre_inmediato || '-'}
                          </button>
                        </td>
                        <td style={{ padding: '12px', color: '#334155' }}>{p.ejemplar?.titulo?.titulo}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{p.tipo === 'FORMAL' ? 'Formal' : 'Inmediata'}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{p.fecha_devolucion_real}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{estadoMostrado}</td>
                        <td style={{ padding: '12px', color: multa?.monto_total > 0 ? '#dc2626' : '#16a34a', fontWeight: 900 }}>
                          Q{multa?.monto_total ? Number(multa.monto_total).toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPaginasHistorial > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => handlePaginaHistorial(paginaHistorial - 1)} disabled={paginaHistorial === 1} style={{ ...buttonSecondary, opacity: paginaHistorial === 1 ? 0.55 : 1 }}>
                  Anterior
                </button>
                <span style={{ fontSize: '14px', color: '#475569' }}>Pagina {paginaHistorial} de {totalPaginasHistorial}</span>
                <button onClick={() => handlePaginaHistorial(paginaHistorial + 1)} disabled={paginaHistorial === totalPaginasHistorial} style={{ ...buttonSecondary, opacity: paginaHistorial === totalPaginasHistorial ? 0.55 : 1 }}>
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {vistaConsulta === 'multas' && cargandoMultas && <p style={{ margin: 0, color: 'var(--muted-ink)' }}>Cargando multas...</p>}

        {vistaConsulta === 'multas' && !cargandoMultas && multas.length === 0 && (
          <div style={{ border: '1px dashed var(--border-soft)', borderRadius: '8px', padding: '22px', textAlign: 'center', color: 'var(--muted-ink)', background: 'var(--surface-muted)' }}>
            Sin multas registradas.
          </div>
        )}

        {vistaConsulta === 'multas' && !cargandoMultas && multas.length > 0 && (
          <div style={{ border: '1px solid var(--border-soft)', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-muted)', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Usuario</th>
                  <th style={{ padding: '12px' }}>Libro</th>
                  <th style={{ padding: '12px' }}>Tipo</th>
                  <th style={{ padding: '12px' }}>Estado libro</th>
                  <th style={{ padding: '12px' }}>Retraso</th>
                  <th style={{ padding: '12px' }}>Monto</th>
                  <th style={{ padding: '12px' }}>Estado pago</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {multas.map(multa => (
                  <tr key={multa.id_multa} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => abrirEnLectores(multa.prestamo?.lector?.nombre || multa.prestamo?.nombre_inmediato)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontWeight: 900, cursor: 'pointer', padding: 0 }}
                      >
                        {multa.prestamo?.lector?.nombre || multa.prestamo?.nombre_inmediato || '-'}
                      </button>
                    </td>
                    <td style={{ padding: '12px', color: '#334155' }}>
                      {multa.prestamo?.ejemplar?.titulo?.titulo || '-'}
                      <div style={{ color: 'var(--muted-ink)', fontSize: '12px', marginTop: '2px' }}>{multa.prestamo?.ejemplar?.codigo_inventario || '-'}</div>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{multa.prestamo?.tipo === 'FORMAL' ? 'Formal' : 'Inmediata'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{multa.estado_libro || '-'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{multa.dias_retraso || 0} dias</td>
                    <td style={{ padding: '12px', color: '#dc2626', fontWeight: 900 }}>Q{Number(multa.monto_total || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        borderRadius: '999px',
                        padding: '5px 9px',
                        background: multa.pagada ? '#dcfce7' : '#fef3c7',
                        color: multa.pagada ? '#166534' : '#92400e',
                        fontSize: '12px',
                        fontWeight: 900,
                      }}>
                        {multa.pagada ? 'Pagada' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => generarPDFPagoMulta(multa)} style={buttonSecondary}>
                          <FileText size={15} /> PDF
                        </button>
                        {!multa.pagada && (
                          <button
                            onClick={() => registrarPagoMulta(multa)}
                            disabled={procesandoMultaId === multa.id_multa}
                            style={{ ...buttonPrimary, opacity: procesandoMultaId === multa.id_multa ? 0.65 : 1 }}
                          >
                            <CreditCard size={15} /> {procesandoMultaId === multa.id_multa ? 'Registrando...' : 'Registrar pago'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
