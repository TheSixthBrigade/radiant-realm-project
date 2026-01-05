// Validation utilities for Developer API

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRequired(
  data: Record<string, unknown>,
  fields: string[]
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = 'Required';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number }
): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Must be a number';
  }

  if (options?.min !== undefined && value < options.min) {
    return `Must be at least ${options.min}`;
  }

  if (options?.max !== undefined && value > options.max) {
    return `Must be at most ${options.max}`;
  }

  return null;
}

export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): string | null {
  if (typeof value !== 'string') {
    return 'Must be a string';
  }

  const trimmed = value.trim();

  if (options?.minLength !== undefined && trimmed.length < options.minLength) {
    return `Must be at least ${options.minLength} characters`;
  }

  if (options?.maxLength !== undefined && trimmed.length > options.maxLength) {
    return `Must be at most ${options.maxLength} characters`;
  }

  if (options?.pattern && !options.pattern.test(trimmed)) {
    return 'Invalid format';
  }

  return null;
}

export function validateDate(
  value: unknown,
  fieldName: string,
  options?: { mustBeFuture?: boolean; mustBePast?: boolean }
): string | null {
  if (typeof value !== 'string') {
    return 'Must be a date string';
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Invalid date format';
  }

  const now = new Date();

  if (options?.mustBeFuture && date <= now) {
    return 'Must be a future date';
  }

  if (options?.mustBePast && date >= now) {
    return 'Must be a past date';
  }

  return null;
}

export function validateUUID(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'Must be a string';
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    return 'Invalid UUID format';
  }

  return null;
}

export function validateDiscordId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'Must be a string';
  }

  // Discord IDs are 17-19 digit numbers
  if (!/^\d{17,19}$/.test(value)) {
    return 'Invalid Discord ID format';
  }

  return null;
}

export function validateRobloxId(value: unknown): string | null {
  if (typeof value !== 'number') {
    return 'Must be a number';
  }

  if (!Number.isInteger(value) || value < 1) {
    return 'Must be a positive integer';
  }

  return null;
}

// Parse and validate JSON body
export async function parseBody<T>(req: Request): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return { data: null, error: 'Request body is empty' };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON' };
  }
}
