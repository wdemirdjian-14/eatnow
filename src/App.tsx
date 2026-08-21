import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './store/store'
import { registerServiceWorker } from './lib/pwa'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { RestaurantDetail } from './pages/RestaurantDetail'
import { Login } from './pages/Login'
import { OwnerLayout } from './pages/owner/OwnerLayout'
import { OwnerDashboard } from './pages/owner/Dashboard'
import { OwnerFiche } from './pages/owner/Fiche'
import { OwnerMenuEditor } from './pages/owner/MenuEditor'
import { OwnerFormules } from './pages/owner/Formules'
import { OwnerTranslations } from './pages/owner/Translations'
import { OwnerLanguages } from './pages/owner/Languages'
import { OwnerQrCode } from './pages/owner/QrCode'
import { Admin } from './pages/admin/Admin'
import { AdminRestaurant } from './pages/admin/AdminRestaurant'

/**
 * Enregistre le service worker et propose d'appliquer une nouvelle version
 * dès qu'elle est prête, plutôt que d'attendre la fermeture des onglets.
 */
function UpdateBanner() {
  const [apply, setApply] = useState<(() => void) | null>(null)
  useEffect(() => {
    registerServiceWorker((run) => setApply(() => run))
  }, [])
  if (!apply) return null
  return (
    <div className="update-bar" role="status">
      <span style={{ flex: 1 }}>Une nouvelle version d’Eatnow est disponible.</span>
      <button className="btn sm sun" onClick={apply}>Actualiser</button>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollToTop />
        <UpdateBanner />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:slug" element={<RestaurantDetail />} />

          <Route path="/pro" element={<Login mode="owner" />} />
          <Route path="/pro" element={<OwnerLayout />}>
            <Route path="tableau-de-bord" element={<OwnerDashboard />} />
            <Route path="fiche" element={<OwnerFiche />} />
            <Route path="carte" element={<OwnerMenuEditor />} />
            <Route path="formules" element={<OwnerFormules />} />
            <Route path="traductions" element={<OwnerTranslations />} />
            <Route path="qr-code" element={<OwnerQrCode />} />
            <Route path="langues" element={<OwnerLanguages />} />
          </Route>

          <Route path="/admin/login" element={<Login mode="admin" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/r/:id" element={<AdminRestaurant />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </HashRouter>
    </StoreProvider>
  )
}
