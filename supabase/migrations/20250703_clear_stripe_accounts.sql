-- Clear stale live-mode Stripe accounts so test-mode accounts can be created
UPDATE profiles 
SET stripe_account_id = NULL, 
    stripe_onboarding_status = 'not_started'
WHERE stripe_account_id IS NOT NULL;
