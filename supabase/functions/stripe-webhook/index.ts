/**
 * supabase/functions/stripe-webhook/index.ts
 *
 * Receives Stripe webhook events and activates Pro membership in Supabase
 * when a checkout is completed.
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * In Stripe Dashboard → Webhooks, point to:
 *   https://<project>.supabase.co/functions/v1/stripe-webhook
 * Events to subscribe: checkout.session.completed, customer.subscription.deleted
 */
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', webhookSecret)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.supabase_user_id
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    if (userId) {
      const { error } = await supabaseAdmin.rpc('activate_pro', {
        p_user_id: userId,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscriptionId,
      })
      if (error) {
        console.error('[webhook] activate_pro failed:', error)
        return new Response('DB error', { status: 500 })
      }
      console.log(`[webhook] Pro activated for user ${userId}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Revoke Pro when subscription is cancelled
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_pro: false, stripe_subscription_id: null })
      .eq('stripe_customer_id', customerId)

    if (error) console.error('[webhook] revoke pro failed:', error)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
