import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BOOTSTRAP_SECRET = Deno.env.get('ADMIN_BOOTSTRAP_SECRET') || '';
const ALLOWED_ORIGINS = new Set([
  'https://iecjkuat.com',
  'https://www.iecjkuat.com',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  ...(Deno.env.get('EXTRA_CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

function headersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function respond(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function secretMatches(candidate: unknown): Promise<boolean> {
  if (
    typeof candidate !== 'string'
    || BOOTSTRAP_SECRET.length < 32
    || candidate.length !== BOOTSTRAP_SECRET.length
  ) return false;

  const encoder = new TextEncoder();
  const [expected, supplied] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(BOOTSTRAP_SECRET)),
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
  ]);
  const expectedBytes = new Uint8Array(expected);
  const suppliedBytes = new Uint8Array(supplied);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ suppliedBytes[index];
  }
  return difference === 0;
}

serve(async (req) => {
  const headers = headersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405, headers);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('First-admin bootstrap Supabase environment is incomplete.');
    return respond({ error: 'First-admin setup is not configured.' }, 503, headers);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return respond({ error: 'Request body must be an object.' }, 400, headers);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return respond({ error: 'Request body must be valid JSON.' }, 400, headers);
  }

  const db = serviceClient();
  if (body.action === 'status') {
    if (BOOTSTRAP_SECRET.length < 32) {
      return respond({ error: 'First-administrator setup is not configured.' }, 503, headers);
    }
    const { count, error } = await db.from('admins').select('user_id', { count: 'exact', head: true });
    if (error) {
      console.error('Could not check first-admin setup status:', error.message);
      return respond({ error: 'Could not check first-admin setup status.' }, 503, headers);
    }
    return respond({ data: { available: count === 0 } }, 200, headers);
  }

  if (body.action !== 'bootstrap') return respond({ error: 'Unknown setup action.' }, 400, headers);
  if (!(await secretMatches(body.bootstrapSecret))) {
    return respond({ error: 'The one-time setup code is invalid.' }, 403, headers);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return respond({ error: 'Enter a valid email address.' }, 400, headers);
  }
  if (password.length < 12 || password.length > 128) {
    return respond({ error: 'Use a password between 12 and 128 characters.' }, 400, headers);
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return respond({ error: createError?.message || 'Could not create the administrator account.' }, 400, headers);
  }

  const { error: bootstrapError } = await db.rpc('bootstrap_first_admin', {
    p_user_id: created.user.id,
    p_email: email,
  });
  if (bootstrapError) {
    const { error: cleanupError } = await db.auth.admin.deleteUser(created.user.id);
    if (cleanupError) {
      console.error('Could not remove unclaimed auth user:', created.user.id, cleanupError.message);
    }
    if (bootstrapError.message.includes('Initial administrator setup is closed')) {
      return respond({ error: 'First-administrator setup is already complete.' }, 409, headers);
    }
    console.error('Could not grant first administrator access:', bootstrapError.message);
    return respond({ error: 'Could not complete first-administrator setup.' }, 500, headers);
  }

  return respond({ data: { created: true } }, 201, headers);
});
