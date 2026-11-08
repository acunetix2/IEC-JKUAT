// lipana.dev Payment Webhook — IEC JKUAT
// Called by lipana.dev when an STK Push completes.
// Reconciliation is by lipana_ref (written by stk-push at push time),
// with metadata.member_id as fallback. Replays are safe: lipana_ref
// is UNIQUE, so a retried callback touches each payment exactly once.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const lipanaSecret = Deno.env.get('LIPANA_WEBHOOK_SECRET') || '';
const _fee = parseInt(Deno.env.get('MEMBERSHIP_FEE') || '200', 10);
const MEMBERSHIP_FEE = Number.isFinite(_fee) && _fee > 0 ? _fee : 200;
// Callbacks older than this are rejected (replay protection).
const MAX_CALLBACK_AGE_MS = 5 * 60 * 1000;

interface LipanaCallback {
  event: 'payment.success' | 'payment.failed';
  transaction_ref: string;
  phone: string;
  amount: number;
  metadata?: {
    member_id?: string;
  };
  timestamp: string;
}

// Constant-time compare so the secret can't be probed byte-by-byte.
function secretsEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Hex / base64 encoders for an HMAC digest.
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
function toBase64(buf: ArrayBuffer): string {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// HMAC-SHA256 of the raw body with the shared secret.
async function hmacSha256(secret: string, body: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
}

// Verify the webhook signature. Lipana's exact scheme isn't pinned down,
// so we accept a match on EITHER:
//   (a) the raw shared secret sent verbatim in the header, OR
//   (b) HMAC-SHA256(rawBody, secret) encoded as hex or base64
//       (the near-universal webhook pattern — Stripe/GitHub/Shopify).
// A header may carry a "sha256=" prefix (GitHub style) which we strip.
// Fails closed: no match on any form → rejected.
async function verifySignature(signature: string, secret: string, rawBody: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const sig = signature.replace(/^sha256=/i, '').trim();

  // (a) verbatim shared secret
  if (secretsEqual(sig, secret)) return true;

  // (b) HMAC of the raw body, hex or base64
  const digest = await hmacSha256(secret, rawBody);
  if (secretsEqual(sig.toLowerCase(), toHex(digest))) return true;
  if (secretsEqual(sig, toBase64(digest))) return true;

  return false;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  if (!lipanaSecret) {
    console.error('LIPANA_WEBHOOK_SECRET is not set — refusing all callbacks');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 500 });
  }

  // Read the RAW body once — HMAC must be computed over the exact bytes
  // the provider signed, so we can't use req.json() before verifying.
  const rawBody = await req.text();

  // 1. Validate webhook signature (verbatim secret OR HMAC of the body).
  const signature = req.headers.get('x-lipana-signature')
    || req.headers.get('x-signature')
    || '';
  if (!(await verifySignature(signature, lipanaSecret, rawBody))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 2. Parse the callback (from the raw body we already read)
  let payload: LipanaCallback;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  if (!payload || !payload.transaction_ref || !payload.event) {
    return new Response(JSON.stringify({ error: 'Malformed callback' }), { status: 400 });
  }

  // 3. Freshness check (replay protection)
  if (payload.timestamp) {
    const age = Date.now() - new Date(payload.timestamp).getTime();
    if (!Number.isNaN(age) && age > MAX_CALLBACK_AGE_MS) {
      console.warn(`Stale callback rejected: ${payload.transaction_ref} (${Math.round(age / 1000)}s old)`);
      return new Response(JSON.stringify({ status: 'stale' }), { status: 200 });
    }
  }

  // 4. Initialize Supabase with service role key
  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    // Resolve the member: prefer the pending payment row written by
    // stk-push (matched on lipana_ref), fall back to callback metadata.
    async function resolveMemberId(): Promise<string | null> {
      const { data } = await sb.from('payments')
        .select('member_id, payment_status')
        .eq('lipana_ref', payload.transaction_ref)
        .limit(1)
        .maybeSingle();
      if (data?.member_id) return data.member_id as string;
      return payload.metadata?.member_id || null;
    }

    // Amount must be a real number: NaN < FEE is false, so a missing
    // amount would otherwise sail through as "correct".
    const paidAmount = Number(payload.amount);
    if (!Number.isFinite(paidAmount)) {
      return new Response(JSON.stringify({ error: 'Malformed callback: amount' }), { status: 400 });
    }
    // Phone must be a short string: the payments CHECK rejects overlong
    // values with a 500 (which Lipana would retry forever). Reject junk
    // as 400 instead — Lipana won't retry those.
    const callbackPhone = typeof payload.phone === 'string' ? payload.phone.slice(0, 20) : '';
    if (!callbackPhone) {
      return new Response(JSON.stringify({ error: 'Malformed callback: phone' }), { status: 400 });
    }

    if (payload.event === 'payment.success') {
      // Verify the correct amount was paid before activating membership
      if (paidAmount < MEMBERSHIP_FEE) {
        console.warn(`Underpayment: expected KES ${MEMBERSHIP_FEE}, got KES ${paidAmount}. Ref: ${payload.transaction_ref}`);
        const memberId = await resolveMemberId();
        if (memberId) {
          await sb.from('payments').insert({
            member_id: memberId,
            amount: paidAmount,
            phone: callbackPhone,
            payment_status: 'failed',
            lipana_ref: payload.transaction_ref,
          });
        }
        return new Response(JSON.stringify({ status: 'underpayment' }), { status: 200 });
      }

      // Idempotent completion: only a pending row flips to completed.
      // Replays match zero pending rows and change nothing.
      const { data: pending } = await sb.from('payments')
        .select('id, member_id')
        .eq('lipana_ref', payload.transaction_ref)
        .eq('payment_status', 'pending')
        .limit(1)
        .maybeSingle();

      const memberId = pending?.member_id || await resolveMemberId();

      if (pending) {
        await sb.from('payments')
          .update({ payment_status: 'completed' })
          .eq('id', pending.id);
      } else if (memberId) {
        // No pending row (e.g. created before this deploy): record once.
        // lipana_ref is UNIQUE — concurrent replays raise 23505 here,
        // which we swallow below to stay idempotent.
        const { error } = await sb.from('payments').insert({
          member_id: memberId,
          amount: paidAmount,
          phone: callbackPhone,
          payment_status: 'completed',
          lipana_ref: payload.transaction_ref,
        });
        if (error && error.code !== '23505') throw error;
      }

      // Amount is correct — activate membership (idempotent update).
      if (memberId) {
        await sb.from('members')
          .update({ membership_status: 'active' })
          .eq('id', memberId);
      }

      console.log(`Payment success: ${payload.transaction_ref} — KES ${paidAmount}`);
    }
    else if (payload.event === 'payment.failed') {
      // Flip the pending row if there is one; otherwise record once.
      const { data: pending } = await sb.from('payments')
        .select('id')
        .eq('lipana_ref', payload.transaction_ref)
        .eq('payment_status', 'pending')
        .limit(1)
        .maybeSingle();

      if (pending) {
        await sb.from('payments')
          .update({ payment_status: 'failed' })
          .eq('id', pending.id);
      } else {
        const memberId = await resolveMemberId();
        if (memberId) {
          const { error } = await sb.from('payments').insert({
            member_id: memberId,
            amount: paidAmount,
            phone: callbackPhone,
            payment_status: 'failed',
            lipana_ref: payload.transaction_ref,
          });
          if (error && error.code !== '23505') throw error;
        }
      }

      console.log(`Payment failed: ${payload.transaction_ref}`);
    }
    else {
      return new Response(JSON.stringify({ error: 'Unknown event' }), { status: 400 });
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    // Never leak internals to the callback caller; full detail stays in logs.
    console.error('Webhook error:', err instanceof Error ? err.stack || err.message : String(err));
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
