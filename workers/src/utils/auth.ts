import { Env, JWTPayload } from '../types';

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a SHA-256 hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Create a JWT token
 */
export async function createJWT(userId: number, email: string, env: Env, role: string = 'user'): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const expirationMinutes = parseInt(env.JWT_EXPIRATION_MINUTES || '1440');
  const now = Math.floor(Date.now() / 1000);
  
  const payload: JWTPayload = {
    sub: userId.toString(),
    email,
    role: role as 'user' | 'admin',
    exp: now + (expirationMinutes * 60),
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHMAC(signatureInput, env.JWT_SECRET);
  
  return `${signatureInput}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, env: Env): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await signHMAC(signatureInput, env.JWT_SECRET);
    
    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Sign data using HMAC-SHA256
 */
async function signHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get user ID from request
 */
export async function getUserIdFromRequest(request: Request, env: Env): Promise<number | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyJWT(token, env);
  if (!payload) return null;

  return parseInt(payload.sub);
}

/**
 * Check if user is admin
 */
export async function requireAdmin(userId: number, env: Env): Promise<boolean> {
  const user = await env.DB.prepare(
    'SELECT role FROM users WHERE id = ?'
  ).bind(userId).first();

  return user && (user as any).role === 'admin';
}
