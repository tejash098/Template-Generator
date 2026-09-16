import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LetterEditor } from './features/editor/LetterEditor'
import { LettersList } from './features/letters/LettersList'

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
          <Route index element={<LettersList />} />
          <Route path="new" element={<LetterEditor />} />
          <Route path="letters/:id" element={<LetterEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
