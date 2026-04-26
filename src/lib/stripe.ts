/**
 * src/lib/stripe.ts
 *
 * Creates a Stripe Checkout session via the Supabase Edge Function.
 * The Edge Function holds the secret Stripe key — nothing sensitive lives here.
 */
import { supabase } from './supabase'

export async function createStripeCheckoutSession(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      user_id: userId,
      price_id: import.meta.env.VITE_STRIPE_PRICE_ID as string,
      success_url: `${window.location.origin}/?pro=success`,
      cancel_url: `${window.location.origin}/?pro=cancel`,
    },
  })

  if (error) throw new Error(error.message)
  if (!data?.url) throw new Error('No checkout URL returned from Stripe')

  return data.url as string
}
