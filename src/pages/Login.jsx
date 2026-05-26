import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(correo, contrasena)
      navigate('/dashboard')
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'var(--app-background)',
    }}>
      <div style={{
        width: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--surface-panel)',
        border: '1px solid var(--border-soft)',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: 'var(--shadow-panel)',
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{
            display: 'inline-flex',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(219, 234, 254, 0.82)',
            color: 'var(--brand-primary)',
            fontSize: '12px',
            fontWeight: 900,
            marginBottom: '10px',
          }}>
            Sistema bibliotecario
          </span>
          <h1 style={{ textAlign: 'center', margin: '0 0 6px', color: 'var(--ink)', fontSize: '30px' }}>
            Biblioteca Municipal
          </h1>
          <p style={{ margin: 0, color: 'var(--muted-ink)', fontSize: '14px' }}>
            Acceso administrativo
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            required
            style={{ padding: '11px 12px', fontSize: '14px', border: '1px solid var(--border-soft)', borderRadius: '10px', background: 'rgba(255,255,255,0.82)', color: 'var(--ink)' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            required
            style={{ padding: '11px 12px', fontSize: '14px', border: '1px solid var(--border-soft)', borderRadius: '10px', background: 'rgba(255,255,255,0.82)', color: 'var(--ink)' }}
          />
          {error && <p style={{ color: 'red', fontSize: '13px', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            style={{
              padding: '12px',
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
              color: 'white',
              fontWeight: 900,
              boxShadow: 'var(--shadow-soft)',
              opacity: cargando ? 0.68 : 1,
            }}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
