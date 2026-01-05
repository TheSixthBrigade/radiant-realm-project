import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_API');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log('Webhook event:', event.type);

    switch (event.type) {
      // Subscription created or updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const developerId = subscription.metadata?.developer_id;
        const tier = subscription.metadata?.tier;

        if (developerId && tier) {
          await supabase
            .from('developer_subscriptions')
            .update({
              tier: tier,
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('developer_id', developerId);

          console.log(`Updated subscription for ${developerId} to ${tier}`);
        }
        break;
      }

      // Subscription cancelled or expired
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const developerId = subscription.metadata?.developer_id;

        if (developerId) {
          await supabase
            .from('developer_subscriptions')
            .update({
              tier: 'free',
              stripe_subscription_id: null,
              current_period_end: null,
              updated_at: new Date().toISOString()
            })
            .eq('developer_id', developerId);

          console.log(`Cancelled subscription for ${developerId}`);
        }
        break;
      }

      // One-time payment completed (credits)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.type === 'credit_purchase') {
          const developerId = session.metadata.developer_id;
          const quantity = parseInt(session.metadata.credit_quantity || '0');

          if (developerId && quantity > 0) {
            // Add credits
            const { data: current } = await supabase
              .from('obfuscation_credits')
              .select('credits')
              .eq('developer_id', developerId)
              .maybeSingle();

            const newCredits = (current?.credits || 0) + quantity;

            await supabase
              .from('obfuscation_credits')
              .upsert({
                developer_id: developerId,
                credits: newCredits,
                updated_at: new Date().toISOString()
              }, { onConflict: 'developer_id' });

            console.log(`Added ${quantity} credits for ${developerId}, total: ${newCredits}`);
          }
        }

        // Handle subscription checkout completion
        if (session.mode === 'subscription' && session.metadata?.developer_id) {
          const developerId = session.metadata.developer_id;
          const tier = session.metadata.tier;

          if (tier) {
            await supabase
              .from('developer_subscriptions')
              .update({
                tier: tier,
                updated_at: new Date().toISOString()
              })
              .eq('developer_id', developerId);

            console.log(`Checkout completed: ${developerId} upgraded to ${tier}`);
          }
        }
        break;
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const developerId = subscription.metadata?.developer_id;

          if (developerId) {
            console.log(`Payment failed for ${developerId}`);
            // Could send notification here
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }
});
