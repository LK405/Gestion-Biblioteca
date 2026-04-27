import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const { usuario, rol, logout } = useAuth()

  return (
    <div style={{ padding: '32px' }}>
      <h1>Panel principal</h1>
      <p>Bienvenido, {usuario?.nombre}</p>
      <p>Rol: {rol}</p>
      <button
        onClick={logout}
        style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}