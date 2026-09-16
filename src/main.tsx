import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled (not fetched from Google) so exports look identical
// offline and inside the desktop/mobile shells.
import '@fontsource/tiro-devanagari-hindi/400.css'
import '@fontsource/mukta/700.css'
import '@fontsource/rozha-one/400.css'
import './styles/app.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
