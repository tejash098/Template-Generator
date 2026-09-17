// invite-staff: owners invite staff by email. Runs with the service-role key
// (provided to Edge Functions automatically); the browser never sees it.
//
// POST { email, displayName, role: 'owner' | 'staff' }
// Authorization: Bearer <caller's access token>
//
// Verifies the caller is an active owner, then sends a Supabase invite whose
// user metadata carries organization_id/role/display_name so the
// handle_new_user trigger creates the profile and membership. If the email
// already has an account, the membership is (re)created instead.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json(500, { ok: false, error: 'function not configured' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Who is calling?
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller.user) return json(401, { ok: false, error: 'not signed in' })

  const { data: membership } = await admin
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', caller.user.id)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') return json(403, { ok: false, error: 'only owners can invite' })

  // What is being asked?
  let body: { email?: string; displayName?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { ok: false, error: 'invalid JSON body' })
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const displayName = (body.displayName ?? '').trim()
  const role = body.role === 'owner' ? 'owner' : 'staff'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'invalid email' })

  const metadata = { organization_id: membership.organization_id, role, display_name: displayName }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: metadata })

  if (!inviteError && invited.user) return json(200, { ok: true, userId: invited.user.id, status: 'invited' })

  // Already registered: attach (or reactivate) the membership instead.
  const alreadyExists = inviteError && /already|exists|registered/i.test(inviteError.message)
  if (!alreadyExists) return json(400, { ok: false, error: inviteError?.message ?? 'invite failed' })

  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = page?.users.find((u) => (u.email ?? '').toLowerCase() === email)
  if (!existing) return json(400, { ok: false, error: inviteError.message })

  const { error: upsertError } = await admin
    .from('memberships')
    .upsert(
      { organization_id: membership.organization_id, user_id: existing.id, role, revoked_at: null },
      { onConflict: 'organization_id,user_id' },
    )
  if (upsertError) return json(500, { ok: false, error: upsertError.message })
  if (displayName) await admin.from('profiles').update({ display_name: displayName }).eq('id', existing.id)

  return json(200, { ok: true, userId: existing.id, status: 'existing' })
})
