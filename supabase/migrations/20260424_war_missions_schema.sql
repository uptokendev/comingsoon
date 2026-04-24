-- MemeWarzone War Missions schema scaffold
-- First pass for quests.memewar.zone. Run inside Supabase SQL editor or Supabase CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.wm_users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'recruiter', 'admin')),
  risk_score int not null default 0,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wm_wallet_auth_nonces (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  provider text not null check (provider in ('x', 'discord', 'telegram')),
  provider_user_id text not null,
  username text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  connected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  unique(provider, provider_user_id),
  unique(user_id, provider)
);

create table if not exists public.wm_quest_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_quest_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.wm_quest_categories(id),
  slug text unique not null,
  title text not null,
  description text,
  xp_reward int not null check (xp_reward >= 0),
  verification_type text not null,
  repeatable boolean not null default false,
  max_completions_per_day int,
  max_completions_per_week int,
  cooldown_seconds int,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.wm_quest_instances (
  id uuid primary key default gen_random_uuid(),
  quest_template_id uuid not null references public.wm_quest_templates(id),
  period_type text not null check (period_type in ('once', 'daily', 'weekly', 'season')),
  period_start timestamptz,
  period_end timestamptz,
  xp_reward int not null check (xp_reward >= 0),
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.wm_quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  quest_instance_id uuid not null references public.wm_quest_instances(id),
  status text not null check (status in ('started', 'pending', 'verified', 'rejected', 'revoked', 'review', 'expired')),
  submitted_value text,
  verification_payload jsonb not null default '{}',
  rejection_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, quest_instance_id)
);

create table if not exists public.wm_quest_requirements (
  id uuid primary key default gen_random_uuid(),
  quest_template_id uuid not null references public.wm_quest_templates(id) on delete cascade,
  requirement_type text not null,
  requirement_value jsonb not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  quest_completion_id uuid references public.wm_quest_completions(id) on delete set null,
  amount int not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.wm_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  date_utc date not null,
  quests_completed int not null default 0,
  daily_xp_earned int not null default 0,
  completed_all boolean not null default false,
  streak_count int not null default 0,
  raffle_tickets_earned int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date_utc)
);

create table if not exists public.wm_social_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  quest_completion_id uuid not null references public.wm_quest_completions(id) on delete cascade,
  provider text not null,
  external_post_id text,
  like_count int not null default 0,
  reply_count int not null default 0,
  repost_count int not null default 0,
  quote_count int not null default 0,
  impression_count int not null default 0,
  checked_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'
);

create table if not exists public.wm_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quest_template_id uuid not null references public.wm_quest_templates(id) on delete cascade,
  question text not null,
  answers jsonb not null,
  correct_answer_key text not null,
  explanation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  quest_instance_id uuid not null references public.wm_quest_instances(id),
  score int not null,
  passed boolean not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_recruiter_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.wm_users(id) on delete set null,
  wallet_address text not null,
  x_username text,
  telegram_username text,
  discord_username text,
  motivation text,
  expected_recruits int,
  status text not null default 'submitted' check (status in ('submitted', 'review', 'accepted', 'rejected')),
  reviewed_by uuid references public.wm_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_referral_links (
  id uuid primary key default gen_random_uuid(),
  recruiter_user_id uuid not null references public.wm_users(id) on delete cascade,
  code text unique not null,
  url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  recruiter_user_id uuid not null references public.wm_users(id) on delete cascade,
  referred_user_id uuid references public.wm_users(id) on delete set null,
  referral_code text,
  status text not null default 'pending' check (status in ('pending', 'linked', 'verified', 'locked', 'rejected', 'detached')),
  first_seen_at timestamptz not null default now(),
  wallet_connected_at timestamptz,
  verified_at timestamptz,
  locked_at timestamptz,
  rejected_reason text
);

