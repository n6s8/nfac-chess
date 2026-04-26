/**
 * supabase/functions/stripe-checkout/index.ts
 *
 * Creates a Stripe Checkout session for AlgoChess Pro ($4.99/mo).
 * Deployed as a Supabase Edge Function — the STRIPE_SECRET_KEY never
 * touches the browser.
 *
 * Deploy:
 *   supabase functions deploy stripe-checkout
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 */
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, price_id, success_url, cancel_url } = await req.json()

    if (!user_id || !price_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id or price_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch existing stripe_customer_id if the user already has one
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user_id)
      .single()

    let customerId = profile?.stripe_customer_id as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        metadata: { supabase_user_id: user_id },
      })
      customerId = customer.id

      // Persist customer ID immediately
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: success_url ?? `${req.headers.get('origin')}/?pro=success`,
      cancel_url: cancel_url ?? `${req.headers.get('origin')}/?pro=cancel`,
      metadata: { supabase_user_id: user_id },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-checkout]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
