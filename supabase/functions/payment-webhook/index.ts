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

// Shape per the official Lipana SDK (lipana 1.0.1):
//   { event: 'transaction.success' | 'transaction.failed', data: {...} }
// The transaction detail lives under `data`. Field names inside `data`
// aren't fully documented, so we read the common aliases defensively.
interface LipanaTxnData {
  transactionId?: string;
  id?: string;
  reference?: string;
  phone?: string;
  amount?: number;
  accountReference?: string;
  [k: string]: unknown;
}
interface LipanaCallback {
  event: 'transaction.success' | 'transaction.failed' | string;
  data?: LipanaTxnData;
  timestamp?: string;
  // Legacy/flat fallbacks (older payloads) — read if `data` is absent.
  transaction_ref?: string;
  phone?: string;
  amount?: number;
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

// HMAC-SHA256 of a message string with the shared secret.
async function hmacSha256(secret: string, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
}

// Recursively sort object keys so JSON.stringify produces the same
// canonical string Python's json.dumps(payload, sort_keys=True) does —
// that is exactly what the Lipana SDK signs.
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeysDeep((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

// Verify the webhook signature. The official Lipana SDK computes:
//   hmac_sha256(secret, json.dumps(payload, sort_keys=True)).hexdigest()
// and compares it to the x-lipana-signature header. We match that first,
// then fall back to HMAC-of-raw-body (hex/base64) and the verbatim secret
// so a minor serialisation difference can't lock out real callbacks.
// A "sha256=" prefix (GitHub style) is stripped. Fails closed.
async function verifySignature(
  signature: string,
  secret: string,
  rawBody: string,
  parsed: unknown,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const sig = signature.replace(/^sha256=/i, '').trim();

  // (a) SDK scheme: HMAC of the sorted-key canonical JSON (hex)
  if (parsed !== undefined) {
    const canonical = JSON.stringify(sortKeysDeep(parsed));
    const d = await hmacSha256(secret, canonical);
    if (secretsEqual(sig.toLowerCase(), toHex(d))) return true;
  }

  // (b) HMAC of the raw body, hex or base64
  const digest = await hmacSha256(secret, rawBody);
  if (secretsEqual(sig.toLowerCase(), toHex(digest))) return true;
  if (secretsEqual(sig, toBase64(digest))) return true;

  // (c) verbatim shared secret
  if (secretsEqual(sig, secret)) return true;

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

  // Read the RAW body once. We need both the raw string (for an HMAC-of-
  // raw-body fallback) and the parsed object (Lipana signs the sorted-key
  // re-serialisation of the parsed payload).
  const rawBody = await req.text();

  // Parse first — the SDK's signature is computed over the parsed payload,
  // so verification needs the object. Reject non-JSON before auth.
  let payload: LipanaCallback;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // 1. Validate webhook signature (SDK sorted-key HMAC, with fallbacks).
  const signature = req.headers.get('x-lipana-signature')
    || req.headers.get('x-signature')
    || '';
  if (!(await verifySignature(signature, lipanaSecret, rawBody, payload))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 2. Normalise the envelope. Lipana sends { event, data: {...} }; older
  //    payloads were flat. Read the transaction ref / phone / amount from
  //    `data` first, then fall back to the flat fields.
  const d = payload.data ?? {};
  const txnRef = (d.transactionId || d.id || d.reference || payload.transaction_ref) as string | undefined;
  const txnPhoneRaw = (d.phone ?? payload.phone) as string | undefined;
  const txnAmount = (d.amount ?? payload.amount) as number | undefined;

  if (!payload.event || !txnRef) {
    return new Response(JSON.stringify({ error: 'Malformed callback' }), { status: 400 });
  }

  // 3. Freshness check (replay protection)
  if (payload.timestamp) {
    const age = Date.now() - new Date(payload.timestamp).getTime();
    if (!Number.isNaN(age) && age > MAX_CALLBACK_AGE_MS) {
      console.warn(`Stale callback rejected: ${txnRef} (${Math.round(age / 1000)}s old)`);
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
        .eq('lipana_ref', txnRef)
        .limit(1)
        .maybeSingle();
      if (data?.member_id) return data.member_id as string;
      // Fallback: stk-push sets accountReference = "IEC-<member_id>".
      const acct = (d.accountReference ?? '') as string;
      const m = /^IEC-(.+)$/.exec(acct);
      return m ? m[1] : null;
    }

    // Amount must be a real number: NaN < FEE is false, so a missing
    // amount would otherwise sail through as "correct".
    const paidAmount = Number(txnAmount);
    if (!Number.isFinite(paidAmount)) {
      return new Response(JSON.stringify({ error: 'Malformed callback: amount' }), { status: 400 });
    }
    // Phone must be a short string: the payments CHECK rejects overlong
    // values with a 500 (which Lipana would retry forever). Reject junk
    // as 400 instead — Lipana won't retry those.
    const callbackPhone = typeof txnPhoneRaw === 'string' ? txnPhoneRaw.slice(0, 20) : '';
    if (!callbackPhone) {
      return new Response(JSON.stringify({ error: 'Malformed callback: phone' }), { status: 400 });
    }

    if (payload.event === 'transaction.success') {
      // Verify the correct amount was paid before activating membership
      if (paidAmount < MEMBERSHIP_FEE) {
        console.warn(`Underpayment: expected KES ${MEMBERSHIP_FEE}, got KES ${paidAmount}. Ref: ${txnRef}`);
        const memberId = await resolveMemberId();
        if (memberId) {
          await sb.from('payments').insert({
            member_id: memberId,
            amount: paidAmount,
            phone: callbackPhone,
            payment_status: 'failed',
            lipana_ref: txnRef,
          });
        }
        return new Response(JSON.stringify({ status: 'underpayment' }), { status: 200 });
      }

      // Idempotent completion: only a pending row flips to completed.
      // Replays match zero pending rows and change nothing.
      const { data: pending } = await sb.from('payments')
        .select('id, member_id')
        .eq('lipana_ref', txnRef)
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
          lipana_ref: txnRef,
        });
        if (error && error.code !== '23505') throw error;
      }

      // Amount is correct — activate membership (idempotent update).
      if (memberId) {
        await sb.from('members')
          .update({ membership_status: 'active' })
          .eq('id', memberId);
      }

      console.log(`Payment success: ${txnRef} — KES ${paidAmount}`);
    }
    else if (payload.event === 'transaction.failed') {
      // Flip the pending row if there is one; otherwise record once.
      const { data: pending } = await sb.from('payments')
        .select('id')
        .eq('lipana_ref', txnRef)
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
            lipana_ref: txnRef,
          });
          if (error && error.code !== '23505') throw error;
        }
      }

      console.log(`Payment failed: ${txnRef}`);
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
