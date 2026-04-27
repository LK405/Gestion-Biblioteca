import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [usuario, setUsuario] = useState(null)
  const [rol, setRol] = useState(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(correo) {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, rol, activo')
      .eq('correo', correo)
      .single()

    if (error || !data) {
      setUsuario(null)
      setRol(null)
      return
    }

    if (!data.activo) {
      await supabase.auth.signOut()
      setUsuario(null)
      setRol(null)
      return
    }

    setUsuario(data)
    setRol(data.rol)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        cargarPerfil(session.user.email).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        cargarPerfil(session.user.email)
      } else {
        setUsuario(null)
        setRol(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(correo, contrasena) {
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setUsuario(null)
    setRol(null)
  }

  return { usuario, rol, loading, login, logout }
}