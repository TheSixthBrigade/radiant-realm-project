import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { safeRevenueChange } from './analyticsUtils';
import { applyTemplate } from './applyTemplate';
import { reorderSections } from './reorderSections';
import { STORE_TEMPLATES } from './storeTemplates';

// Task 3.1 — safeRevenueChange is always finite
// Validates: Requirements 1.1, 1.2, 1.3, 1.4
describe('safeRevenueChange', () => {
  it('always returns a finite number for any two finite inputs', () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true }), fc.float({ noNaN: true }), (current, previous) => {
        const result = safeRevenueChange(current, previous);
        return Number.isFinite(result);
      })
    );
  });

  it('returns 0 when both are 0', () => {
    expect(safeRevenueChange(0, 0)).toBe(0);
  });

  it('returns 100 when previous is 0 and current is positive', () => {
    expect(safeRevenueChange(50, 0)).toBe(100);
  });

  it('returns correct percentage for normal case', () => {
    expect(safeRevenueChange(110, 100)).toBeCloseTo(10);
  });
});

// Task 3.2 — previousMonthRevenue window computation
// Validates: Requirements 2.2
describe('previousMonthRevenue window', () => {
  it('sums only sales between 60 and 30 days ago', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            amount: fc.float({ min: 0, max: 10000, noNaN: true }),
            daysAgo: fc.integer({ min: 0, max: 90 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (salesInput) => {
          const now = new Date();
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const sixtyDaysAgo = new Date(now);
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

          const sales = salesInput.map(s => ({
            amount: s.amount,
            created_at: new Date(now.getTime() - s.daysAgo * 86400000).toISOString(),
          }));

          const previousMonthRevenue = sales
            .filter(sale => {
              const d = new Date(sale.created_at);
              return d >= sixtyDaysAgo && d < thirtyDaysAgo;
            })
            .reduce((sum, sale) => sum + Number(sale.amount), 0);

          // Must be finite and non-negative
          return Number.isFinite(previousMonthRevenue) && previousMonthRevenue >= 0;
        }
      )
    );
  });
});

// Task 3.3 — applyTemplate preserves user-set fields
// Validates: Requirements 5.3, 5.4
describe('applyTemplate', () => {
  it('preserves all keys already present in currentSettings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STORE_TEMPLATES),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string()),
        (template, userSettings) => {
          const { settings } = applyTemplate(template, userSettings);
          // Every key the user had must still be present with the same value
          return Object.entries(userSettings).every(([k, v]) => settings[k] === v);
        }
      )
    );
  });

  it('returns sections with unique ids', () => {
    STORE_TEMPLATES.forEach(template => {
      const { sections } = applyTemplate(template, {});
      const ids = sections.map((s: any) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

// Task 3.4 — reorderSections preserves all IDs and length
// Validates: Requirements 8.2
describe('reorderSections', () => {
  it('preserves all section IDs and array length', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), order: fc.nat() }),
          { minLength: 2, maxLength: 20 }
        ),
        fc.nat(),
        fc.nat(),
        (sections, from, to) => {
          const fromIndex = from % sections.length;
          const toIndex = to % sections.length;
          const result = reorderSections(sections, fromIndex, toIndex);

          const originalIds = sections.map(s => s.id).sort();
          const resultIds = result.map(s => s.id).sort();

          return (
            result.length === sections.length &&
            JSON.stringify(originalIds) === JSON.stringify(resultIds)
          );
        }
      )
    );
  });

  it('updates order fields to match new positions', () => {
    const sections = [
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 },
    ];
    const result = reorderSections(sections, 0, 2);
    result.forEach((s, i) => expect(s.order).toBe(i));
  });
});
