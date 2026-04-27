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
    } catch (err) {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Biblioteca Municipal</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            required
            style={{ padding: '8px', fontSize: '14px' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            required
            style={{ padding: '8px', fontSize: '14px' }}
          />
          {error && <p style={{ color: 'red', fontSize: '13px', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            style={{ padding: '10px', fontSize: '14px', cursor: 'pointer' }}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}