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
import { LocaleProvider } from './i18n/LocaleProvider'
import { SidebarProvider } from './layout/SidebarProvider'
import { ThemeProvider } from './theme/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <SidebarProvider>
          <App />
        </SidebarProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
