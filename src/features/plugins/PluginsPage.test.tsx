import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../cloud/AuthContext'
import { CalendarContext, type CalendarContextValue } from '../../cloud/CalendarContext'
import type { GoogleConnection } from '../../cloud/cloudApi'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { PluginsPage } from './PluginsPage'

const auth: AuthContextValue = {
  status: 'member',
  user: { id: 'user-1', email: 'owner@srbs.test' },
  membership: null,
  deviceCode: null,
  isOwner: true,
  api: null,
  signIn: async () => null,
  signOut: async () => 'ok',
  requestPasswordReset: async () => null,
  verifyTokenHash: async () => null,
  setPassword: async () => null,
}

const calendar = (connection: GoogleConnection | null): CalendarContextValue => ({
  available: true,
  loading: false,
  connection,
  eventFor: () => undefined,
  isBusy: () => false,
  connect: vi.fn(),
  finishConnect: vi.fn(),
  disconnect: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  reload: vi.fn(),
})

function show(connection: GoogleConnection | null) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <AuthContext.Provider value={auth}>
          <CalendarContext.Provider value={calendar(connection)}>
            <PluginsPage />
          </CalendarContext.Provider>
        </AuthContext.Provider>
      </LocaleProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

const card = (name: string) => screen.getByRole('heading', { name }).closest('div.rounded-xl') as HTMLElement

describe('PluginsPage', () => {
  it('lists Google, Notion Calendar, calendar.com and Microsoft Outlook', () => {
    show(null)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Google Calendar',
      'Notion Calendar',
      'Calendar (calendar.com)',
      'Microsoft Outlook Calendar',
    ])
  })

  it('marks Microsoft Outlook as coming soon, with nothing to click', () => {
    show(null)
    const outlook = card('Microsoft Outlook Calendar')
    expect(outlook.textContent).toContain('Coming soon')
    expect(outlook.querySelector('button, a')).toBeNull()
  })

  it('sends Notion Calendar and calendar.com users through Google Calendar', () => {
    show(null)
    const notion = card('Notion Calendar')
    expect(notion.textContent).toContain('Connect Google Calendar above first')
    expect(screen.getByRole('link', { name: 'Open Notion Calendar' }).getAttribute('href')).toBe('https://calendar.notion.so/')
    expect(screen.getByRole('link', { name: 'Open Calendar (calendar.com)' }).getAttribute('href')).toBe('https://www.calendar.com/')
  })

  it('says which Google account to add once Google Calendar is connected', () => {
    show({ status: 'connected', accountEmail: 'owner@gmail.test' })
    expect(card('Notion Calendar').textContent).toContain('add the Google account owner@gmail.test')
    expect(card('Calendar (calendar.com)').textContent).toContain('add the Google account owner@gmail.test')
  })

  it('does not call a Google connection that needs a reconnect ready', () => {
    show({ status: 'needs_reauth', accountEmail: 'owner@gmail.test' })
    expect(card('Notion Calendar').textContent).toContain('Connect Google Calendar above first')
  })
})
