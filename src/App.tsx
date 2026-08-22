import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider, useStore } from './store/store'
import { registerServiceWorker } from './lib/pwa'
import { Header } from './components/Header'
import { Logo } from './components/Logo'
import { Footer } from './components/Footer'
import { TabBar } from './components/TabBar'
import { Home } from './pages/Home'
import { Favorites } from './pages/Favorites'
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
import { OwnerAccount } from './pages/owner/Account'
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

/**
 * Écran d'attente pendant le premier chargement.
 *
 * L'annuaire vient du serveur : afficher l'interface avant son arrivée
 * donnerait un instant de « aucun restaurant trouvé » trompeur.
 */
function Boot({ children }: { children: React.ReactNode }) {
  const { ready } = useStore()
  if (ready) return <>{children}</>
  return (
    <div className="boot">
      <Logo size={72} id="boot" />
      <p>Chargement de l’annuaire…</p>
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
        {/* L'en-tête reste le premier élément : c'est lui qui réserve la
            zone de sécurité haute en mode plein écran. */}
        <Header />
        <UpdateBanner />
        <Boot>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* La carte est la même page, ouverte sur sa vue géographique. */}
          <Route path="/carte" element={<Home initialView="carte" />} />
          <Route path="/favoris" element={<Favorites />} />
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
            <Route path="compte" element={<OwnerAccount />} />
          </Route>

          <Route path="/admin/login" element={<Login mode="admin" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/r/:id" element={<AdminRestaurant />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Boot>
        <Footer />
        <TabBar />
      </HashRouter>
    </StoreProvider>
  )
}
