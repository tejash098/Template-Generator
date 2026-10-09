import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled (not fetched from Google) so exports look identical
// offline and inside the desktop/mobile shells.
import '@fontsource/tiro-devanagari-hindi/400.css'
import '@fontsource/mukta/400.css'
import '@fontsource/mukta/500.css'
import '@fontsource/mukta/700.css'
import '@fontsource/rozha-one/400.css'
import './index.css'
import './styles/print.css'
import App from './App'
import { AuthProvider } from './cloud/AuthProvider'
import { CalendarProvider } from './cloud/CalendarProvider'
import { routeOAuthRedirect } from './cloud/oauthRedirect'
import { LocaleProvider } from './i18n/LocaleProvider'
import { SidebarProvider } from './layout/SidebarProvider'
import { ThemeProvider } from './theme/ThemeProvider'

// Google returns from the Calendar consent to `/?code=…`; move that into the
// hash route before HashRouter reads the URL.
routeOAuthRedirect()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <SidebarProvider>
          <AuthProvider>
            <CalendarProvider>
              <App />
            </CalendarProvider>
          </AuthProvider>
        </SidebarProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
