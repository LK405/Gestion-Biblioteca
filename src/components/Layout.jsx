import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  LibraryBig,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const baseLinks = [
  { to: '/dashboard', label: 'Panel de alertas', icon: Bell },
  { to: '/catalogo', label: 'Catálogo', icon: BookOpen },
  { to: '/prestamos', label: 'Préstamos', icon: ClipboardList },
  { to: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
  { to: '/lectores', label: 'Lectores', icon: Users },
]

const adminLinks = [
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/gestion-catalogo', label: 'Gestión de catálogo', icon: LibraryBig },
]

export default function Layout({ children }) {
  const { usuario, rol, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const links = rol === 'ADMINISTRADOR' ? [...baseLinks, ...adminLinks] : baseLinks

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    textDecoration: 'none',
    color: isActive ? 'var(--brand-primary)' : '#1f2937',
    background: isActive ? 'rgba(68, 86, 244, 0.08)' : 'transparent',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: isActive ? 800 : 700,
    marginBottom: '7px',
    minHeight: '44px',
    boxShadow: 'none',
  })

  const inicial = usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() || 'A'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--app-background)' }}>
      {/* Sidebar */}
      <div style={{
        width: '236px',
        height: 'calc(100vh - 16px)',
        position: 'sticky',
        top: '8px',
        margin: '8px 0 8px 32px',
        background: 'rgba(255, 255, 255, 0.96)',
        padding: '28px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '0 82px 82px 0',
        boxShadow: '0 22px 46px rgba(31, 41, 55, 0.13)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Usuario */}
        <div style={{
          marginBottom: '28px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4b5cf6, #536dfe)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: '22px',
            fontWeight: 900,
            margin: '0 auto 12px',
            boxShadow: '0 16px 26px rgba(75, 92, 246, 0.32)',
          }}>
            {inicial}
          </div>
          <p style={{ color: '#1f2937', fontWeight: 900, margin: '0 0 8px 0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario?.nombre || 'Biblioteca'}
          </p>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: 'var(--brand-primary)',
            background: 'rgba(68, 86, 244, 0.08)',
            borderRadius: '999px',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'capitalize',
          }}>
            <ShieldCheck size={13} />
            {rol?.toLowerCase()}
          </span>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
          {links.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} style={linkStyle}>
                {({ isActive }) => (
                  <>
                    <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? 'var(--brand-primary)' : '#111827'} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: '14px',
            padding: '9px 10px',
            cursor: 'pointer',
            background: 'rgba(248, 250, 252, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.18)',
            color: '#dc2626',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 800,
            width: 'calc(100% - 14px)',
            marginLeft: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: '0 12px 24px rgba(31, 41, 55, 0.08)',
          }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
        {children}
      </div>
    </div>
  )
}
