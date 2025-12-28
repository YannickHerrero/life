import { getSupabaseAdmin } from './supabase-admin';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

// In-memory rate limit store (resets on server restart)
// For production with multiple instances, use Redis instead
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(keyId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(keyId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(keyId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

export interface ApiKeyValidation {
  userId: string;
  keyId: string;
}

export async function validateApiKey(
  apiKey: string
): Promise<ApiKeyValidation | null> {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  // Hash the key and look it up
  const keyHash = await hashApiKey(apiKey);

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    keyId: data.id,
  };
}

export async function updateLastUsed(keyId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}

// Generate a new API key
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Hash an API key for storage
// Using SHA-256 for simplicity (bcrypt would be more secure but slower)
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Get the prefix for display (first 8 chars including sk_)
export function getKeyPrefix(key: string): string {
  return key.substring(0, 8) + '...';
}
