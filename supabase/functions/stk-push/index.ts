// IEC JKUAT - M-Pesa Payment Edge Function
// Integrates with lipana.dev for M-Pesa STK Push
// Deploy with: supabase functions deploy stk-push --no-verify-jwt
// NOTE: --no-verify-jwt is required because this is invoked with the
// anon key from the public site. Abuse protection therefore lives in
// the validation below (fixed amount, member check, phone format).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIPANA_API_KEY = Deno.env.get('LIPANA_SECRET_KEY') || '';
const LIPANA_API_URL = Deno.env.get('LIPANA_ENVIRONMENT') === 'sandbox'
  ? 'https://api-sandbox.lipana.dev/v1'
  : 'https://api.lipana.dev/v1';
const _fee = parseInt(Deno.env.get('MEMBERSHIP_FEE') || '200', 10);
const MEMBERSHIP_FEE = Number.isFinite(_fee) && _fee > 0 ? _fee : 200;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function normalisePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^\d]/g, '');
  // Accept 07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX (Safaricom 07/01/011 ranges)
  let normalised: string | null = null;
  if (/^0[17]\d{8}$/.test(digits)) normalised = '+254' + digits.slice(1);
  else if (/^254[17]\d{8}$/.test(digits)) normalised = '+' + digits;
  else if (/^\+254[17]\d{8}$/.test(raw.trim())) normalised = raw.trim();
  return normalised;
}

// Allow the production site and local dev. Extra origins can be added via
// the EXTRA_CORS_ORIGINS secret (comma-separated).
const ALLOWED_ORIGINS = new Set<string>([
  'https://iecjkuat.com',
  'https://www.iecjkuat.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  ...(Deno.env.get('EXTRA_CORS_ORIGINS') || '')
    .split(',').map((s) => s.trim()).filter(Boolean),
]);

// Build CORS headers for a given request origin. Only echoes the origin
// back when it's on the allow-list; unknown origins get no CORS grant
// (the browser then blocks the response), while the server still works
// for same-origin / non-browser callers.
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req);
  // CORS preflight (must not require auth/validation).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: CORS_HEADERS });
    }

    // Fail fast on server misconfiguration instead of echoing a
    // downstream 401 as a confusing client error.
    if (!LIPANA_API_KEY) {
      console.error('LIPANA_SECRET_KEY is not set');
      return new Response(JSON.stringify({ error: 'Payments are temporarily unavailable' }),
        { status: 500, headers: CORS_HEADERS });
    }

    const { phone, amount, member_id } = await req.json();

    // Validate inputs — fixed membership fee, real member, real number.
    if (!phone || amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'Phone and amount are required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (Number(amount) !== MEMBERSHIP_FEE) {
      return new Response(
        JSON.stringify({ error: `Amount must be KES ${MEMBERSHIP_FEE}` }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const cleanPhone = normalisePhone(phone);
    if (!cleanPhone) {
      return new Response(
        JSON.stringify({ error: 'Enter a valid Safaricom number (e.g. 0712345678)' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!member_id || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: 'A valid member registration is required before paying' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // The member must exist (prevents pushes for fabricated ids).
    const { data: member, error: memberError } = await sb
      .from('members').select('id').eq('id', member_id).single();
    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Member not found. Please register first.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // One pending push per member — prevents push spam / fee drain.
    const { data: existing } = await sb.from('payments')
      .select('id').eq('member_id', member_id).eq('payment_status', 'pending')
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'A payment request is already pending. Check your phone for the M-Pesa prompt.' }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 1. Initiate STK Push via lipana.dev (bounded: never hang the edge worker).
    const lipanaResponse = await fetch(`${LIPANA_API_URL}/stk-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIPANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        amount: MEMBERSHIP_FEE,
        reference: `IEC-${member_id}-${Date.now()}`,
        metadata: { member_id },
      }),
      signal: AbortSignal.timeout(15000),
    });

    // Lipana may answer with non-JSON on gateway failures — never leak
    // raw upstream bodies to the client.
    let lipanaData: Record<string, unknown> = {};
    try {
      lipanaData = await lipanaResponse.json();
    } catch {
      throw new Error('Payment provider did not respond. Please try again.');
    }

    if (!lipanaResponse.ok) {
      throw new Error(typeof lipanaData.message === 'string' ? lipanaData.message : 'Payment initiation failed');
    }

    // 2. Record pending payment (webhook resolves it by lipana_ref).
    const lipanaRef = (lipanaData.transactionId || lipanaData.reference) as string | undefined;
    if (!lipanaRef) throw new Error('Payment provider gave no reference. Please try again.');
    const { data: paymentRecord, error: insertError } = await sb.from('payments').insert({
      member_id: member_id,
      amount: MEMBERSHIP_FEE,
      phone: cleanPhone,
      payment_status: 'pending',
      lipana_ref: lipanaRef,
    }).select().single();

    // 23505 on the partial pending-per-member index (or lipana_ref) means
    // a concurrent request already created the pending row — tell the
    // user to check their phone instead of double-pushing.
    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'A payment request is already pending. Check your phone for the M-Pesa prompt.' }),
          { status: 429, headers: CORS_HEADERS }
        );
      }
      throw new Error('Could not record payment. Please try again.');
    }

    // 3. Return success response (membership activates ONLY via webhook
    //    after Lipana confirms money actually moved).
    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent to your phone. Check M-Pesa and enter PIN.',
        transactionRef: lipanaRef,
        paymentRecord,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    // `error` is unknown under strict TS — accessing .message directly
    // fails `deno check` and therefore breaks deployment.
    const message = error instanceof Error ? error.message : String(error);
    // Everything that throws past the input-validation block above is an
    // upstream-provider or database failure, not a client mistake — those
    // already returned their own 400/429. Report 502 Bad Gateway so the
    // status code is honest (a failed request isn't the caller's fault).
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 502, headers: CORS_HEADERS }
    );
  }
});
