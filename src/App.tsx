import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { SetPasswordPage } from './features/auth/SetPasswordPage'
import { SignInPage } from './features/auth/SignInPage'
import { BookingsList } from './features/bookings/BookingsList'
import { BookingEditor } from './features/editor/BookingEditor'
import { LandingPage } from './features/landing/LandingPage'
import { TeamPage } from './features/team/TeamPage'
import { TemplateGallery } from './features/templates/TemplateGallery'
import { TemplateStart } from './features/templates/TemplateStart'
import { AppShell } from './layouts/AppShell'

/**
 * HashRouter on purpose: the same build is loaded from file:// inside the
 * Electron and Capacitor shells, where history-based routing has no server
 * to fall back to. Public pages render without the shell; the app proper
 * lives under AppShell starting at /templates.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="auth/set-password" element={<SetPasswordPage />} />
        <Route element={<AppShell />}>
          <Route path="templates" element={<TemplateGallery />} />
          <Route path="templates/:templateId" element={<TemplateStart />} />
          <Route path="new" element={<BookingEditor />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="bookings/:id" element={<BookingEditor />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="*" element={<Navigate to="/templates" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
