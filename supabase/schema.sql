-- Life App - Supabase Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- ============================================
-- TABLES
-- ============================================

-- Japanese Activities
create table if not exists japanese_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('flashcards', 'reading', 'watching', 'listening')),
  duration_minutes integer not null check (duration_minutes > 0),
  new_cards integer check (new_cards >= 0),
  date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- Foods
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  calories_per_100g numeric not null check (calories_per_100g >= 0),
  protein_per_100g numeric not null check (protein_per_100g >= 0),
  carbs_per_100g numeric not null check (carbs_per_100g >= 0),
  fat_per_100g numeric not null check (fat_per_100g >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- Meal Entries
create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  food_id uuid references foods(id) on delete cascade not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  quantity_grams numeric not null check (quantity_grams > 0),
  date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- Sport Activities
create table if not exists sport_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sport_type text not null check (sport_type in ('running', 'street_workout', 'bike')),
  duration_minutes integer not null check (duration_minutes > 0),
  distance_km numeric check (distance_km > 0),
  training_type text check (training_type in ('base', 'intervals', 'long_run')),
  date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

-- Weight Entries
create table if not exists weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  weight_kg numeric not null check (weight_kg > 0 and weight_kg < 500),
  date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz,
  unique(user_id, date)
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_japanese_activities_user_date on japanese_activities(user_id, date);
create index if not exists idx_japanese_activities_updated on japanese_activities(updated_at);

create index if not exists idx_foods_user on foods(user_id);
create index if not exists idx_foods_updated on foods(updated_at);

create index if not exists idx_meal_entries_user_date on meal_entries(user_id, date);
create index if not exists idx_meal_entries_updated on meal_entries(updated_at);

create index if not exists idx_sport_activities_user_date on sport_activities(user_id, date);
create index if not exists idx_sport_activities_updated on sport_activities(updated_at);

create index if not exists idx_weight_entries_user_date on weight_entries(user_id, date);
create index if not exists idx_weight_entries_updated on weight_entries(updated_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table japanese_activities enable row level security;
alter table foods enable row level security;
alter table meal_entries enable row level security;
alter table sport_activities enable row level security;
alter table weight_entries enable row level security;

-- Japanese Activities policies
create policy "Users can view own japanese_activities"
  on japanese_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own japanese_activities"
  on japanese_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own japanese_activities"
  on japanese_activities for update
  using (auth.uid() = user_id);

create policy "Users can delete own japanese_activities"
  on japanese_activities for delete
  using (auth.uid() = user_id);

-- Foods policies
create policy "Users can view own foods"
  on foods for select
  using (auth.uid() = user_id);

create policy "Users can insert own foods"
  on foods for insert
  with check (auth.uid() = user_id);

create policy "Users can update own foods"
  on foods for update
  using (auth.uid() = user_id);

create policy "Users can delete own foods"
  on foods for delete
  using (auth.uid() = user_id);

-- Meal Entries policies
create policy "Users can view own meal_entries"
  on meal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal_entries"
  on meal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal_entries"
  on meal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal_entries"
  on meal_entries for delete
  using (auth.uid() = user_id);

-- Sport Activities policies
create policy "Users can view own sport_activities"
  on sport_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own sport_activities"
  on sport_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sport_activities"
  on sport_activities for update
  using (auth.uid() = user_id);

create policy "Users can delete own sport_activities"
  on sport_activities for delete
  using (auth.uid() = user_id);

-- Weight Entries policies
create policy "Users can view own weight_entries"
  on weight_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own weight_entries"
  on weight_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weight_entries"
  on weight_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own weight_entries"
  on weight_entries for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_japanese_activities_updated_at
  before update on japanese_activities
  for each row execute function update_updated_at_column();

create trigger update_foods_updated_at
  before update on foods
  for each row execute function update_updated_at_column();

create trigger update_meal_entries_updated_at
  before update on meal_entries
  for each row execute function update_updated_at_column();

create trigger update_sport_activities_updated_at
  before update on sport_activities
  for each row execute function update_updated_at_column();

create trigger update_weight_entries_updated_at
  before update on weight_entries
  for each row execute function update_updated_at_column();
