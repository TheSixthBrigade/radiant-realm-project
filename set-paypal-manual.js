import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setPayPal() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('Not logged in')
    return
  }

  // Update profile
  const { data, error } = await supabase
    .from('profiles')
    .update({
      paypal_email: 'thecheeseemanatgou@gmail.com',
      paypal_onboarding_status: 'completed',
      paypal_user_id: 'verified_manual'
    })
    .eq('user_id', user.id)
    .select()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ PayPal set successfully!', data)
  }
}

setPayPal()
