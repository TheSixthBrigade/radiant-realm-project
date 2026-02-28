# Tasks

## Part 1 — Analytics Fix

- [x] 1.1 Add `sales` table types to `src/integrations/supabase/types.ts` so queries are type-safe (removes `(supabase as any)` casts)
- [x] 1.2 Implement `safeRevenueChange(current, previous)` pure function in a shared utils file (handles 0/0, 0/positive, positive/0 cases without NaN/Infinity)
- [x] 1.3 Update `useCreatorStats` hook to:
  - Query `sales` filtered by `seller_id = user.id` (direct filter, no product join needed)
  - Return `previousMonthRevenue` (sum of sales in the prior 30-day window)
  - Show a toast on network error
- [x] 1.4 Update `Dashboard.tsx` stat cards to use `safeRevenueChange` and only render the change badge when `previousPeriodRevenue > 0`
- [x] 1.5 Update `StoreAnalytics.tsx` to use `safeRevenueChange` and remove `(supabase as any)` cast
- [x] 1.6 Wire Supabase realtime subscriptions in `useCreatorStats` for `sales` INSERT and `products` UPDATE events

## Part 2 — Store Builder Polish

- [x] 2.1 Define `StoreTemplate` interface and implement 6 built-in templates (Dark Violet, Midnight Blue, Minimal Light, Neon Green, Crimson, Forest) with default sections and style settings
- [x] 2.2 Add template picker UI to `UserSite.tsx` — shown when `page_sections` is empty; applies template on selection via `applyTemplate(template, currentSettings)`
- [x] 2.3 Implement `applyTemplate` utility that merges template defaults without overwriting existing user customisations
- [ ] 2.4 Refactor `PageBuilderSidebar.tsx` into four tabs: Pages, Sections, Style, Settings
  - Split large file into per-section editor sub-components to reduce bundle size
- [x] 2.5 Add mobile/tablet/desktop preview toggle to the editor toolbar in `UserSite.tsx`; constrain preview panel width to 375px / 768px / 100% accordingly
- [ ] 2.6 Fully implement stub section renderers: `TestimonialsSection`, `NewsletterSection`, `ContactSection`, `TextBlockSection`, `ImageSection`, `ImageWithTextSection`
  - Each must implement `SectionRendererProps` interface
  - `ContactSection` must include 60-second client-side rate limiting
- [ ] 2.7 Polish existing section renderers: `HeroSection` (full-screen option, CTA), `SlideshowSection` (auto-play, dots, arrows), `FooterSection` (social links, copyright)
- [x] 2.8 Disable buy buttons with tooltip when seller `stripe_connect_status` is not `'complete'` or `'connected'`
- [x] 2.9 Add "Add your first product" CTA to `ProductGridSection` when the products array is empty
- [x] 2.10 Ensure drag-and-drop section reordering works via `@dnd-kit/sortable` in the Sections tab; implement `reorderSections(sections, fromIndex, toIndex)` utility
- [x] 2.11 Harden save flow in `UserSite.tsx`: guard with `isOwner` check, show "Saved!" toast on success, show error toast with retained state on failure
- [ ] 2.12 Ensure all five page types (Home, About, Roadmap, Community, TOS) are editable and renderable; add lock icon + upgrade prompt for Pro-gated pages

## Part 3 — Tests

- [x] 3.1 Write property tests for `safeRevenueChange` using fast-check — assert result is always finite for any two numbers (covers Requirements 1.1–1.4)
- [x] 3.2 Write property test for `previousMonthRevenue` computation — generate random sales arrays with timestamps and verify the 30-day window sum (covers Requirement 2.2)
- [x] 3.3 Write property test for `applyTemplate` — generate random existing settings and any template, assert user-set fields are preserved (covers Requirements 5.3, 5.4)
- [x] 3.4 Write property test for `reorderSections` — generate random section arrays and indices, assert same IDs and length (covers Requirement 8.2)
- [ ] 3.5 Write property test for save guard — assert `supabase.update` is never called when `isOwner` is false (covers Requirement 9.4)
- [ ] 3.6 Write unit tests for section renderers — snapshot/render test each section type with mock data; test `ProductGridSection` empty state and `ContactSection` rate limiting
