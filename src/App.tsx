import { BookOpen, Vote } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router'
import { AvisosAdmin } from './admin/AvisosAdmin'
import { EventosAdmin } from './admin/EventosAdmin'
import { Grupos } from './admin/Grupos'
import { Miembros } from './admin/Miembros'
import { Panel } from './admin/Panel'
import { Santos } from './admin/Santos'
import { VirtudesAdmin } from './admin/VirtudesAdmin'
import { RutaAdmin, RutaPrivada } from './auth/rutas'
import { Layout } from './components/Layout'
import { Proximamente } from './components/Proximamente'
import { GruposProvider } from './grupos/GruposProvider'
import { Avisos } from './pages/Avisos'
import { Calendario } from './pages/Calendario'
import { CambiarContrasena } from './pages/CambiarContrasena'
import { Entrar } from './pages/Entrar'
import { Inicio } from './pages/Inicio'
import { Mas } from './pages/Mas'

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route element={<RutaPrivada />}>
        <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
        <Route
          element={
            <GruposProvider>
              <Layout />
            </GruposProvider>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route
            path="/biblioteca"
            element={
              <Proximamente
                titulo="Biblioteca"
                descripcion="Los libros de reflexión de tu grupo, con tus notas y frases guardadas."
                Icono={BookOpen}
              />
            }
          />
          <Route
            path="/temas"
            element={
              <Proximamente
                titulo="Temas"
                descripcion="Propón temas para las charlas y vota por tu favorito."
                Icono={Vote}
              />
            }
          />
          <Route path="/mas" element={<Mas />} />
          <Route path="/admin" element={<RutaAdmin />}>
            <Route index element={<Panel />} />
            <Route path="grupos" element={<Grupos />} />
            <Route path="miembros" element={<Miembros />} />
            <Route path="avisos" element={<AvisosAdmin />} />
            <Route path="eventos" element={<EventosAdmin />} />
            <Route path="virtudes" element={<VirtudesAdmin />} />
            <Route path="santos" element={<Santos />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
