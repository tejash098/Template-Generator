import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BookingsList } from './features/bookings/BookingsList'
import { BookingEditor } from './features/editor/BookingEditor'
import { TemplateGallery } from './features/templates/TemplateGallery'
import { TemplateStart } from './features/templates/TemplateStart'
import { AppShell } from './layouts/AppShell'

/**
 * HashRouter on purpose: the same build is loaded from file:// inside the
 * Electron and Capacitor shells, where history-based routing has no server
 * to fall back to.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TemplateGallery />} />
          <Route path="templates/:templateId" element={<TemplateStart />} />
          <Route path="new" element={<BookingEditor />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="bookings/:id" element={<BookingEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
