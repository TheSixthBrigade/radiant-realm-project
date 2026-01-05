// Response helpers for Developer API

import { ApiResponse, ApiError, ERROR_CODES } from './types.ts'
import { RateLimitResult, getRateLimitHeaders } from './rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function generateRequestId(): string {
  return 'req_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function successResponse<T>(
  data: T,
  status = 200,
  rateLimit?: RateLimitResult
): Response {
  const requestId = generateRequestId();
  const body: ApiResponse<T> = {
    success: true,
    data,
    request_id: requestId
  };

  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  if (rateLimit) {
    Object.assign(headers, getRateLimitHeaders(rateLimit));
  }

  return new Response(JSON.stringify(body), { status, headers });
}

export function errorResponse(
  code: keyof typeof ERROR_CODES,
  message: string,
  status: number,
  details?: Record<string, string>,
  rateLimit?: RateLimitResult
): Response {
  const requestId = generateRequestId();
  const error: ApiError = {
    code: ERROR_CODES[code],
    message,
    ...(details && { details })
  };

  const body: ApiResponse = {
    success: false,
    error,
    request_id: requestId
  };

  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  if (rateLimit) {
    Object.assign(headers, getRateLimitHeaders(rateLimit));
  }

  return new Response(JSON.stringify(body), { status, headers });
}

export function corsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}

// Common error responses
export const unauthorized = (rateLimit?: RateLimitResult) =>
  errorResponse('UNAUTHORIZED', 'Invalid or missing API key', 401, undefined, rateLimit);

export const rateLimited = (rateLimit: RateLimitResult) =>
  errorResponse('RATE_LIMITED', 'Too many requests', 429, undefined, rateLimit);

export const notFound = (resource: string, rateLimit?: RateLimitResult) =>
  errorResponse('NOT_FOUND', `${resource} not found`, 404, undefined, rateLimit);

export const badRequest = (message: string, details?: Record<string, string>, rateLimit?: RateLimitResult) =>
  errorResponse('INVALID_REQUEST', message, 400, details, rateLimit);

export const serverError = (rateLimit?: RateLimitResult) =>
  errorResponse('INTERNAL_ERROR', 'Internal server error', 500, undefined, rateLimit);
