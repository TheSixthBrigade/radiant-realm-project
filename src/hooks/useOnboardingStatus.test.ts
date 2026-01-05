import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  isOnboardingComplete, 
  getCurrentOnboardingStep, 
  validateBusinessProfile 
} from './useOnboardingStatus';

// Helper to generate valid ISO date strings using integer timestamps
const validDateArbitrary = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(ts => new Date(ts).toISOString());

/**
 * Property 2: Onboarding Status Completeness Check
 * For any user profile, the is_fully_onboarded status SHALL be true if and only if:
 * tos_agreed_at is not null AND business_name is not null AND stripe_connect_status equals 'complete'.
 * 
 * Validates: Requirements 2.3, 2.5
 */
describe('Property 2: Onboarding Status Completeness Check', () => {
  // Arbitrary for profile data
  const profileArbitrary = fc.record({
    tos_agreed_at: fc.option(validDateArbitrary, { nil: null }),
    business_name: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    stripe_connect_status: fc.option(
      fc.constantFrom('pending', 'incomplete', 'complete'),
      { nil: null }
    ),
  });

  it('should return true only when all three conditions are met', () => {
    fc.assert(
      fc.property(profileArbitrary, (profile) => {
        const result = isOnboardingComplete(profile);
        
        const expectedComplete = 
          profile.tos_agreed_at !== null &&
          profile.business_name !== null &&
          profile.stripe_connect_status === 'complete';
        
        expect(result).toBe(expectedComplete);
      }),
      { numRuns: 100 }
    );
  });

  it('should return false when tos_agreed_at is null', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: null }),
        fc.constantFrom('pending', 'incomplete', 'complete', null),
        (business_name, stripe_connect_status) => {
          const profile = {
            tos_agreed_at: null,
            business_name,
            stripe_connect_status,
          };
          expect(isOnboardingComplete(profile)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false when business_name is null', () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.constantFrom('pending', 'incomplete', 'complete', null),
        (tos_agreed_at, stripe_connect_status) => {
          const profile = {
            tos_agreed_at,
            business_name: null,
            stripe_connect_status,
          };
          expect(isOnboardingComplete(profile)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false when stripe_connect_status is not complete', () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.string({ minLength: 1 }),
        fc.constantFrom('pending', 'incomplete', null),
        (tos_agreed_at, business_name, stripe_connect_status) => {
          const profile = {
            tos_agreed_at,
            business_name,
            stripe_connect_status,
          };
          expect(isOnboardingComplete(profile)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Onboarding Step Navigation
 * For any user with incomplete onboarding, the current step SHALL be the first incomplete step
 * in the sequence: TOS → Profile → Stripe.
 * 
 * Validates: Requirements 2.1, 2.4
 */
describe('Property 3: Onboarding Step Navigation', () => {
  it('should return tos when tos_agreed_at is null', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: null }),
        fc.constantFrom('pending', 'incomplete', 'complete', null),
        (business_name, stripe_connect_status) => {
          const profile = {
            tos_agreed_at: null,
            business_name,
            stripe_connect_status,
          };
          expect(getCurrentOnboardingStep(profile)).toBe('tos');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return profile when tos agreed but business_name is null', () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.constantFrom('pending', 'incomplete', 'complete', null),
        (tos_agreed_at, stripe_connect_status) => {
          const profile = {
            tos_agreed_at,
            business_name: null,
            stripe_connect_status,
          };
          expect(getCurrentOnboardingStep(profile)).toBe('profile');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return stripe when tos and profile complete but stripe not complete', () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.string({ minLength: 1 }),
        fc.constantFrom('pending', 'incomplete', null),
        (tos_agreed_at, business_name, stripe_connect_status) => {
          const profile = {
            tos_agreed_at,
            business_name,
            stripe_connect_status,
          };
          expect(getCurrentOnboardingStep(profile)).toBe('stripe');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return complete when all steps are done', () => {
    fc.assert(
      fc.property(
        validDateArbitrary,
        fc.string({ minLength: 1 }),
        (tos_agreed_at, business_name) => {
          const profile = {
            tos_agreed_at,
            business_name,
            stripe_connect_status: 'complete',
          };
          expect(getCurrentOnboardingStep(profile)).toBe('complete');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Business Profile Validation
 * For any business profile submission, the system SHALL reject submissions where
 * business_name is empty or business_description exceeds 500 characters.
 * 
 * Validates: Requirements 3.2, 3.5, 3.6
 */
describe('Property 4: Business Profile Validation', () => {
  it('should reject empty business names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n'),
        fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        (business_name, business_description) => {
          const result = validateBusinessProfile({ business_name, business_description });
          expect(result.valid).toBe(false);
          expect(result.errors.business_name).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject descriptions over 500 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 501, maxLength: 1000 }),
        (business_name, business_description) => {
          const result = validateBusinessProfile({ business_name, business_description });
          expect(result.valid).toBe(false);
          expect(result.errors.business_description).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid profiles with name and optional description', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        (business_name, business_description) => {
          const result = validateBusinessProfile({ business_name, business_description });
          expect(result.valid).toBe(true);
          expect(Object.keys(result.errors).length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept profiles without description', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (business_name) => {
          const result = validateBusinessProfile({ business_name });
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
