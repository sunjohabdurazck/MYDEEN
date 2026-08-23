-- ============================================================
-- DEEN APP — SUPABASE SCHEMA (COMPLETE FIXED VERSION)
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PART 1: CREATE ALL TABLES FIRST
-- ============================================================

-- USERS TABLE (FIXED: Added missing bio and total_xp columns)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique,
  display_name    text,
  avatar_url      text,
  city            text,
  country         text,
  latitude        numeric(10,6),
  longitude       numeric(10,6),
  calculation_method text default 'MWL',
  madhab          text default 'Shafi',
  timezone        text,
  level           int default 1,
  xp              int default 0,
  total_xp        int default 0,
  streak_current  int default 0,
  streak_best     int default 0,
  hardcore_mode   boolean default false,
  lock_mode       boolean default true,
  bio             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- PRAYER LOGS
create table if not exists public.prayer_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  prayer_name text not null check (prayer_name in ('Fajr','Dhuhr','Asr','Maghrib','Isha')),
  prayer_date date not null,
  status      text not null default 'pending' check (status in ('prayed','missed','qada','pending')),
  prayed_at   timestamptz,
  qada_for    date,
  is_jamaah   boolean default false,
  note        text,
  created_at  timestamptz default now(),
  unique(user_id, prayer_name, prayer_date)
);

-- QURAN PROGRESS
create table if not exists public.quran_progress (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  surah       int not null check (surah between 1 and 114),
  last_ayah   int not null default 1,
  completed   boolean default false,
  read_count  int default 1,
  updated_at  timestamptz default now(),
  unique(user_id, surah)
);

-- BOOKMARKS
create table if not exists public.bookmarks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  type        text not null check (type in ('ayah','dua','note')),
  surah       int,
  ayah        int,
  dua_id      text,
  note        text,
  label       text,
  created_at  timestamptz default now()
);

-- TASBIH SESSIONS
create table if not exists public.tasbih_sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  dhikr_text  text not null,
  dhikr_arabic text,
  count       int not null default 0,
  target      int default 33,
  session_date date default current_date,
  created_at  timestamptz default now()
);

-- FASTING LOGS
create table if not exists public.fasting_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  fast_date   date not null,
  type        text default 'ramadan' check (type in ('ramadan','voluntary','qada','kaffarah')),
  completed   boolean default false,
  suhoor_time timestamptz,
  iftar_time  timestamptz,
  note        text,
  unique(user_id, fast_date)
);

-- FRIENDSHIPS
create table if not exists public.friendships (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  friend_id   uuid references public.profiles(id) on delete cascade,
  status      text default 'pending' check (status in ('pending','accepted','blocked')),
  created_at  timestamptz default now(),
  unique(user_id, friend_id)
);

-- ACCOUNTABILITY PAIRS
create table if not exists public.accountability_pairs (
  id          uuid primary key default uuid_generate_v4(),
  user_a      uuid references public.profiles(id) on delete cascade,
  user_b      uuid references public.profiles(id) on delete cascade,
  active      boolean default true,
  notify_on_miss boolean default true,
  created_at  timestamptz default now()
);

-- XP & BADGES
create table if not exists public.user_badges (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  badge_slug  text not null,
  earned_at   timestamptz default now(),
  unique(user_id, badge_slug)
);

