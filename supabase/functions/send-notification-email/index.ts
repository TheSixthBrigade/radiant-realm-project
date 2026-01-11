import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailPayload {
  type: 'version_release' | 'review_response' | 'affiliate_sale' | 'purchase_confirmation'
  product_id?: string
  user_id?: string
  data?: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload: EmailPayload = await req.json()
    const { type, product_id, user_id, data } = payload

    // Get recipients based on notification type
    let recipients: { email: string; user_id: string }[] = []
    let subject = ''
    let htmlContent = ''

    if (type === 'version_release' && product_id) {
      // Get all buyers who have email notifications enabled
      const { data: product } = await supabase
        .from('products')
        .select('title, creator:profiles!creator_id(username)')
        .eq('id', product_id)
        .single()

      // Get buyers with notifications enabled
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('product_id', product_id)
        .eq('email_enabled', true)

      if (prefs && prefs.length > 0) {
        const userIds = prefs.map(p => p.user_id)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        recipients = users?.map(u => ({ email: u.email, user_id: u.id })) || []
      }

      subject = `New version of ${product?.title} is available!`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">New Version Released! 🎉</h1>
          <p>A new version of <strong>${product?.title}</strong> is now available.</p>
          ${data?.version_number ? `<p><strong>Version:</strong> ${data.version_number}</p>` : ''}
          ${data?.changelog ? `
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin-top: 0;">What's New:</h3>
              <p style="white-space: pre-wrap;">${data.changelog}</p>
            </div>
          ` : ''}
          <a href="${data?.download_url || '#'}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Download Now
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
            You're receiving this because you purchased this product. 
            <a href="${data?.unsubscribe_url || '#'}">Unsubscribe</a>
          </p>
        </div>
      `
    } else if (type === 'review_response' && user_id) {
      // Get the user who left the review
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user_id)
        .single()

      if (user?.email) {
        recipients = [{ email: user.email, user_id }]
      }

      subject = `The seller responded to your review`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Seller Response</h1>
          <p>The seller of <strong>${data?.product_name}</strong> has responded to your review:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #8b5cf6;">
            <p style="margin: 0; white-space: pre-wrap;">${data?.response}</p>
          </div>
          <a href="${data?.product_url || '#'}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            View Product
          </a>
        </div>
      `
    } else if (type === 'affiliate_sale' && user_id) {
      // Get the affiliate
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user_id)
        .single()

      if (user?.email) {
        recipients = [{ email: user.email, user_id }]
      }

      subject = `You earned a commission! 💰`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Commission Earned! 🎉</h1>
          <p>Great news! Someone made a purchase through your affiliate link.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Product:</strong> ${data?.product_name}</p>
            <p><strong>Commission:</strong> $${data?.commission_amount?.toFixed(2)}</p>
            <p><strong>Total Earnings:</strong> $${data?.total_earnings?.toFixed(2)}</p>
          </div>
          <a href="${data?.dashboard_url || '#'}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            View Dashboard
          </a>
        </div>
      `
    } else if (type === 'purchase_confirmation' && user_id) {
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user_id)
        .single()

      if (user?.email) {
        recipients = [{ email: user.email, user_id }]
      }

      subject = `Your purchase confirmation`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Thank you for your purchase! 🎉</h1>
          <p>Your order has been confirmed.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Product:</strong> ${data?.product_name}</p>
            <p><strong>Amount:</strong> $${data?.amount?.toFixed(2)}</p>
            ${data?.license_key ? `<p><strong>License Key:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${data.license_key}</code></p>` : ''}
          </div>
          <a href="${data?.download_url || '#'}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Download Now
          </a>
        </div>
      `
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send emails via Resend
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Vectabase <support@vectabase.com>',
            to: recipient.email,
            subject,
            html: htmlContent,
          }),
        })

        const result = await res.json()
        return { success: res.ok, email: recipient.email, result }
      } catch (err) {
        return { success: false, email: recipient.email, error: err.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: recipients.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
