import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Layout({ children }) {
  const { usuario, rol, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '8px 12px',
    textDecoration: 'none',
    color: isActive ? 'white' : '#cbd5e1',
    background: isActive ? '#1d4ed8' : 'transparent',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '2px',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '220px',
        background: '#1e293b',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Usuario */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #334155' }}>
          <p style={{ color: 'white', fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '14px' }}>
            {usuario?.nombre}
          </p>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>
            {rol}
          </p>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1 }}>
          <NavLink to="/dashboard" style={linkStyle}>
            Panel de alertas
          </NavLink>
          <NavLink to="/catalogo" style={linkStyle}>
            Catálogo
          </NavLink>
          <NavLink to="/prestamos" style={linkStyle}>
            Préstamos
          </NavLink>
          <NavLink to="/devoluciones" style={linkStyle}>
            Devoluciones
          </NavLink>
          <NavLink to="/lectores" style={linkStyle}>
            Lectores
          </NavLink>

          {rol === 'ADMINISTRADOR' && (
            <>
              <NavLink to="/reportes" style={linkStyle}>
                Reportes
              </NavLink>
              <NavLink to="/gestion-catalogo" style={linkStyle}>
                Gestión de catálogo
              </NavLink>
            </>
          )}
        </nav>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            cursor: 'pointer',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            width: '100%',
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}