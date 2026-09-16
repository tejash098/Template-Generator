import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app">
      <header className="app-header no-print">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <span lang="hi">श्री राम बस सर्विस</span> · Letters
          </span>
        </NavLink>
        <nav className="app-nav">
          <NavLink to="/" end>
            Letters
          </NavLink>
          <NavLink to="/new">New letter</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
