/**
 * VECTABASE SECURITY MIDDLEWARE
 * Enterprise-grade security utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';

// ============================================
// CONSTANTS
// ============================================

const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;
const MASTER_ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY || process.env.DB_PASSWORD || 'default-key-change-me';

// Rate limit configs per endpoint type
const RATE_LIMITS: Record<string, { max: number; windowSec: number }> = {
    'auth': { max: 10, windowSec: 60 },      // 10 auth attempts per minute
    'api': { max: 100, windowSec: 60 },      // 100 API calls per minute
    'vault': { max: 30, windowSec: 60 },     // 30 vault operations per minute
    'admin': { max: 50, windowSec: 60 },     // 50 admin actions per minute
    'default': { max: 200, windowSec: 60 },  // 200 requests per minute default
};

// ============================================
// ENCRYPTION UTILITIES
// ============================================

export function encrypt(plaintext: string, key?: string): string {
    const encKey = key || MASTER_ENCRYPTION_KEY;
    const iv = crypto.randomBytes(12);
    const keyBuffer = crypto.createHash('sha256').update(encKey).digest();
    
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string, key?: string): string | null {
    try {
        const encKey = key || MASTER_ENCRYPTION_KEY;
        const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const keyBuffer = crypto.createHash('sha256').update(encKey).digest();
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

// Hash sensitive data for storage
export function hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

// Generate secure random token
export function generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
}

// ============================================
// RATE LIMITING
// ============================================

export async function checkRateLimit(
    identifier: string,
    identifierType: 'ip' | 'user' | 'api_key',
    endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
    
    try {
        const result = await query(
            `SELECT check_rate_limit($1, $2, $3, $4, $5) as allowed`,
            [identifier, identifierType, endpoint, config.max, config.windowSec]
        );
        
        return {
            allowed: result.rows[0]?.allowed ?? true,
            remaining: config.max, // Simplified
            resetAt: new Date(Date.now() + config.windowSec * 1000)
        };
    } catch (error) {
        // Fail open but log
        console.error('Rate limit check failed:', error);
        return { allowed: true, remaining: config.max, resetAt: new Date() };
    }
}

// ============================================
// AUTHENTICATION
// ============================================

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    provider?: string;
}

export async function verifyAuth(req: NextRequest): Promise<{ user: AuthUser | null; error?: string }> {
    if (!JWT_SECRET) {
        return { user: null, error: 'JWT_SECRET not configured' };
    }

    const token = req.cookies.get('pqc_session')?.value;
    
    if (!token) {
        return { user: null, error: 'No session token' };
    }
    
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        
        // Validate session in database
        const sessionResult = await query(
            `SELECT s.*, u.email, u.name 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.token_hash = $1 AND NOT s.is_revoked AND s.expires_at > NOW()`,
            [hashValue(token)]
        );
        
        if (sessionResult.rows.length === 0) {
            // Fallback to JWT-only validation for backwards compatibility
            return {
                user: {
                    id: payload.id as number,
                    email: payload.email as string,
                    name: payload.name as string,
                    provider: payload.provider as string
                }
            };
        }
        
        const session = sessionResult.rows[0];
        
        // Update last activity
        await query(
            `UPDATE sessions SET last_activity = NOW() WHERE id = $1`,
            [session.id]
        );
        
        return {
            user: {
                id: session.user_id,
                email: session.email,
                name: session.name
            }
        };
    } catch (error) {
        return { user: null, error: 'Invalid token' };
    }
}

// Create new JWT token
export async function createAuthToken(user: AuthUser, expiresIn: string = '7d'): Promise<string> {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }

    return new SignJWT({
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(JWT_SECRET);
}

// ============================================
// FAILED LOGIN PROTECTION
// ============================================

export async function recordFailedLogin(
    email: string,
    ip: string,
    reason: string = 'invalid_credentials'
): Promise<boolean> {
    try {
        const result = await query(
            `SELECT record_failed_login($1, $2::inet, NULL, $3) as is_locked`,
            [email, ip, reason]
        );
        return result.rows[0]?.is_locked ?? false;
    } catch (error) {
        console.error('Failed to record failed login:', error);
        return false;
    }
}

export async function isLoginAllowed(email: string, ip: string): Promise<boolean> {
    try {
        const result = await query(
            `SELECT is_login_allowed($1, $2::inet) as allowed`,
            [email, ip]
        );
        return result.rows[0]?.allowed ?? true;
    } catch (error) {
        console.error('Failed to check login status:', error);
        return true; // Fail open
    }
}

export async function clearFailedLogins(email: string, ip: string): Promise<void> {
    try {
        await query(`SELECT clear_failed_logins($1, $2::inet)`, [email, ip]);
    } catch (error) {
        console.error('Failed to clear failed logins:', error);
    }
}

// ============================================
// AUDIT LOGGING
// ============================================

export async function logSecurityEvent(
    eventType: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    projectId?: number,
    oldValues?: object,
    newValues?: object,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
): Promise<void> {
    try {
        await query(
            `SELECT log_security_event($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                eventType,
                action,
                resourceType || null,
                resourceId || null,
                projectId || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                riskLevel
            ]
        );
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
}

// ============================================
// PROJECT ACCESS CONTROL
// ============================================

export async function setUserContext(userId: number): Promise<void> {
    try {
        await query(`SET LOCAL app.current_user_id = $1`, [userId.toString()]);
    } catch (error) {
        console.error('Failed to set user context:', error);
    }
}

export async function checkProjectAccess(projectId: number, userId: number): Promise<boolean> {
    try {
        const result = await query(
            `SELECT user_has_project_access($1, $2) as has_access`,
            [projectId, userId]
        );
        return result.rows[0]?.has_access ?? false;
    } catch (error) {
        console.error('Failed to check project access:', error);
        return false;
    }
}

// ============================================
// INPUT SANITIZATION
// ============================================

export function sanitizeInput(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 10000);
    
    return sanitized;
}

export function sanitizeSqlIdentifier(identifier: string): string {
    // Only allow alphanumeric and underscores
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

// ============================================
// SECURITY HEADERS
// ============================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
    
    return response;
}

// ============================================
// CSRF PROTECTION
// ============================================

export function generateCsrfToken(): string {
    return generateSecureToken(32);
}

export function verifyCsrfToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    
    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(token),
            Buffer.from(storedToken)
        );
    } catch {
        return false;
    }
}
