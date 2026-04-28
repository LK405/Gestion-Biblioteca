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
import Layout from '@/components/Layout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogo"
          element={
            <ProtectedRoute>
              <Layout><Catalogo /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prestamos"
          element={
            <ProtectedRoute>
              <Layout><Prestamos /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/devoluciones"
          element={
            <ProtectedRoute>
              <Layout><Devoluciones /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lectores"
          element={
            <ProtectedRoute>
              <Layout><Lectores /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute soloAdmin>
              <Layout><Reportes /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestion-catalogo"
          element={
            <ProtectedRoute soloAdmin>
              <Layout><GestionCatalogo /></Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}