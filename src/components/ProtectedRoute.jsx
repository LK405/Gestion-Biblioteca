import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children, soloAdmin = false }) {
  const { usuario, rol, loading } = useAuth()

  if (loading) return <div>Cargando...</div>

  if (!usuario) return <Navigate to="/login" replace />

  if (soloAdmin && rol !== 'ADMINISTRADOR') return <Navigate to="/dashboard" replace />

  return children
}