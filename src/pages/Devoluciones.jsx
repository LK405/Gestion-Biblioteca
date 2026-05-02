import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'

const POR_PAGINA = 10

export default function Devoluciones() {
  const [busqueda, setBusqueda] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [estadoLibro, setEstadoLibro] = useState('BUENO')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)
  const [multaPreview, setMultaPreview] = useState(null)
  const [resumenFinal, setResumenFinal] = useState(null)

  // Historial
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [paginaHistorial, setPaginaHistorial] = useState(1)
  const [totalHistorial, setTotalHistorial] = useState(0)

  useEffect(() => {
    cargarHistorial(1)
  }, [])

  async function cargarHistorial(pag) {
    setCargandoHistorial(true)
    const desde = (pag - 1) * POR_PAGINA
    const hasta = desde + POR_PAGINA - 1

    const { data, count } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, fecha_devolucion_real, tipo,
        lector (nombre),
        ejemplar (codigo_inventario, titulo (titulo)),
        multa (monto_total, estado_libro)
      `, { count: 'exact' })
      .eq('estado', 'DEVUELTO')
      .not('fecha_devolucion_real', 'is', null)
      .order('fecha_devolucion_real', { ascending: false })
      .range(desde, hasta)

    setHistorial(data || [])
    setTotalHistorial(count || 0)
    setCargandoHistorial(false)
  }

  function handlePaginaHistorial(nueva) {
    setPaginaHistorial(nueva)
    cargarHistorial(nueva)
  }

  async function buscarPrestamos() {
  if (!busqueda.trim()) return
  setCargando(true)
  setSeleccionado(null)
  setMultaPreview(null)
  setResumenFinal(null)

  // Buscar por nombre_inmediato
  const { data: inmediatos } = await supabase
    .from('prestamo')
    .select(`
      id_prestamo, tipo, estado, fecha_salida,
      fecha_devolucion_esperada, hora_salida, nombre_inmediato,
      lector (id_lector, nombre, dpi, telefono),
      ejemplar (id_ejemplar, codigo_inventario, titulo (titulo))
    `)
    .eq('estado', 'ACTIVO')
    .ilike('nombre_inmediato', `%${busqueda}%`)

  // Buscar lectores por nombre y luego sus préstamos
  const { data: lectoresEncontrados } = await supabase
    .from('lector')
    .select('id_lector')
    .ilike('nombre', `%${busqueda}%`)

  let formales = []
  if (lectoresEncontrados && lectoresEncontrados.length > 0) {
    const ids = lectoresEncontrados.map(l => l.id_lector)
    const { data } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida,
        fecha_devolucion_esperada, hora_salida, nombre_inmediato,
        lector (id_lector, nombre, dpi, telefono),
        ejemplar (id_ejemplar, codigo_inventario, titulo (titulo))
      `)
      .eq('estado', 'ACTIVO')
      .in('id_lector', ids)
    formales = data || []
  }

  // Combinar y deduplicar
  const todos = [...(inmediatos || []), ...formales]
  const unicos = todos.filter((p, i, arr) => arr.findIndex(x => x.id_prestamo === p.id_prestamo) === i)
  setPrestamos(unicos)
  setCargando(false)
}

  async function calcularMulta(prestamo, estadoL) {
    if (prestamo.tipo !== 'FORMAL') {
      setMultaPreview(null)
      return
    }

    const { data: config } = await supabase
      .from('configuracionmulta')
      .select('*')
      .single()

    if (!config) return

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(prestamo.fecha_devolucion_esperada)
    const dias = Math.max(0, Math.floor((hoy - limite) / (1000 * 60 * 60 * 24)))

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

      await supabase
        .from('prestamo')
        .update({
          estado: 'DEVUELTO',
          fecha_devolucion_real: fechaHoy,
          hora_regreso: seleccionado.tipo === 'EXTERNO_INMEDIATO' ? horaHoy : null,
        })
        .eq('id_prestamo', seleccionado.id_prestamo)

      await supabase
        .from('ejemplar')
        .update({ estado: estadoLibro === 'BUENO' ? 'DISPONIBLE' : 'FUERA_DE_SERVICIO' })
        .eq('id_ejemplar', seleccionado.ejemplar.id_ejemplar)

      if (multaPreview?.tieneMulta) {
        await supabase.from('multa').insert({
          id_prestamo: seleccionado.id_prestamo,
          dias_retraso: multaPreview.dias,
          cargo_base: multaPreview.cargoBase,
          cargo_por_dia: multaPreview.cargoPorDia,
          cargo_por_daño: multaPreview.cargoDano,
          estado_libro: estadoLibro,
          monto_total: multaPreview.total,
          pagada: false,
        })
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
    } catch (err) {
      console.error(err)
      setMensaje({ texto: 'Error al registrar la devolución.', error: true })
    }

    setGuardando(false)
  }

  const totalPaginasHistorial = Math.ceil(totalHistorial / POR_PAGINA)

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1>Registro de devoluciones</h1>

      {resumenFinal ? (
        <div style={{ border: '1px solid #86efac', borderRadius: '6px', padding: '24px', background: '#f0fdf4', marginBottom: '32px' }}>
          <h2 style={{ color: '#16a34a', margin: '0 0 16px 0' }}>✓ Devolución registrada</h2>

          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Lector</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>{resumenFinal.lector?.nombre}</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>DPI: {resumenFinal.lector?.dpi || '—'}</p>
          <p style={{ margin: '2px 0 12px 0', fontSize: '14px' }}>Tel: {resumenFinal.lector?.telefono || '—'}</p>

          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Libro devuelto</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>{resumenFinal.libro}</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>Código: {resumenFinal.codigoEjemplar}</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>Salida: {resumenFinal.fechaSalida}</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>Límite: {resumenFinal.fechaLimite}</p>
          <p style={{ margin: '2px 0 12px 0', fontSize: '14px' }}>Devuelto: {resumenFinal.fechaDevolucion}</p>

          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Estado del libro</p>
          <p style={{ margin: '2px 0 12px 0', fontSize: '14px' }}>{resumenFinal.estadoLibro}</p>

          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Multa</p>
          {resumenFinal.multa.tieneMulta ? (
            <div style={{ fontSize: '14px' }}>
              {resumenFinal.multa.cargoBase > 0 &&
                <p style={{ margin: '2px 0' }}>Cargo base: Q{resumenFinal.multa.cargoBase.toFixed(2)}</p>}
              {resumenFinal.multa.totalDias > 0 &&
                <p style={{ margin: '2px 0' }}>
                  {resumenFinal.multa.dias} día(s) × Q{resumenFinal.multa.cargoPorDia.toFixed(2)} = Q{resumenFinal.multa.totalDias.toFixed(2)}
                </p>}
              {resumenFinal.multa.cargoDano > 0 &&
                <p style={{ margin: '2px 0' }}>Daño ({resumenFinal.estadoLibro}): Q{resumenFinal.multa.cargoDano.toFixed(2)}</p>}
              <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', fontSize: '15px' }}>
                Total: Q{resumenFinal.multa.total.toFixed(2)}
              </p>
            </div>
          ) : (
            <p style={{ margin: '2px 0', fontSize: '14px' }}>Sin multa — Q0.00</p>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {resumenFinal.tipo === 'FORMAL' && (
              <button
                onClick={() => generarPDF(resumenFinal)}
                style={{ padding: '10px 20px', cursor: 'pointer', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Descargar comprobante PDF
              </button>
            )}
            <button
              onClick={() => { setResumenFinal(null); setBusqueda(''); setPrestamos([]) }}
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              Nueva devolución
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Buscar por nombre del lector..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarPrestamos()}
              style={{ padding: '8px', fontSize: '14px', flex: 1 }}
            />
            <button onClick={buscarPrestamos} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Buscar
            </button>
          </div>

          {cargando && <p>Buscando...</p>}

          {prestamos.length > 0 && !seleccionado && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Lector</th>
                  <th style={{ padding: '8px' }}>Libro</th>
                  <th style={{ padding: '8px' }}>Tipo</th>
                  <th style={{ padding: '8px' }}>Fecha límite</th>
                  <th style={{ padding: '8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map(p => (
                  <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{p.lector?.nombre || p.nombre_inmediato}</td>
                    <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                    <td style={{ padding: '8px' }}>{p.tipo}</td>
                    <td style={{ padding: '8px' }}>{p.fecha_devolucion_esperada || '—'}</td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => seleccionarPrestamo(p)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {seleccionado && (
            <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '20px', marginBottom: '24px' }}>
              <h3>Confirmar devolución</h3>
              <p><strong>Lector:</strong> {seleccionado.lector?.nombre || seleccionado.nombre_inmediato}</p>
              <p><strong>Libro:</strong> {seleccionado.ejemplar?.titulo?.titulo}</p>
              <p><strong>Código:</strong> {seleccionado.ejemplar?.codigo_inventario}</p>
              <p><strong>Fecha salida:</strong> {seleccionado.fecha_salida}</p>
              {seleccionado.fecha_devolucion_esperada &&
                <p><strong>Fecha límite:</strong> {seleccionado.fecha_devolucion_esperada}</p>}

              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Estado del libro al devolver
                </label>
                <select
                  value={estadoLibro}
                  onChange={e => handleEstadoLibro(e.target.value)}
                  style={{ padding: '8px', fontSize: '14px' }}
                >
                  <option value="BUENO">Bueno</option>
                  <option value="DAÑADO_LEVE">Dañado leve</option>
                  <option value="DAÑADO_GRAVE">Dañado grave</option>
                </select>
              </div>

              {multaPreview && seleccionado.tipo === 'FORMAL' && (
                <div style={{
                  border: `1px solid ${multaPreview.tieneMulta ? '#fca5a5' : '#86efac'}`,
                  background: multaPreview.tieneMulta ? '#fef2f2' : '#f0fdf4',
                  borderRadius: '4px', padding: '14px', marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px', color: multaPreview.tieneMulta ? '#dc2626' : '#16a34a' }}>
                    {multaPreview.tieneMulta ? '⚠ Desglose de multa' : '✓ Sin multa'}
                  </p>
                  {multaPreview.tieneMulta && (
                    <div style={{ fontSize: '13px' }}>
                      {multaPreview.cargoBase > 0 && (
                        <p style={{ margin: '3px 0' }}>
                          Cargo base por vencimiento: <strong>Q{multaPreview.cargoBase.toFixed(2)}</strong>
                        </p>
                      )}
                      {multaPreview.dias > 0 && (
                        <p style={{ margin: '3px 0' }}>
                          {multaPreview.dias} día(s) × Q{multaPreview.cargoPorDia.toFixed(2)} por día: <strong>Q{multaPreview.totalDias.toFixed(2)}</strong>
                        </p>
                      )}
                      {multaPreview.cargoDano > 0 && (
                        <p style={{ margin: '3px 0' }}>
                          Cargo por daño ({estadoLibro}): <strong>Q{multaPreview.cargoDano.toFixed(2)}</strong>
                        </p>
                      )}
                      <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #fca5a5', paddingTop: '6px' }}>
                        Total: Q{multaPreview.total.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {mensaje.texto && (
                <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginBottom: '12px' }}>
                  {mensaje.texto}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={registrarDevolucion}
                  disabled={guardando}
                  style={{ padding: '10px 24px', cursor: 'pointer' }}
                >
                  {guardando ? 'Guardando...' : 'Confirmar devolución'}
                </button>
                <button
                  onClick={() => { setSeleccionado(null); setMultaPreview(null) }}
                  style={{ padding: '10px 16px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Historial de devoluciones */}
      <div style={{ marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Historial de devoluciones</h2>

        {cargandoHistorial && <p>Cargando historial...</p>}

        {!cargandoHistorial && historial.length === 0 && (
          <p style={{ color: '#666' }}>Sin devoluciones registradas.</p>
        )}

        {!cargandoHistorial && historial.length > 0 && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
              {totalHistorial} devoluciones registradas
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Lector</th>
                  <th style={{ padding: '8px' }}>Libro</th>
                  <th style={{ padding: '8px' }}>Fecha devolución</th>
                  <th style={{ padding: '8px' }}>Estado libro</th>
                  <th style={{ padding: '8px' }}>Multa</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(p => (
                  <tr key={p.id_prestamo} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{p.lector?.nombre || '—'}</td>
                    <td style={{ padding: '8px' }}>{p.ejemplar?.titulo?.titulo}</td>
                    <td style={{ padding: '8px' }}>{p.fecha_devolucion_real}</td>
                    <td style={{ padding: '8px' }}>{p.multa?.[0]?.estado_libro || 'BUENO'}</td>
                    <td style={{ padding: '8px', color: p.multa?.[0]?.monto_total > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                      Q{p.multa?.[0]?.monto_total ? Number(p.multa[0].monto_total).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPaginasHistorial > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                <button
                  onClick={() => handlePaginaHistorial(paginaHistorial - 1)}
                  disabled={paginaHistorial === 1}
                  style={{ padding: '6px 14px', cursor: paginaHistorial === 1 ? 'default' : 'pointer' }}
                >
                  ← Anterior
                </button>
                <span style={{ fontSize: '14px' }}>
                  Página {paginaHistorial} de {totalPaginasHistorial}
                </span>
                <button
                  onClick={() => handlePaginaHistorial(paginaHistorial + 1)}
                  disabled={paginaHistorial === totalPaginasHistorial}
                  style={{ padding: '6px 14px', cursor: paginaHistorial === totalPaginasHistorial ? 'default' : 'pointer' }}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}