import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { productId, storeId } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*, stores(*)')
      .eq('id', productId)
      .single()

    if (productError) throw productError

    // Get active subscribers
    const { data: subscribers, error: subscribersError } = await supabaseClient
      .from('newsletter_subscribers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (subscribersError) throw subscribersError

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscribers to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('newsletter_campaigns')
      .insert({
        store_id: storeId,
        product_id: productId,
        subject: `New Product: ${product.name}`,
        recipients_count: subscribers.length
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // Send emails using Resend
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:8080'
    
    for (const subscriber of subscribers) {
      const productUrl = `${baseUrl}/product/${product.id}`
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${subscriber.unsubscribe_token}`

      const emailHtml = generateProductEmailHTML(product, productUrl, unsubscribeUrl)

      // Queue email
      await supabaseClient.from('email_queue').insert({
        to_email: subscriber.email,
        subject: `New Product: ${product.name}`,
        html_content: emailHtml,
        campaign_id: campaign.id,
        status: 'pending'
      })

      // Send via Resend if API key is available
      if (RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'LuzonDev <noreply@luzondev.com>',
              to: [subscriber.email],
              subject: `New Product: ${product.name}`,
              html: emailHtml
            })
          })

          if (res.ok) {
            await supabaseClient
              .from('email_queue')
              .update({ status: 'sent' })
              .eq('to_email', subscriber.email)
              .eq('campaign_id', campaign.id)
          }
        } catch (error) {
          console.error('Error sending email:', error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Newsletter sent to ${subscribers.length} subscribers` 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function generateProductEmailHTML(product: any, productUrl: string, unsubscribeUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${product.name}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace, Arial, sans-serif; background-color: #0a0e1a; color: #e0e0e0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border: 1px solid #00c2ff33; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #00c2ff22 0%, #0066ff22 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00c2ff;">
                  <h1 style="margin: 0; color: #00c2ff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                    ${product.stores?.name || 'LUZONDEV'}
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #00c2ff99; font-size: 12px; letter-spacing: 1px;">
                    NEW PRODUCT AVAILABLE
                  </p>
                </td>
              </tr>
              ${product.image_url ? `
              <tr>
                <td style="padding: 0;">
                  <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: auto; display: block;">
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 30px;">
                  <h2 style="margin: 0 0 15px 0; color: #00c2ff; font-size: 24px;">
                    ${product.name}
                  </h2>
                  <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 14px; line-height: 1.6;">
                    ${product.description || 'Check out this new product!'}
                  </p>
                  <div style="margin: 20px 0; padding: 15px; background-color: #0a0e1a; border-left: 3px solid #00c2ff; border-radius: 4px;">
                    <p style="margin: 0; color: #00c2ff; font-size: 28px; font-weight: bold;">
                      $${product.price}
                    </p>
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${productUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #00c2ff 0%, #0066ff 100%); color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">
                          VIEW PRODUCT
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; background-color: #0a0e1a; border-top: 1px solid #00c2ff33; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #808080; font-size: 12px;">
                    You're receiving this because you subscribed to updates from ${product.stores?.name || 'this store'}.
                  </p>
                  <p style="margin: 0; color: #808080; font-size: 12px;">
                    <a href="${unsubscribeUrl}" style="color: #00c2ff; text-decoration: none;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}
