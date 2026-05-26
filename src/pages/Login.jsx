import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockKeyhole, UserRound } from 'lucide-react'
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
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 520px 180px at 16% 74%, rgba(68, 86, 244, 0.18), transparent 60%), radial-gradient(ellipse 620px 190px at 84% 62%, rgba(30, 41, 59, 0.12), transparent 58%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '460px',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.96)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 26px 58px rgba(15, 23, 42, 0.28)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          minHeight: '265px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #2f3fd3 0%, #536dfe 58%, #8fb4ff 100%)',
        }}>
          <svg viewBox="0 0 460 265" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="login-mountain-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e2f86" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#6784ff" stopOpacity="0.74" />
              </linearGradient>
              <linearGradient id="login-mountain-b" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4055dc" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#d7e3ff" stopOpacity="0.68" />
              </linearGradient>
            </defs>
            <circle cx="232" cy="116" r="27" fill="rgba(255, 255, 255, 0.72)" />
            <path d="M0 128 L62 176 L128 132 L185 174 L246 119 L292 161 L334 118 L460 150 L460 265 L0 265 Z" fill="url(#login-mountain-b)" />
            <path d="M0 176 L70 162 L134 171 L184 155 L252 178 L325 150 L460 168 L460 265 L0 265 Z" fill="url(#login-mountain-a)" />
            <path d="M0 210 C78 198 126 188 199 199 C274 210 333 185 460 190 L460 265 L0 265 Z" fill="rgba(30, 41, 130, 0.58)" />
            <path d="M47 160 l14 -34 l14 34 h-10 v33 h-8 v-33z M354 144 l13 -32 l13 32 h-9 v38 h-8 v-38z M392 153 l11 -27 l11 27 h-8 v30 h-6 v-30z" fill="rgba(30, 41, 110, 0.72)" />
            <path d="M36 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z M405 83 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z M158 96 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z M300 46 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="rgba(255,255,255,0.62)" />
          </svg>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white', padding: '56px 36px 0', textShadow: '0 2px 12px rgba(15, 23, 42, 0.35)' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '30px', fontWeight: 900 }}>
              Bienvenido
            </h1>
            <p style={{ margin: '0 auto', maxWidth: '300px', fontSize: '13px', lineHeight: 1.45, opacity: 0.96, fontWeight: 700 }}>
              Proyecto Final<br />
              Gestion de Biblioteca<br />
              Curso Analisis de Sistema 1
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '28px 34px 30px' }}>
          <h2 style={{ margin: '0 0 2px', color: 'var(--ink)', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em' }}>
            USER LOGIN
          </h2>

          <label style={fieldWrapStyle}>
            <UserRound size={20} />
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={fieldWrapStyle}>
            <LockKeyhole size={20} />
            <input
              type="password"
              placeholder="Contraseña"
              value={contrasena}
              onChange={e => setContrasena(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '-4px 0 0' }}>{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            style={{
              padding: '10px 26px',
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
              color: 'white',
              fontWeight: 800,
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

const fieldWrapStyle = {
  width: '270px',
  maxWidth: '100%',
  minHeight: '34px',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, var(--brand-primary-strong), var(--brand-primary))',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '0 16px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
}

const inputStyle = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'white',
  fontSize: '15px',
  padding: '9px 0',
}
