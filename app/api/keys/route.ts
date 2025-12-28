import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-auth';
import { ApiKey } from '@/types';

const CreateKeySchema = z.object({
  name: z.string().min(1).max(50),
});

// GET /api/keys - List user's API keys
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Transform to ApiKey type
    const apiKeys: ApiKey[] = (keys || []).map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : null,
      createdAt: new Date(key.created_at),
    }));

    return NextResponse.json({ keys: apiKeys });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parseResult = CreateKeySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: `Validation error: ${parseResult.error.issues[0]?.message}` },
        { status: 400 }
      );
    }

    const { name } = parseResult.data;

    // Generate the API key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);
    const keyPrefix = getKeyPrefix(plainKey);
    const keyId = uuidv4();
    const now = new Date().toISOString();

    // Use admin client to bypass RLS for insert with explicit user_id
    const adminSupabase = getSupabaseAdmin();
    const { error: insertError } = await adminSupabase
      .from('api_keys')
      .insert({
        id: keyId,
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_at: now,
      });

    if (insertError) {
      console.error('Failed to create API key:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Return the plain key (only time it's shown)
    return NextResponse.json({
      id: keyId,
      name,
      key: plainKey, // This is the only time the full key is returned
      keyPrefix,
      createdAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
