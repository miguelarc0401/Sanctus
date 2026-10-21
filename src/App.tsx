import { BookOpen, CalendarDays, Shield, Vote } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router'
import { RutaAdmin, RutaPrivada } from './auth/rutas'
import { Layout } from './components/Layout'
import { Proximamente } from './components/Proximamente'
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
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route
            path="/calendario"
            element={
              <Proximamente
                titulo="Calendario"
                descripcion="Actividades, campamentos, excursiones, misas y horas santas."
                Icono={CalendarDays}
              />
            }
          />
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
          <Route element={<RutaAdmin />}>
            <Route
              path="/admin"
              element={
                <Proximamente
                  titulo="Panel de administración"
                  descripcion="Grupos, miembros, avisos, eventos, virtudes, libros, encuestas y preguntas."
                  Icono={Shield}
                />
              }
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