create table if not exists public.wm_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'assigned', 'resolved', 'dismissed')),
  related_user_id uuid references public.wm_users(id) on delete set null,
  related_completion_id uuid references public.wm_quest_completions(id) on delete set null,
  related_application_id uuid references public.wm_recruiter_applications(id) on delete set null,
  assigned_to uuid references public.wm_users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.wm_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('daily', 'weekly', 'season', 'all_time')),
  period_start timestamptz,
  period_end timestamptz,
  user_id uuid not null references public.wm_users(id) on delete cascade,
  xp_total int not null,
  rank int not null,
  metadata jsonb not null default '{}',
  published_at timestamptz not null default now()
);

create table if not exists public.wm_prize_pools (
  id uuid primary key default gen_random_uuid(),
  period_type text not null,
  period_start timestamptz,
  period_end timestamptz,
  reward_asset text,
  reward_amount numeric,
  status text not null default 'draft' check (status in ('draft', 'active', 'drawing', 'published', 'paid')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.wm_prize_winners (
  id uuid primary key default gen_random_uuid(),
  prize_pool_id uuid not null references public.wm_prize_pools(id) on delete cascade,
  user_id uuid not null references public.wm_users(id) on delete cascade,
  wallet_address text,
  rank int,
  reward_amount numeric,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'disqualified')),
  tx_hash text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.wm_users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wm_quest_templates_category_idx on public.wm_quest_templates(category_id);
create index if not exists wm_quest_instances_template_idx on public.wm_quest_instances(quest_template_id);
create index if not exists wm_completions_user_status_idx on public.wm_quest_completions(user_id, status);
create index if not exists wm_xp_ledger_user_status_idx on public.wm_xp_ledger(user_id, status);
create index if not exists wm_referral_attributions_recruiter_idx on public.wm_referral_attributions(recruiter_user_id, status);
create index if not exists wm_notifications_status_priority_idx on public.wm_admin_notifications(status, priority, created_at desc);

alter table public.wm_users enable row level security;
alter table public.wm_wallet_auth_nonces enable row level security;
alter table public.wm_social_accounts enable row level security;
alter table public.wm_quest_categories enable row level security;
alter table public.wm_quest_templates enable row level security;
alter table public.wm_quest_instances enable row level security;
alter table public.wm_quest_completions enable row level security;
alter table public.wm_quest_requirements enable row level security;
alter table public.wm_xp_ledger enable row level security;
alter table public.wm_daily_progress enable row level security;
alter table public.wm_social_metric_snapshots enable row level security;
alter table public.wm_quiz_questions enable row level security;
alter table public.wm_quiz_attempts enable row level security;
alter table public.wm_recruiter_applications enable row level security;
alter table public.wm_referral_links enable row level security;
alter table public.wm_referral_attributions enable row level security;
alter table public.wm_admin_notifications enable row level security;
alter table public.wm_leaderboard_snapshots enable row level security;
alter table public.wm_prize_pools enable row level security;
alter table public.wm_prize_winners enable row level security;
alter table public.wm_admin_audit_log enable row level security;

-- Public read surfaces. Mutations should go through service-role functions until wallet auth is wired.
drop policy if exists "wm_public_read_categories" on public.wm_quest_categories;
create policy "wm_public_read_categories" on public.wm_quest_categories for select using (active = true);

drop policy if exists "wm_public_read_templates" on public.wm_quest_templates;
create policy "wm_public_read_templates" on public.wm_quest_templates for select using (active = true);

drop policy if exists "wm_public_read_instances" on public.wm_quest_instances;
create policy "wm_public_read_instances" on public.wm_quest_instances for select using (active = true);

drop policy if exists "wm_public_read_leaderboards" on public.wm_leaderboard_snapshots;
create policy "wm_public_read_leaderboards" on public.wm_leaderboard_snapshots for select using (true);

drop policy if exists "wm_public_read_prize_pools" on public.wm_prize_pools;
create policy "wm_public_read_prize_pools" on public.wm_prize_pools for select using (status in ('active', 'drawing', 'published', 'paid'));

drop policy if exists "wm_public_read_prize_winners" on public.wm_prize_winners;
create policy "wm_public_read_prize_winners" on public.wm_prize_winners for select using (status in ('approved', 'paid'));
