import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './assets/index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/context/AuthContext.tsx'
import { CartProvider } from './features/orders/context/CartContext.tsx'
import { NotificationProvider } from './components/NotificationProvider.tsx'
import { InitialSplash } from './components/InitialSplash.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitialSplash>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </InitialSplash>
  </StrictMode>,
)
