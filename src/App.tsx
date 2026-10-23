import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AvisosAdmin } from './admin/AvisosAdmin'
import { EncuestaAdmin } from './admin/EncuestaAdmin'
import { EncuestasAdmin } from './admin/EncuestasAdmin'
import { EventosAdmin } from './admin/EventosAdmin'
import { Grupos } from './admin/Grupos'
import { Miembros } from './admin/Miembros'
import { Panel } from './admin/Panel'
import { PreguntasAdmin } from './admin/PreguntasAdmin'
import { Santos } from './admin/Santos'
import { TemarioAdmin } from './admin/TemarioAdmin'
import { VirtudesAdmin } from './admin/VirtudesAdmin'
import { RutaAdmin, RutaPrivada } from './auth/rutas'
import { Cargando } from './components/Bloques'
import { Layout } from './components/Layout'
import { PantallaCarga } from './components/Pantallas'
import { GruposProvider } from './grupos/GruposProvider'
import { Avisos } from './pages/Avisos'
import { Biblioteca } from './pages/Biblioteca'
import { Calendario } from './pages/Calendario'
import { CambiarContrasena } from './pages/CambiarContrasena'
import { Entrar } from './pages/Entrar'
import { Inicio } from './pages/Inicio'
import { Mas } from './pages/Mas'
import { Preguntas } from './pages/Preguntas'
import { Registro } from './pages/Registro'
import { Temas } from './pages/Temas'

// El lector y la subida de libros usan PDF.js, que es pesado: se cargan sólo al abrirlos.
const Lector = lazy(() => import('./pages/Lector').then((m) => ({ default: m.Lector })))
const LibrosAdmin = lazy(() => import('./admin/LibrosAdmin').then((m) => ({ default: m.LibrosAdmin })))

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<RutaPrivada />}>
        <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
        <Route
          path="/biblioteca/:id"
          element={
            <Suspense fallback={<PantallaCarga />}>
              <Lector />
            </Suspense>
          }
        />
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
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/temas" element={<Temas />} />
          <Route path="/preguntas" element={<Preguntas />} />
          <Route path="/mas" element={<Mas />} />
          <Route path="/admin" element={<RutaAdmin />}>
            <Route index element={<Panel />} />
            <Route path="grupos" element={<Grupos />} />
            <Route path="miembros" element={<Miembros />} />
            <Route path="preguntas" element={<PreguntasAdmin />} />
            <Route path="encuestas" element={<EncuestasAdmin />} />
            <Route path="encuestas/:id" element={<EncuestaAdmin />} />
            <Route path="temario" element={<TemarioAdmin />} />
            <Route
              path="libros"
              element={
                <Suspense fallback={<Cargando />}>
                  <LibrosAdmin />
                </Suspense>
              }
            />
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
