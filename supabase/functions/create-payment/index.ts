import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    const { product_id, amount, currency, success_url, cancel_url } = await req.json();

    if (!product_id) {
      throw new Error("Product ID is required");
    }

    // Fetch product details with creator info
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select(`
        *,
        profiles!creator_id (
          stripe_connect_account_id,
          stripe_connect_status,
          display_name
        )
      `)
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Check if creator has Stripe Connect set up
    const creatorProfile = product.profiles;
    if (!creatorProfile?.stripe_connect_account_id || creatorProfile.stripe_connect_status !== 'connected') {
      throw new Error("Seller has not set up Stripe payments");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate platform fee (5%)
    const amountCents = Math.round((amount || product.price) * 100); // Convert to cents
    const platformFee = Math.round(amountCents * 0.05); // 5% platform fee
    const sellerAmount = amountCents - platformFee;

    // Create checkout session - simplified like Payhip
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: product.title,
              description: product.description || `Digital asset from ${creatorProfile.display_name || 'LuzonDev'}`,
              images: product.image_url ? [product.image_url] : [],
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: success_url || `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&product_id=${product.id}`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/product/${product.id}`,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorProfile.stripe_connect_account_id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        productId: product.id,
        sellerId: product.creator_id,
        buyerId: user.id,
      },
    });

    // Don't try to store anything in database for now - just process payment
    console.log('Payment session created successfully:', session.id);

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});