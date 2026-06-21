// lipana.dev Payment Webhook — IEC JKUAT
// Called by lipana.dev when an STK Push completes

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const lipanaSecret = Deno.env.get('LIPANA_WEBHOOK_SECRET') || '';

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

serve(async (req) => {
  // 1. Validate webhook secret
  const signature = req.headers.get('x-lipana-signature');
  if (!signature || signature !== lipanaSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 2. Parse the callback
  let payload: LipanaCallback;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // 3. Initialize Supabase with service role key
  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    if (payload.event === 'payment.success') {
      // Find the payment by transaction ref
      const memberId = payload.metadata?.member_id;

      // Update member status to active
      if (memberId) {
        await sb.from('members')
          .update({ membership_status: 'active' })
          .eq('id', memberId);

        // Record completed payment
        await sb.from('payments').insert({
          member_id: memberId,
          amount: payload.amount,
          phone: payload.phone,
          payment_status: 'completed',
          lipana_ref: payload.transaction_ref,
        });
      }

      console.log(`Payment success: ${payload.transaction_ref} — KES ${payload.amount}`);
    } 
    else if (payload.event === 'payment.failed') {
      const memberId = payload.metadata?.member_id;

      if (memberId) {
        // Record failed payment
        await sb.from('payments').insert({
          member_id: memberId,
          amount: payload.amount,
          phone: payload.phone,
          payment_status: 'failed',
          lipana_ref: payload.transaction_ref,
        });
      }

      console.log(`Payment failed: ${payload.transaction_ref}`);
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
