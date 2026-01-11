import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface ContactEmailPayload {
  to: string
  from_name: string
  from_email: string
  phone?: string
  message: string
  store_name: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: ContactEmailPayload = await req.json()
    const { to, from_name, from_email, phone, message, store_name } = payload

    if (!to || !from_name || !from_email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const subject = `New Contact Form Message from ${store_name}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">New Contact Form Submission</h1>
        <p>You received a new message from your store contact form.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${from_name}</p>
          <p style="margin: 0 0 12px 0;"><strong>Email:</strong> <a href="mailto:${from_email}">${from_email}</a></p>
          ${phone ? `<p style="margin: 0 0 12px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="margin: 0;"><strong>Message:</strong></p>
          <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${message}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
          This message was sent via your ${store_name} contact form on Vectabase.
        </p>
      </div>
    `

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vectabase Contact <noreply@vectabase.com>',
        to: to,
        reply_to: from_email,
        subject,
        html: htmlContent,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', result)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Contact email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
