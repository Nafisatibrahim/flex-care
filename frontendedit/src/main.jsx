import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.jsx'
import PosturePage from './pages/PosturePage.jsx'
import TrackerPage from './pages/TrackerPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<App />} />
          <Route path="/posture" element={<PosturePage />} />
          <Route path="/tracker" element={<TrackerPage />} />
        </Routes>
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>
)
