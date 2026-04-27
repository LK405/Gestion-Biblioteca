import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Catalogo from '@/pages/Catalogo'
import Prestamos from '@/pages/Prestamos'
import Devoluciones from '@/pages/Devoluciones'
import Lectores from '@/pages/Lectores'
import Reportes from '@/pages/Reportes'
import GestionCatalogo from '@/pages/GestionCatalogo'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
        <Route path="/prestamos" element={<ProtectedRoute><Prestamos /></ProtectedRoute>} />
        <Route path="/devoluciones" element={<ProtectedRoute><Devoluciones /></ProtectedRoute>} />
        <Route path="/lectores" element={<ProtectedRoute><Lectores /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
        <Route path="/gestion-catalogo" element={<ProtectedRoute><GestionCatalogo /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}