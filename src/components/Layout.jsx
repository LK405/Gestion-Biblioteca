import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Layout({ children }) {
  const { usuario, rol, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    textDecoration: 'none',
    color: isActive ? '#0f172a' : '#cbd5e1',
    background: isActive ? 'white' : 'transparent',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: isActive ? 800 : 700,
    marginBottom: '4px',
    minHeight: '40px',
    boxShadow: isActive ? '0 10px 24px rgba(15, 23, 42, 0.16)' : 'none',
  })

  const inicial = usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() || 'A'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: '#0f172a',
        padding: '18px 12px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRight: '1px solid #1e293b',
      }}>
        {/* Usuario */}
        <div style={{
          marginBottom: '18px',
          padding: '14px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 52%, #f8fafc 100%)',
          border: '1px solid rgba(191, 219, 254, 0.9)',
          boxShadow: '0 18px 34px rgba(15, 23, 42, 0.22)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#1d4ed8',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px',
              fontWeight: 900,
              flexShrink: 0,
            }}>
              {inicial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#0f172a', fontWeight: 900, margin: '0 0 3px 0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario?.nombre}
              </p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1d4ed8',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(147, 197, 253, 0.8)',
                borderRadius: '999px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'capitalize',
              }}>
                <ShieldCheck size={13} />
                {rol?.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
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
            marginTop: '14px',
            padding: '11px 12px',
            cursor: 'pointer',
            background: '#b91c1c',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 800,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 12px 24px rgba(185, 28, 28, 0.22)',
          }}
        >
          <LogOut size={16} />
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
