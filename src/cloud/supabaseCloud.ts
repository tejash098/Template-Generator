import type { AppSupabaseClient } from './supabase'
import {
  BookingNoConflictError,
  type CloudApi,
  type Member,
  type Membership,
  type RemoteBooking,
  type RemoteBookingInsert,
} from './cloudApi'

const SHARE_BUCKET = 'share-files'
const UNIQUE_VIOLATION = '23505'

/** CloudApi backed by supabase-js. All data access goes through RLS. */
export function supabaseCloud(client: AppSupabaseClient): CloudApi {
  return {
    async myMembership(): Promise<Membership | null> {
      const { data, error } = await client.rpc('my_membership')
      if (error) throw error
      const row = data?.[0]
      if (!row) return null
      return {
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        role: row.role,
        displayName: row.display_name,
      }
    },

    async registerDevice(deviceId, name) {
      const { data, error } = await client.rpc('register_device', { p_device_id: deviceId, p_name: name })
      if (error) throw error
      return data
    },

    async reserveBlock(deviceId, size) {
      const { data, error } = await client.rpc('reserve_number_block', { p_device_id: deviceId, p_size: size })
      if (error) throw error
      const block = data?.[0]
      if (!block) throw new Error('reserve_number_block returned no block')
      return { start: block.start_seq, end: block.end_seq }
    },

    async ensureCounterAtLeast(next) {
      const { error } = await client.rpc('ensure_counter_at_least', { p_next: next })
      if (error) throw error
    },

    async pullSince(cursor, limit): Promise<RemoteBooking[]> {
      let query = client.from('bookings').select('*').order('updated_at', { ascending: true }).limit(limit)
      if (cursor) query = query.gt('updated_at', cursor)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },

    async pushRow(row: RemoteBookingInsert) {
      const { error } = await client.from('bookings').upsert(row, { onConflict: 'id' })
      if (error) {
        if (error.code === UNIQUE_VIOLATION) throw new BookingNoConflictError(row.id)
        throw error
      }
    },

    subscribe(organizationId, onChange) {
      const channel = client
        .channel(`bookings-${organizationId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `organization_id=eq.${organizationId}` },
          () => onChange(),
        )
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },

    async uploadShareFile(path, blob, contentType) {
      const { error } = await client.storage.from(SHARE_BUCKET).upload(path, blob, { contentType, upsert: true })
      if (error) throw error
    },

    async signedUrl(path, expiresInSeconds) {
      const { data, error } = await client.storage.from(SHARE_BUCKET).createSignedUrl(path, expiresInSeconds)
      if (error) throw error
      return data.signedUrl
    },

    async listMembers(organizationId): Promise<Member[]> {
      const { data: memberships, error } = await client
        .from('memberships')
        .select('user_id, role, revoked_at, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      const ids = (memberships ?? []).map((m) => m.user_id)
      const { data: profiles, error: profileError } = await client
        .from('profiles')
        .select('id, display_name, email')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      if (profileError) throw profileError
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
      return (memberships ?? []).map((m) => ({
        userId: m.user_id,
        role: m.role,
        revokedAt: m.revoked_at,
        createdAt: m.created_at,
        displayName: byId.get(m.user_id)?.display_name ?? '',
        email: byId.get(m.user_id)?.email ?? '',
      }))
    },

    async revokeMember(organizationId, userId) {
      const { error } = await client
        .from('memberships')
        .update({ revoked_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
      if (error) throw error
    },

    async invite(input) {
      const { data, error } = await client.functions.invoke<{ ok: boolean; error?: string }>('invite-staff', {
        body: { email: input.email, displayName: input.displayName, role: input.role },
      })
      if (error) throw error
      if (data && data.ok === false) throw new Error(data.error ?? 'invite failed')
    },
  }
}