-- AI CHAT HISTORY
create table if not exists public.ai_chats (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  verified    boolean default false,
  source_ref  text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ADD MISSING COLUMNS TO EXISTING PROFILES TABLE
-- ============================================================

-- Add bio column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add total_xp column  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- Update total_xp to match current xp values
UPDATE public.profiles 
SET total_xp = xp 
WHERE total_xp IS NULL AND xp IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('bio', 'total_xp');
-- ============================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.prayer_logs enable row level security;
alter table public.quran_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.tasbih_sessions enable row level security;
alter table public.fasting_logs enable row level security;
alter table public.friendships enable row level security;
alter table public.accountability_pairs enable row level security;
alter table public.user_badges enable row level security;
alter table public.ai_chats enable row level security;

-- ============================================================
-- PART 3: CREATE POLICIES
-- ============================================================

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view friends' profiles" on public.profiles;

create policy "Users can view own profile" on public.profiles 
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles 
  for update using (auth.uid() = id);
create policy "Users can view friends' profiles" on public.profiles 
  for select using (
    auth.uid() in (
      select user_id from public.friendships where friend_id = auth.uid() and status = 'accepted'
      union
      select friend_id from public.friendships where user_id = auth.uid() and status = 'accepted'
    )
  );

-- Prayer logs policies
drop policy if exists "Users manage own prayer logs" on public.prayer_logs;
create policy "Users manage own prayer logs" on public.prayer_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Quran progress policies
drop policy if exists "Users manage own quran progress" on public.quran_progress;
create policy "Users manage own quran progress" on public.quran_progress
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookmarks policies
drop policy if exists "Users manage own bookmarks" on public.bookmarks;
create policy "Users manage own bookmarks" on public.bookmarks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tasbih policies
drop policy if exists "Users manage own tasbih" on public.tasbih_sessions;
create policy "Users manage own tasbih" on public.tasbih_sessions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fasting policies
drop policy if exists "Users manage own fasting" on public.fasting_logs;
create policy "Users manage own fasting" on public.fasting_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friendships policies
drop policy if exists "Users manage own friendships" on public.friendships;
create policy "Users manage own friendships" on public.friendships
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Accountability pairs policies
drop policy if exists "Pair members can view" on public.accountability_pairs;
create policy "Pair members can view" on public.accountability_pairs
  using (auth.uid() = user_a or auth.uid() = user_b);

-- User badges policies
drop policy if exists "Users view own badges" on public.user_badges;
create policy "Users view own badges" on public.user_badges 
  for select using (auth.uid() = user_id);

-- AI chats policies
drop policy if exists "Users manage own chats" on public.ai_chats;
create policy "Users manage own chats" on public.ai_chats
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- PART 4: CREATE INDEXES
-- ============================================================
create index if not exists idx_prayer_logs_user_date on public.prayer_logs(user_id, prayer_date desc);
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_friendships_status on public.friendships(user_id, friend_id, status);
create index if not exists idx_quran_progress_user on public.quran_progress(user_id);
create index if not exists idx_fasting_logs_user_date on public.fasting_logs(user_id, fast_date desc);
create index if not exists idx_profiles_bio on public.profiles(bio);

-- ============================================================
-- PART 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- Drop existing triggers and functions
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_prayer_prayed on public.prayer_logs;
drop trigger if exists on_prayer_completed on public.prayer_logs;
drop function if exists public.handle_new_user();
drop function if exists public.award_prayer_xp();
drop function if exists public.update_streak(uuid);
drop function if exists public.trigger_update_streak();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url, total_xp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    0
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update XP on prayer completion
create or replace function public.award_prayer_xp()
returns trigger language plpgsql security definer as $$
declare
  xp_gain int;
begin
  if new.status = 'prayed' and (old.status is null or old.status != 'prayed') then
    xp_gain := case new.prayer_name
      when 'Fajr'    then 80
      when 'Isha'    then 60
      when 'Dhuhr'   then 40
      when 'Asr'     then 40
      when 'Maghrib' then 40
      else 40
    end;

    update public.profiles
    set xp = xp + xp_gain,
        total_xp = total_xp + xp_gain,
        level = floor((xp + xp_gain) / 500) + 1
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_prayer_prayed
  after insert or update on public.prayer_logs
  for each row execute procedure public.award_prayer_xp();

-- Update streak function
create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  yesterday_count int;
  today_count     int;
begin
  select count(*) into yesterday_count
  from public.prayer_logs
  where user_id = p_user_id
    and prayer_date = current_date - 1
    and status = 'prayed';

  select count(*) into today_count
  from public.prayer_logs
  where user_id = p_user_id
    and prayer_date = current_date
    and status = 'prayed';

  if yesterday_count = 5 and today_count > 0 then
    update public.profiles
    set streak_current = streak_current + 1,
        streak_best = greatest(streak_best, streak_current + 1)
    where id = p_user_id;
  elsif today_count = 5 and yesterday_count < 5 then
    update public.profiles
    set streak_current = 1,
        streak_best = greatest(streak_best, 1)
    where id = p_user_id;
  end if;
end;
$$;

-- Trigger function for streak updates
create or replace function public.trigger_update_streak()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT' and new.status = 'prayed') or
     (tg_op = 'UPDATE' and new.status = 'prayed' and old.status != 'prayed') then
    perform public.update_streak(new.user_id);
  end if;
  return new;
end;
$$;

create trigger on_prayer_completed
  after insert or update on public.prayer_logs
  for each row execute procedure public.trigger_update_streak();

-- ============================================================
-- PART 6: REALTIME (FIXED - prevents duplicate publication errors)
-- ============================================================

-- Safely add tables to realtime publication if not already members
DO $$ 
BEGIN
    -- Check and add prayer_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'prayer_logs'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE public.prayer_logs;
    END IF;
    
    -- Check and add profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE public.profiles;
    END IF;
    
    -- Optional: Add other tables you want realtime for
    -- Check and add ai_sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ai_sessions'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE public.ai_sessions;
    END IF;
    
    -- Check and add ai_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ai_messages'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE public.ai_messages;
    END IF;
END $$;
-- ============================================================
-- PART 7: NEW FEATURE TABLES
-- ============================================================

-- USER GOALS
create table if not exists public.user_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  goal_type text not null, -- 'quran', 'fasting', 'tahajjud', 'dhikr', 'custom'
  goal_name text not null,
  target_value int not null,
  current_value int default 0,
  unit text,
  icon text default '🎯',
  deadline date,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.user_goals enable row level security;
create policy "Users manage own goals" on public.user_goals for all using (auth.uid() = user_id);

-- ACTIVITY LOG (for timeline feed)
create table if not exists public.user_activity (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  activity_type text not null, -- 'badge', 'streak', 'level_up', 'mission_complete', 'prayer'
  text text,
  icon text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.user_activity enable row level security;
create policy "Users see own activity" on public.user_activity for all using (auth.uid() = user_id);

-- RAMADAN TRACKING
create table if not exists public.ramadan_tracking (
  user_id uuid references public.profiles(id) on delete cascade,
  year int not null,
  day_number int not null,
  fast_kept boolean default false,
  quran_pages int default 0,
  taraweeh boolean default false,
  tahajjud boolean default false,
  dua_recorded text,
  notes text,
  primary key (user_id, year, day_number)
);

alter table public.ramadan_tracking enable row level security;
create policy "Users manage own ramadan data" on public.ramadan_tracking for all using (auth.uid() = user_id);

-- SAVED AI ANSWERS (fatwas)
create table if not exists public.saved_answers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  category text,
  source text,
  confidence_level text,
  session_id uuid references public.ai_sessions(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.saved_answers enable row level security;
create policy "Users manage own saved answers" on public.saved_answers for all using (auth.uid() = user_id);

-- QURAN KHATAM TRACKING
create table if not exists public.quran_khatam (
  user_id uuid references public.profiles(id) on delete cascade,
  juz_number int not null check (juz_number between 1 and 30),
  completed boolean default false,
  completed_at timestamptz,
  primary key (user_id, juz_number)
);

alter table public.quran_khatam enable row level security;
create policy "Users manage own khatam" on public.quran_khatam for all using (auth.uid() = user_id);

-- LEADERBOARD VIEW (weekly)
create or replace view public.leaderboard_weekly as
select
  p.id,
  p.display_name,
  p.username,
  p.total_xp,
  p.level,
  p.streak_current,
  rank() over (order by p.total_xp desc) as rank
from public.profiles p
where p.total_xp > 0
order by p.total_xp desc
limit 100;

-- Add realtime for new tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'user_activity'
    ) THEN
        ALTER publication supabase_realtime ADD TABLE public.user_activity;
    END IF;
END $$;
