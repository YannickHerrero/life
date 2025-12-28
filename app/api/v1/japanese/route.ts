import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  validateApiKey,
  checkRateLimit,
  updateLastUsed,
} from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { JapaneseActivityType, today } from '@/types';

// Request validation schema
const JapaneseActivitySchema = z.object({
  type: z.enum(['flashcards', 'reading', 'watching', 'listening']),
  durationMinutes: z.number().int().positive().max(480),
  newCards: z.number().int().nonnegative().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

type JapaneseActivityRequest = z.infer<typeof JapaneseActivitySchema>;

function jsonError(message: string, code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: message, code },
    { status, headers }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError('Missing or invalid Authorization header', 'UNAUTHORIZED', 401);
    }

    const apiKey = authHeader.substring(7);

    // Validate API key
    const keyValidation = await validateApiKey(apiKey);
    if (!keyValidation) {
      return jsonError('Invalid API key', 'UNAUTHORIZED', 401);
    }

    // Check rate limit
    const rateLimit = checkRateLimit(keyValidation.keyId);
    if (!rateLimit.allowed) {
      return jsonError(
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.retryAfterMs ?? 0) / 1000)} seconds`,
        'RATE_LIMITED',
        429,
        {
          'Retry-After': String(Math.ceil((rateLimit.retryAfterMs ?? 0) / 1000)),
          'X-RateLimit-Remaining': '0',
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 'VALIDATION_ERROR', 400);
    }

    const parseResult = JapaneseActivitySchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return jsonError(`Validation error: ${errors.join(', ')}`, 'VALIDATION_ERROR', 400);
    }

    const data: JapaneseActivityRequest = parseResult.data;

    // Validate type-specific fields
    if (data.type !== 'flashcards' && data.newCards !== undefined) {
      return jsonError('newCards is only valid for flashcards type', 'VALIDATION_ERROR', 400);
    }

    const supabase = getSupabaseAdmin();
    const activityDate = data.date || today();
    let bookId: string | null = null;

    // For reading type, find the last read book
    if (data.type === JapaneseActivityType.READING) {
      // Find the most recent reading activity with a book
      const { data: lastReading } = await supabase
        .from('japanese_activities')
        .select('book_id')
        .eq('user_id', keyValidation.userId)
        .eq('type', 'reading')
        .not('book_id', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastReading?.book_id) {
        bookId = lastReading.book_id;

        // Also update the book's total reading time
        const { data: book } = await supabase
          .from('books')
          .select('total_reading_time_minutes')
          .eq('id', bookId)
          .single();

        if (book) {
          await supabase
            .from('books')
            .update({
              total_reading_time_minutes: (book.total_reading_time_minutes || 0) + data.durationMinutes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookId);
        }
      }
    }

    // Insert the activity
    const activityId = uuidv4();
    const now = new Date().toISOString();

    const { error: insertError } = await supabase
      .from('japanese_activities')
      .insert({
        id: activityId,
        user_id: keyValidation.userId,
        type: data.type,
        duration_minutes: data.durationMinutes,
        new_cards: data.type === 'flashcards' ? (data.newCards ?? null) : null,
        book_id: bookId,
        date: activityDate,
        created_at: now,
        updated_at: now,
      });

    if (insertError) {
      console.error('Failed to insert activity:', insertError);
      return jsonError('Failed to create activity', 'SERVER_ERROR', 500);
    }

    // Update last used timestamp (fire and forget)
    updateLastUsed(keyValidation.keyId).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        id: activityId,
        bookId: bookId,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return jsonError('Internal server error', 'SERVER_ERROR', 500);
  }
}
