import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function Devoluciones() {
  const { usuario } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [estadoLibro, setEstadoLibro] = useState('BUENO')
  const [mensaje, setMensaje] = useState({ texto: '', error: false })
  const [guardando, setGuardando] = useState(false)
  const [multaPreview, setMultaPreview] = useState(null)

  async function buscarPrestamos() {
    if (!busqueda.trim()) return
    setCargando(true)
    const { data } = await supabase
      .from('prestamo')
      .select(`
        id_prestamo, tipo, estado, fecha_salida, fecha_devolucion_esperada, hora_salida, nombre_inmediato,
        lector (id_lector, nombre, telefono),
        ejemplar (id_ejemplar, codigo_inventario, titulo (titulo))
      `)
      .eq('estado', 'ACTIVO')
      .or(`nombre_inmediato.ilike.%${busqueda}%,lector.nombre.ilike.%${busqueda}%`)
      .limit(20)

    setPrestamos(data || [])
    setCargando(false)
    setSeleccionado(null)
    setMultaPreview(null)
  }

  async function seleccionarPrestamo(prestamo) {
    setSeleccionado(prestamo)
    setEstadoLibro('BUENO')
    setMensaje({ texto: '', error: false })

    if (prestamo.tipo === 'FORMAL') {
      const { data: config } = await supabase
        .from('configuracionmulta')
        .select('*')
        .single()

      if (config) {
        const hoy = new Date()
        const limite = new Date(prestamo.fecha_devolucion_esperada)
        const dias = Math.floor((hoy - limite) / (1000 * 60 * 60 * 24))

        if (dias > 0) {
          const montoRetraso = config.cargo_base_vencimiento + (dias * config.cargo_por_dia)
          setMultaPreview({ dias, montoRetraso, config, tieneRetraso: true })
        } else {
          setMultaPreview({ tieneRetraso: false })
        }
      }
    } else {
      setMultaPreview(null)
    }
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

      if (multaPreview?.tieneRetraso || estadoLibro !== 'BUENO') {
        const { data: config } = await supabase
          .from('configuracionmulta')
          .select('*')
          .single()

        if (config) {
          const hoyFecha = new Date()
          const limite = seleccionado.fecha_devolucion_esperada
            ? new Date(seleccionado.fecha_devolucion_esperada)
            : null
          const dias = limite ? Math.max(0, Math.floor((hoyFecha - limite) / (1000 * 60 * 60 * 24))) : 0

          const cargoDano = estadoLibro === 'DAÑADO_LEVE'
            ? config.cargo_daño_leve
            : estadoLibro === 'DAÑADO_GRAVE'
              ? config.cargo_daño_grave
              : 0

          const montoTotal =
            (dias > 0 ? config.cargo_base_vencimiento + (dias * config.cargo_por_dia) : 0) + cargoDano

          if (montoTotal > 0) {
            await supabase.from('multa').insert({
              id_prestamo: seleccionado.id_prestamo,
              dias_retraso: dias,
              cargo_base: dias > 0 ? config.cargo_base_vencimiento : 0,
              cargo_por_dia: config.cargo_por_dia,
              cargo_por_daño: cargoDano,
              estado_libro: estadoLibro,
              monto_total: montoTotal,
              pagada: false,
            })
          }
        }
      }

      setMensaje({ texto: 'Devolución registrada correctamente.', error: false })
      setPrestamos(prev => prev.filter(p => p.id_prestamo !== seleccionado.id_prestamo))
      setSeleccionado(null)
      setMultaPreview(null)
    } catch (err) {
      console.error(err)
      setMensaje({ texto: 'Error al registrar la devolución.', error: true })
    }

    setGuardando(false)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1>Registro de devoluciones</h1>

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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
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
        <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '20px' }}>
          <h3>Confirmar devolución</h3>
          <p><strong>Lector:</strong> {seleccionado.lector?.nombre || seleccionado.nombre_inmediato}</p>
          <p><strong>Libro:</strong> {seleccionado.ejemplar?.titulo?.titulo}</p>
          <p><strong>Código:</strong> {seleccionado.ejemplar?.codigo_inventario}</p>
          {seleccionado.fecha_devolucion_esperada &&
            <p><strong>Fecha límite:</strong> {seleccionado.fecha_devolucion_esperada}</p>
          }

          {multaPreview?.tieneRetraso && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '12px', margin: '12px 0' }}>
              <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold' }}>
                ⚠ Préstamo vencido — {multaPreview.dias} días de retraso
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#dc2626', fontSize: '13px' }}>
                Multa por retraso: Q{multaPreview.montoRetraso.toFixed(2)}
              </p>
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Estado del libro al devolver
            </label>
            <select
              value={estadoLibro}
              onChange={e => setEstadoLibro(e.target.value)}
              style={{ padding: '8px', fontSize: '14px' }}
            >
              <option value="BUENO">Bueno</option>
              <option value="DAÑADO_LEVE">Dañado leve</option>
              <option value="DAÑADO_GRAVE">Dañado grave</option>
            </select>
          </div>

          {mensaje.texto && (
            <p style={{ color: mensaje.error ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginTop: '12px' }}>
              {mensaje.texto}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
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
    </div>
  )
}