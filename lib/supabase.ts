import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton client for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Database table names (matching Supabase schema)
export const Tables = {
  BOOKS: 'books',
  JAPANESE_ACTIVITIES: 'japanese_activities',
  FOODS: 'foods',
  MEAL_ENTRIES: 'meal_entries',
  SPORT_ACTIVITIES: 'sport_activities',
  WEIGHT_ENTRIES: 'weight_entries',
} as const;

// Type mapping from local camelCase to Supabase snake_case
export function toSupabaseRecord<T extends Record<string, unknown>>(
  record: T
): Record<string, unknown> {
  const snakeCase: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const snakeKey = key
      .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      .replace(/([a-z])(\d)/g, '$1_$2');
    // Convert Date to ISO string
    if (value instanceof Date) {
      snakeCase[snakeKey] = value.toISOString();
    } else {
      snakeCase[snakeKey] = value;
    }
  }
  return snakeCase;
}

export function fromSupabaseRecord<T>(record: Record<string, unknown>): T {
  const camelCase: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const camelKey = key
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/_(\d)/g, '$1');
    // Convert date strings back to Date objects for known date fields
    if (
      (camelKey === 'createdAt' || camelKey === 'updatedAt' || camelKey === 'deletedAt' || camelKey === 'startedAt' || camelKey === 'completedAt') &&
      typeof value === 'string'
    ) {
      camelCase[camelKey] = new Date(value);
    } else {
      camelCase[camelKey] = value;
    }
  }
  return camelCase as T;
}
