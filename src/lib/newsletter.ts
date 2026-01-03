import { supabase } from '@/integrations/supabase/client';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  store_id: string;
  subscribed_at: string;
  is_active: boolean;
  unsubscribe_token: string;
}

export interface NewsletterCampaign {
  id: string;
  store_id: string;
  product_id: string;
  subject: string;
  sent_at: string;
  recipients_count: number;
}

// Subscribe to newsletter
export async function subscribeToNewsletter(email: string, storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('newsletter_subscribers')
      .insert({
        email,
        store_id: storeId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, message: 'You are already subscribed to this newsletter.' };
      }
      throw error;
    }

    return { success: true, message: 'Successfully subscribed! You will receive updates about new products.' };
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return { success: false, message: 'Failed to subscribe. Please try again.' };
  }
}

// Unsubscribe from newsletter
export async function unsubscribeFromNewsletter(token: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await (supabase as any)
      .from('newsletter_subscribers')
      .update({ is_active: false })
      .eq('unsubscribe_token', token);

    if (error) throw error;

    return { success: true, message: 'Successfully unsubscribed from newsletter.' };
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return { success: false, message: 'Failed to unsubscribe. Please try again.' };
  }
}

// Get subscribers for a store
export async function getStoreSubscribers(storeId: string): Promise<NewsletterSubscriber[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('newsletter_subscribers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return (data || []) as NewsletterSubscriber[];
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }
}

// Send new product notification
export async function sendNewProductNotification(productId: string, storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, stores(*)')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    // Get active subscribers
    const subscribers = await getStoreSubscribers(storeId);

    if (subscribers.length === 0) {
      return { success: true, message: 'No subscribers to notify.' };
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('newsletter_campaigns')
      .insert({
        store_id: storeId,
        product_id: productId,
        subject: `New Product: ${product.title || product.name}`,
        recipients_count: subscribers.length
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Queue emails for each subscriber
    const emailPromises = subscribers.map(subscriber => 
      queueEmail(
        subscriber.email,
        `New Product: ${product.title || product.name}`,
        generateProductEmailHTML(product, subscriber.unsubscribe_token),
        campaign.id
      )
    );

    await Promise.all(emailPromises);

    return { 
      success: true, 
      message: `Newsletter sent to ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}.` 
    };
  } catch (error) {
    console.error('Error sending newsletter:', error);
    return { success: false, message: 'Failed to send newsletter.' };
  }
}

// Queue email for sending
async function queueEmail(toEmail: string, subject: string, htmlContent: string, campaignId?: string) {
  try {
    const { error } = await (supabase as any)
      .from('email_queue')
      .insert({
        to_email: toEmail,
        subject,
        html_content: htmlContent,
        campaign_id: campaignId,
        status: 'pending'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error queuing email:', error);
  }
}

// Generate product email HTML
function generateProductEmailHTML(product: any, unsubscribeToken: string): string {
  const baseUrl = window.location.origin;
  const productUrl = `${baseUrl}/product/${product.id}`;
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;
  const productName = product.title || product.name;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${productName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace, Arial, sans-serif; background-color: #0a0e1a; color: #e0e0e0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border: 1px solid #00c2ff33; border-radius: 8px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #00c2ff22 0%, #0066ff22 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00c2ff;">
                  <h1 style="margin: 0; color: #00c2ff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                    ${(product.stores as any)?.name || 'VECTABSE'}
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #00c2ff99; font-size: 12px; letter-spacing: 1px;">
                    NEW PRODUCT AVAILABLE
                  </p>
                </td>
              </tr>
              
              <!-- Product Image -->
              ${product.image_url ? `
              <tr>
                <td style="padding: 0;">
                  <img src="${product.image_url}" alt="${productName}" style="width: 100%; height: auto; display: block;">
                </td>
              </tr>
              ` : ''}
              
              <!-- Product Details -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="margin: 0 0 15px 0; color: #00c2ff; font-size: 24px;">
                    ${productName}
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
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; background-color: #0a0e1a; border-top: 1px solid #00c2ff33; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #808080; font-size: 12px;">
                    You're receiving this because you subscribed to updates from ${(product.stores as any)?.name || 'this store'}.
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
  `;
}
