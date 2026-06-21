// IEC JKUAT - M-Pesa Payment Edge Function
// Integrates with lipana.dev for M-Pesa STK Push
// Deploy with: supabase functions deploy stk-push --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIPANA_API_KEY = Deno.env.get('LIPANA_SECRET_KEY') || '';
const LIPANA_API_URL = Deno.env.get('LIPANA_ENVIRONMENT') === 'sandbox'
  ? 'https://api-sandbox.lipana.dev/v1'
  : 'https://api.lipana.dev/v1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    const { phone, amount, member_id } = await req.json();

    // Validate inputs
    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: 'Phone and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Initiate STK Push via lipana.dev
    const lipanaResponse = await fetch(`${LIPANA_API_URL}/stk-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIPANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone, // Should be in format +2547XXXXXXXX
        amount: amount,
        reference: `IEC-${Date.now()}`,
      }),
    });

    const lipanaData = await lipanaResponse.json();

    if (!lipanaResponse.ok) {
      throw new Error(lipanaData.message || 'Payment initiation failed');
    }

    // 2. Record payment in Supabase (if we have a member_id)
    let paymentRecord = null;
    if (member_id && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data, error } = await sb.from('payments').insert({
        member_id: member_id,
        amount: amount,
        phone: phone,
        payment_status: 'pending',
        lipana_ref: lipanaData.transactionId || lipanaData.reference,
      }).select().single();

      if (!error) paymentRecord = data;
    }

    // 3. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent to your phone. Check M-Pesa and enter PIN.',
        transactionRef: lipanaData.transactionId || lipanaData.reference,
        paymentRecord,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
