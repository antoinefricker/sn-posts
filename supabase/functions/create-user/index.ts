// Admin-only: creates a new user account. Called from the browser with the admin's session token.
// JWT verification is done manually below (verify_jwt = false in config.toml), then the caller's
// profile is checked for is_admin before using the service-role client.
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in' }, 401)

  // Identify the caller from their token.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: caller, error: callerError } = await asCaller.auth.getUser(token)
  if (callerError || !caller.user) return json({ error: 'Invalid session' }, 401)

  const admin = createClient(url, serviceKey)

  // Only admins may create accounts.
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, club_id')
    .eq('id', caller.user.id)
    .single()
  if (!profile?.is_admin) return json({ error: 'Admins only' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  const makeAdmin = body.isAdmin === true
  if (!name || !email || password.length < 6) {
    return json({ error: 'name, email and a password of 6+ characters are required' }, 400)
  }

  // GoTrue does not pass admin-supplied app_metadata to the database triggers, and user metadata
  // is client-controlled. So the caller's club and the admin flag travel in a short-lived invite
  // row (service role only, honored for one minute) that the sign-up triggers check and consume.
  const inviteEmail = email.toLowerCase()
  let inserted = false
  try {
    // Stale rows must not block a new invite (the primary key is the email).
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    await admin.from('user_invites').delete().eq('email', inviteEmail).lt('created_at', oneMinuteAgo)

    const { error: inviteError } = await admin
      .from('user_invites')
      .insert({ email: inviteEmail, club_id: profile.club_id, make_admin: makeAdmin })
    if (inviteError) {
      if (inviteError.code === '23505') {
        return json({ error: 'An account for this email is already being created. Try again shortly.' }, 409)
      }
      return json({ error: inviteError.message }, 500)
    }
    inserted = true

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) return json({ error: error.message }, 400)
    return json({ id: data.user.id, email: data.user.email, isAdmin: makeAdmin }, 201)
  } catch (e) {
    console.error('create-user failed', e)
    return json({ error: 'Could not create the account' }, 500)
  } finally {
    // Consumed on success; this clears our own invite when creation failed (e.g. email taken).
    // Never delete a row we did not insert: it belongs to another admin's in-flight call.
    if (inserted) {
      const { error: cleanupError } = await admin.from('user_invites').delete().eq('email', inviteEmail)
      if (cleanupError) console.error('create-user: invite cleanup failed', cleanupError)
    }
  }
})
