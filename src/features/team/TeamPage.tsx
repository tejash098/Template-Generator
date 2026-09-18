import { UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import type { Member, MembershipRole } from '../../cloud/cloudApi'
import { useAuth } from '../../cloud/useAuth'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field } from '../../components/ui/Field'
import { FORM, ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** Owner-only: invite staff and revoke access. */
export function TeamPage() {
  const { status, user, membership, isOwner, api } = useAuth()
  const { t } = useLocale()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MembershipRole>('staff')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [revoking, setRevoking] = useState<Member | null>(null)

  const organizationId = membership?.organizationId
  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!api || !organizationId) return
    let cancelled = false
    api
      .listMembers(organizationId)
      .then((list) => {
        if (cancelled) return
        setMembers(list)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorText(err))
      })
    return () => {
      cancelled = true
    }
  }, [api, organizationId, reloadKey])

  if (status === 'loading') return null
  if (status !== 'member' || !membership || !api) return <Navigate to="/signin" replace />
  if (!isOwner) {
    return (
      <PageLayout title={t('team.title')}>
        <p className="text-sm text-text-secondary">{t('team.notOwner')}</p>
      </PageLayout>
    )
  }

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setNotice(null)
    try {
      await api.invite({ email: email.trim(), displayName: name.trim(), role })
      setNotice({ tone: 'ok', text: t('team.invite.sent', { email: email.trim() }) })
      setName('')
      setEmail('')
      setRole('staff')
      load()
    } catch (err) {
      setNotice({ tone: 'error', text: t('team.invite.failed', { error: errorText(err) }) })
    } finally {
      setSending(false)
    }
  }

  const revoke = async () => {
    if (!revoking) return
    const target = revoking
    setRevoking(null)
    try {
      await api.revokeMember(membership.organizationId, target.userId)
      setNotice({ tone: 'ok', text: t('team.revoked', { name: target.displayName || target.email }) })
      load()
    } catch (err) {
      setNotice({ tone: 'error', text: errorText(err) })
    }
  }

  return (
    <PageLayout title={t('team.title')} subtitle={t('team.subtitle')}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-text-primary">{t('team.invite.title')}</h2>
          <form className="flex flex-col gap-4" onSubmit={invite}>
            <Field id="invite-name" label={t('team.invite.name')}>
              <input id="invite-name" type="text" required className={FORM.INPUT} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="invite-email" label={t('team.invite.email')}>
              <input id="invite-email" type="email" required className={FORM.INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field id="invite-role" label={t('team.invite.role')}>
              <select id="invite-role" className={FORM.INPUT} value={role} onChange={(e) => setRole(e.target.value as MembershipRole)}>
                <option value="staff">{t('account.role.staff')}</option>
                <option value="owner">{t('account.role.owner')}</option>
              </select>
            </Field>
            <Button type="submit" variant="primary" disabled={sending} icon={<UserPlus size={ICON_SIZE.SM} aria-hidden="true" />}>
              {sending ? t('team.invite.working') : t('team.invite.submit')}
            </Button>
            {notice && (
              <p className={`text-sm ${notice.tone === 'ok' ? 'text-success' : 'text-danger'}`} role="status">
                {notice.text}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-text-primary">{t('team.members')}</h2>
          {loadError && <p className="text-sm text-danger">{t('team.loadFailed', { error: loadError })}</p>}
          {!members && !loadError && <p className="text-sm text-text-secondary">{t('team.loading')}</p>}
          {members && (
            <ul className="divide-y divide-border">
              {members.map((m) => {
                const isSelf = m.userId === user?.id
                const active = !m.revokedAt
                return (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {m.displayName || m.email}
                        {isSelf && <span className="ml-2 text-xs text-text-secondary">({t('team.you')})</span>}
                      </div>
                      <div className="truncate text-xs text-text-secondary">{m.email}</div>
                    </div>
                    <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                      {m.role === 'owner' ? t('account.role.owner') : t('account.role.staff')}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {active ? t('team.status.active') : t('team.status.revoked')}
                    </span>
                    {!isSelf && active && (
                      <Button size="sm" variant="danger" onClick={() => setRevoking(m)}>
                        {t('team.revoke')}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title={t('team.revokeTitle')}
        message={t('team.revokeConfirm', { name: revoking?.displayName || revoking?.email || '' })}
        confirmLabel={t('team.revoke')}
        danger
        onConfirm={revoke}
        onCancel={() => setRevoking(null)}
      />
    </PageLayout>
  )
}
