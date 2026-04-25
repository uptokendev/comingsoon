-- MemeWarzone War Missions full import
-- Generated from supabase/migrations/20260424_war_missions_schema.sql and supabase/seed/war_missions_seed.sql.

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

create table if not exists public.wm_badge_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  type text not null check (type in ('identity', 'mission', 'xp', 'streak', 'recruiter', 'manual')),
  rarity text not null default 'common' check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  icon_key text not null,
  criteria jsonb not null default '{}',
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wm_user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  badge_template_id uuid not null references public.wm_badge_templates(id) on delete cascade,
  source text not null default 'auto' check (source in ('auto', 'admin', 'system')),
  reason text,
  metadata jsonb not null default '{}',
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.wm_users(id) on delete set null,
  revoked_at timestamptz,
  unique(user_id, badge_template_id)
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

create table if not exists public.wm_submission_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wm_users(id) on delete cascade,
  quest_completion_id uuid references public.wm_quest_completions(id) on delete cascade,
  fingerprint_type text not null,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wm_verification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.wm_users(id) on delete set null,
  quest_completion_id uuid references public.wm_quest_completions(id) on delete set null,
  provider text not null,
  verification_type text not null,
  status text not null,
  message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
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

create table if not exists public.wm_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists wm_quest_templates_category_idx on public.wm_quest_templates(category_id);
create index if not exists wm_quest_instances_template_idx on public.wm_quest_instances(quest_template_id);
create unique index if not exists wm_quest_instances_template_period_start_idx on public.wm_quest_instances(quest_template_id, period_type, period_start) where period_start is not null;
create index if not exists wm_completions_user_status_idx on public.wm_quest_completions(user_id, status);
create index if not exists wm_xp_ledger_user_status_idx on public.wm_xp_ledger(user_id, status);
create index if not exists wm_badge_templates_active_order_idx on public.wm_badge_templates(active, display_order);
create index if not exists wm_user_badges_user_awarded_idx on public.wm_user_badges(user_id, revoked_at, awarded_at desc);
create unique index if not exists wm_submission_fingerprints_unique_idx on public.wm_submission_fingerprints(fingerprint_type, fingerprint);
create index if not exists wm_verification_logs_completion_idx on public.wm_verification_logs(quest_completion_id, created_at desc);
create index if not exists wm_rate_limit_events_lookup_idx on public.wm_rate_limit_events(action, key_hash, created_at desc);
create unique index if not exists wm_quiz_questions_template_question_idx on public.wm_quiz_questions(quest_template_id, question);
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
alter table public.wm_badge_templates enable row level security;
alter table public.wm_user_badges enable row level security;
alter table public.wm_social_metric_snapshots enable row level security;
alter table public.wm_submission_fingerprints enable row level security;
alter table public.wm_verification_logs enable row level security;
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
alter table public.wm_rate_limit_events enable row level security;

-- Public read surfaces. Mutations should go through service-role functions until wallet auth is wired.
drop policy if exists "wm_public_read_categories" on public.wm_quest_categories;
create policy "wm_public_read_categories" on public.wm_quest_categories for select using (active = true);

drop policy if exists "wm_public_read_templates" on public.wm_quest_templates;
create policy "wm_public_read_templates" on public.wm_quest_templates for select using (active = true);

drop policy if exists "wm_public_read_instances" on public.wm_quest_instances;
create policy "wm_public_read_instances" on public.wm_quest_instances for select using (active = true);

drop policy if exists "wm_public_read_badge_templates" on public.wm_badge_templates;
create policy "wm_public_read_badge_templates" on public.wm_badge_templates for select using (active = true);

drop policy if exists "wm_public_read_leaderboards" on public.wm_leaderboard_snapshots;
create policy "wm_public_read_leaderboards" on public.wm_leaderboard_snapshots for select using (true);

drop policy if exists "wm_public_read_prize_pools" on public.wm_prize_pools;
create policy "wm_public_read_prize_pools" on public.wm_prize_pools for select using (status in ('active', 'drawing', 'published', 'paid'));

drop policy if exists "wm_public_read_prize_winners" on public.wm_prize_winners;
create policy "wm_public_read_prize_winners" on public.wm_prize_winners for select using (status in ('approved', 'paid'));


-- Seed data

-- MemeWarzone War Missions seed data - FIXED
-- Run after supabase/migrations/20260424_war_missions_schema.sql
-- This file uses clean dollar-quoted JSONB blocks. Do not escape quotes inside JSON payloads.

insert into public.wm_quest_categories (slug, title, description, display_order, active)
values
  ('start-here', 'Start Here', 'One-time onboarding quests.', 10, true),
  ('daily-warpath', 'Daily Warpath', 'Daily reset social and community tasks.', 20, true),
  ('black-market-contracts', 'Black Market Contracts', 'Special high-XP social quests.', 30, true),
  ('recon', 'Recon & Interrogation', 'Documentation and quiz quests.', 40, true),
  ('reinforcements', 'Operation: Reinforcements', 'Recruiter and squad-growth questline.', 50, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  active = excluded.active;

with cats as (
  select id, slug from public.wm_quest_categories
), seed as (
  select * from (values
    ('start-here', 'intercept-global-comms', 'Intercept Global Comms', 'Follow MemeWarzone on X.', 100, 'x_follow', false, null::int, null::int, null::int, $json${"provider":"x"}$json$::jsonb),
    ('start-here', 'access-underground-comms', 'Access the Underground Comms', 'Join the official Telegram.', 100, 'telegram_join', false, null::int, null::int, null::int, $json${"provider":"telegram"}$json$::jsonb),
    ('start-here', 'report-to-base-camp', 'Report to Base Camp', 'Join the official Discord.', 100, 'discord_join', false, null::int, null::int, null::int, $json${"provider":"discord"}$json$::jsonb),
    ('start-here', 'take-the-oath', 'Take the Oath', 'Connect wallet and sign the oath message.', 150, 'wallet_connect', false, null::int, null::int, null::int, $json${}$json$::jsonb),

    ('daily-warpath', 'drop-frontline-propaganda', 'Drop Frontline Propaganda', 'Post a unique X post with at least 3 likes.', 150, 'x_unique_post_likes', true, 1, 7, 86400, $json${"min_likes":3,"required_terms":["memewarzone"],"period_type":"daily","daily_xp_cap":850}$json$::jsonb),
    ('daily-warpath', 'provide-covering-fire', 'Provide Covering Fire', 'Submit 2 high-quality X replies.', 150, 'x_reply_quality', true, 1, 7, 86400, $json${"required_urls":2,"required_terms":["memewarzone"],"period_type":"daily","daily_xp_cap":850}$json$::jsonb),
    ('daily-warpath', 'relay-the-battleplan', 'Relay the Battleplan', 'Quote 1 post with valuable text and at least 50 impressions.', 200, 'x_quote_impressions', true, 1, 7, 86400, $json${"min_impressions":50,"required_terms":["memewarzone"],"period_type":"daily","daily_xp_cap":850}$json$::jsonb),
    ('daily-warpath', 'maintain-radio-discipline', 'Maintain Radio Discipline', 'Be active in Discord and/or Telegram with meaningful messages.', 100, 'telegram_discord_activity', true, 1, 7, 86400, $json${"min_meaningful_messages":3,"min_chars":20,"period_type":"daily","daily_xp_cap":850}$json$::jsonb),
    ('daily-warpath', 'complete-daily-warpath', 'Complete Daily Warpath', 'Complete all daily quests for a bonus.', 250, 'internal_event', true, 1, 7, 86400, $json${"requires_all_daily":true,"period_type":"daily","daily_xp_cap":850}$json$::jsonb),

    ('black-market-contracts', 'signal-leak', 'Signal Leak', 'MemeWarzone X post with tag and 500 impressions.', 500, 'x_post_impressions', true, null::int, 1, null::int, $json${"min_impressions":500,"min_chars":180,"required_terms":["memewarzone"],"highest_tier_group":"black_market_post","period_type":"weekly"}$json$::jsonb),
    ('black-market-contracts', 'broadcasting-static', 'Broadcasting Static', 'MemeWarzone X post with tag and 1,000 impressions.', 1000, 'x_post_impressions', true, null::int, 1, null::int, $json${"min_impressions":1000,"min_chars":180,"required_terms":["memewarzone"],"highest_tier_group":"black_market_post","period_type":"weekly"}$json$::jsonb),
    ('black-market-contracts', 'viral-contagion', 'Viral Contagion', 'MemeWarzone X post with tag and 2,000 impressions.', 2500, 'x_post_impressions', true, null::int, 1, null::int, $json${"min_impressions":2000,"min_chars":180,"required_terms":["memewarzone"],"highest_tier_group":"black_market_post","period_type":"weekly"}$json$::jsonb),
    ('black-market-contracts', 'total-info-dominance', 'Total Info-Dominance', 'MemeWarzone X post with tag and 5,000 impressions plus manual review.', 7500, 'manual_review', true, null::int, 1, null::int, $json${"min_impressions":5000,"min_chars":180,"required_terms":["memewarzone"],"highest_tier_group":"black_market_post","requires_admin_review":true,"period_type":"weekly"}$json$::jsonb),

    ('recon', 'read-the-basics', 'Read the Basics', 'Read docs and pass a 4-question quiz.', 250, 'docs_quiz', false, null::int, null::int, 86400, $json${"questions":4,"pass_score":3}$json$::jsonb),
    ('recon', 'leagues-airdrop-briefing', 'Leagues and Airdrop Briefing', 'Read docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, $json${"questions":4,"pass_score":3}$json$::jsonb),
    ('recon', 'fees-treasury-objectives', 'Fees and Treasury Objectives', 'Read docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, $json${"questions":4,"pass_score":3}$json$::jsonb),
    ('recon', 'security-safety-recon', 'Security & Safety Recon', 'Read docs and pass a 4-question quiz.', 350, 'docs_quiz', false, null::int, null::int, 86400, $json${"questions":4,"pass_score":3}$json$::jsonb),

    ('reinforcements', 'read-recruiter-program', 'Read Recruiter Program', 'Read recruiter docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, $json${"questions":4,"pass_score":3}$json$::jsonb),
    ('reinforcements', 'apply-recruiter-program', 'Apply for Recruiter Program', 'Submit recruiter application.', 500, 'recruiter_application_submitted', false, null::int, null::int, null::int, $json${}$json$::jsonb),
    ('reinforcements', 'accepted-recruiter-program', 'Get Accepted for the Recruiter Program', 'Admin approves recruiter.', 2000, 'recruiter_application_accepted', false, null::int, null::int, null::int, $json${}$json$::jsonb),
    ('reinforcements', 'add-recruiter-link-x-bio', 'Add Recruiter Link to X Bio', 'Add referral link to X bio.', 750, 'x_bio_link', false, null::int, null::int, 86400, $json${"requires_admin_review":true}$json$::jsonb),
    ('reinforcements', 'call-for-reinforcements', 'Call for Reinforcements', 'Write X post recruiting your squad.', 750, 'x_unique_post_likes', false, null::int, null::int, 86400, $json${}$json$::jsonb),
    ('reinforcements', 'assemble-fireteam', 'Assemble a Fireteam', '2 verified recruits.', 1000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":2}$json$::jsonb),
    ('reinforcements', 'form-full-squad', 'Form a Full Squad', '4 verified recruits.', 2000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":4}$json$::jsonb),
    ('reinforcements', 'expand-vanguard', 'Expand the Vanguard', '6 verified recruits.', 3000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":6}$json$::jsonb),
    ('reinforcements', 'build-platoon', 'Build the Platoon', '8 verified recruits.', 4000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":8}$json$::jsonb),
    ('reinforcements', 'deploy-strike-force', 'Deploy a Strike Force', '10 verified recruits.', 6000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":10}$json$::jsonb),
    ('reinforcements', 'lead-battalion', 'Lead a Battalion', '20 verified recruits.', 15000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":20}$json$::jsonb),
    ('reinforcements', 'mobilize-brigade', 'Mobilize a Brigade', '30 verified recruits.', 30000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits":30}$json$::jsonb),
    ('reinforcements', 'activate-warband', 'Activate the Warband', '5 recruits complete Start Here.', 5000, 'referral_count_verified', false, null::int, null::int, null::int, $json${"verified_recruits_completed_start_here":5}$json$::jsonb)
  ) as t(category_slug, slug, title, description, xp_reward, verification_type, repeatable, max_completions_per_day, max_completions_per_week, cooldown_seconds, metadata)
)
insert into public.wm_quest_templates (
  category_id,
  slug,
  title,
  description,
  xp_reward,
  verification_type,
  repeatable,
  max_completions_per_day,
  max_completions_per_week,
  cooldown_seconds,
  metadata,
  active
)
select
  cats.id,
  seed.slug,
  seed.title,
  seed.description,
  seed.xp_reward,
  seed.verification_type,
  seed.repeatable,
  seed.max_completions_per_day,
  seed.max_completions_per_week,
  seed.cooldown_seconds,
  seed.metadata,
  true
from seed
join cats on cats.slug = seed.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  description = excluded.description,
  xp_reward = excluded.xp_reward,
  verification_type = excluded.verification_type,
  repeatable = excluded.repeatable,
  max_completions_per_day = excluded.max_completions_per_day,
  max_completions_per_week = excluded.max_completions_per_week,
  cooldown_seconds = excluded.cooldown_seconds,
  metadata = excluded.metadata,
  active = true;

insert into public.wm_quest_instances (quest_template_id, period_type, xp_reward, active, metadata)
select
  qt.id,
  case
    when qt.metadata->>'period_type' in ('daily', 'weekly', 'season', 'once') then qt.metadata->>'period_type'
    when qt.repeatable then 'daily'
    else 'once'
  end,
  qt.xp_reward,
  true,
  qt.metadata
from public.wm_quest_templates qt
where not exists (
  select 1 from public.wm_quest_instances qi
  where qi.quest_template_id = qt.id
    and qi.period_type = case
      when qt.metadata->>'period_type' in ('daily', 'weekly', 'season', 'once') then qt.metadata->>'period_type'
      when qt.repeatable then 'daily'
      else 'once'
    end
    and qi.period_start is null
);

insert into public.wm_badge_templates (
  slug,
  title,
  description,
  type,
  rarity,
  icon_key,
  criteria,
  display_order,
  active
)
values
  ('oathkeeper', 'Oathkeeper', 'Connected a wallet and signed the War Missions oath.', 'identity', 'common', 'oath', $json${"quest_slugs":["take-the-oath"]}$json$::jsonb, 10, true),
  ('start-here-cleared', 'Start Here Cleared', 'Completed every Start Here onboarding quest.', 'mission', 'uncommon', 'start', $json${"category_slug":"start-here","all_category_quests":true}$json$::jsonb, 100, true),
  ('daily-warpath-cleared', 'Daily Warpath Cleared', 'Completed the Daily Warpath bonus quest.', 'mission', 'uncommon', 'daily', $json${"quest_slugs":["complete-daily-warpath"]}$json$::jsonb, 110, true),
  ('black-market-operator', 'Black Market Operator', 'Completed at least one Black Market Contract.', 'mission', 'rare', 'market', $json${"category_slug":"black-market-contracts","min_verified":1}$json$::jsonb, 120, true),
  ('recon-certified', 'Recon Certified', 'Passed every Recon & Interrogation briefing.', 'mission', 'rare', 'recon', $json${"category_slug":"recon","all_category_quests":true}$json$::jsonb, 130, true),
  ('reinforcements-operator', 'Reinforcements Operator', 'Completed an Operation: Reinforcements quest.', 'mission', 'rare', 'reinforce', $json${"category_slug":"reinforcements","min_verified":1}$json$::jsonb, 140, true),
  ('xp-500', '500 XP', 'Earned 500 active XP.', 'xp', 'common', 'xp', $json${"xp_min":500}$json$::jsonb, 200, true),
  ('xp-1000', '1,000 XP', 'Earned 1,000 active XP.', 'xp', 'common', 'xp', $json${"xp_min":1000}$json$::jsonb, 210, true),
  ('xp-5000', '5,000 XP', 'Earned 5,000 active XP.', 'xp', 'uncommon', 'xp', $json${"xp_min":5000}$json$::jsonb, 220, true),
  ('xp-10000', '10,000 XP', 'Earned 10,000 active XP.', 'xp', 'rare', 'xp', $json${"xp_min":10000}$json$::jsonb, 230, true),
  ('xp-25000', '25,000 XP', 'Earned 25,000 active XP.', 'xp', 'epic', 'xp', $json${"xp_min":25000}$json$::jsonb, 240, true),
  ('xp-50000', '50,000 XP', 'Earned 50,000 active XP.', 'xp', 'legendary', 'xp', $json${"xp_min":50000}$json$::jsonb, 250, true),
  ('streak-3', '3-Day Streak', 'Built a 3-day Warpath streak.', 'streak', 'common', 'streak', $json${"streak_min":3}$json$::jsonb, 300, true),
  ('streak-7', '7-Day Streak', 'Built a 7-day Warpath streak.', 'streak', 'uncommon', 'streak', $json${"streak_min":7}$json$::jsonb, 310, true),
  ('streak-14', '14-Day Streak', 'Built a 14-day Warpath streak.', 'streak', 'rare', 'streak', $json${"streak_min":14}$json$::jsonb, 320, true),
  ('streak-30', '30-Day Streak', 'Built a 30-day Warpath streak.', 'streak', 'legendary', 'streak', $json${"streak_min":30}$json$::jsonb, 330, true),
  ('recruiter-approved', 'Recruiter Approved', 'Accepted into the Recruiter Program.', 'recruiter', 'uncommon', 'recruiter', $json${"role":"recruiter"}$json$::jsonb, 400, true),
  ('fireteam-2', 'Fireteam Builder', 'Recruited 2 verified users.', 'recruiter', 'uncommon', 'recruits', $json${"verified_recruits_min":2}$json$::jsonb, 410, true),
  ('squad-4', 'Squad Builder', 'Recruited 4 verified users.', 'recruiter', 'rare', 'recruits', $json${"verified_recruits_min":4}$json$::jsonb, 420, true),
  ('strike-force-10', 'Strike Force Lead', 'Recruited 10 verified users.', 'recruiter', 'epic', 'recruits', $json${"verified_recruits_min":10}$json$::jsonb, 430, true),
  ('battalion-20', 'Battalion Lead', 'Recruited 20 verified users.', 'recruiter', 'epic', 'recruits', $json${"verified_recruits_min":20}$json$::jsonb, 440, true),
  ('brigade-30', 'Brigade Commander', 'Recruited 30 verified users.', 'recruiter', 'legendary', 'recruits', $json${"verified_recruits_min":30}$json$::jsonb, 450, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  rarity = excluded.rarity,
  icon_key = excluded.icon_key,
  criteria = excluded.criteria,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = now();

with quiz_seed as (
  select * from (values
    ('read-the-basics', 'What is MemeWarzone built around?', $json${"a":"Creator-first meme launches and community discovery","b":"Private OTC token sales","c":"NFT-only profile badges","d":"Centralized exchange order books"}$json$::jsonb, 'a', 'MemeWarzone turns meme launches into open launch events.'),
    ('read-the-basics', 'What action drives discovery in the broader platform?', $json${"a":"UpVotes","b":"Hidden invites","c":"Manual spreadsheet scoring","d":"One-time whitelist forms"}$json$::jsonb, 'a', 'UpVotes are part of the platform discovery loop.'),
    ('read-the-basics', 'What should War Missions use as the primary identity?', $json${"a":"Wallet address","b":"Email only","c":"Telegram username only","d":"Browser user-agent"}$json$::jsonb, 'a', 'Wallet identity anchors quest completions and rewards.'),
    ('read-the-basics', 'What stores XP grants?', $json${"a":"XP ledger","b":"A single editable total only","c":"Local storage","d":"A Discord role name"}$json$::jsonb, 'a', 'The ledger records every active or revoked XP grant.'),
    ('leagues-airdrop-briefing', 'What do leagues create for MemeWarzone communities?', $json${"a":"Recurring competition loops","b":"Permanent trading bans","c":"Static landing pages","d":"One private chat room"}$json$::jsonb, 'a', 'Leagues bring communities back through recurring competition.'),
    ('leagues-airdrop-briefing', 'Why are snapshots useful?', $json${"a":"They preserve ranked results for a period","b":"They delete all XP history","c":"They replace wallet signatures","d":"They hide winners"}$json$::jsonb, 'a', 'Snapshots preserve leaderboard state for prizes and review.'),
    ('leagues-airdrop-briefing', 'Who should leaderboards exclude?', $json${"a":"Banned users and revoked XP","b":"Everyone with a wallet","c":"Users with badges","d":"Recruiters only"}$json$::jsonb, 'a', 'Leaderboards must not count excluded users or revoked XP.'),
    ('leagues-airdrop-briefing', 'What is an airdrop-facing quest system preparing for?', $json${"a":"Attribution and eligibility rules","b":"Unlimited unreviewed rewards","c":"No wallet verification","d":"Manual screenshots only"}$json$::jsonb, 'a', 'Quest completions become an eligibility and attribution layer.'),
    ('fees-treasury-objectives', 'Why does War Missions avoid automatic BNB payouts in v1?', $json${"a":"Rewards need review and operational control first","b":"BNB cannot be used on-chain","c":"Quests cannot earn XP","d":"Wallets are not supported"}$json$::jsonb, 'a', 'The first version focuses on controlled XP and review.'),
    ('fees-treasury-objectives', 'What should prize flows use before payment?', $json${"a":"Admin approval and winner status","b":"Anonymous browser votes only","c":"Untracked direct transfers","d":"Local CSV totals only"}$json$::jsonb, 'a', 'Prize state needs reviewable statuses before payout.'),
    ('fees-treasury-objectives', 'What status should revoked XP have?', $json${"a":"revoked","b":"active","c":"paid","d":"draft"}$json$::jsonb, 'a', 'Revoked ledger rows must stop contributing to totals.'),
    ('fees-treasury-objectives', 'What makes the incentive loop safer?', $json${"a":"Reason codes and review queues","b":"Unlimited posting rewards","c":"No admin audit log","d":"Ignoring duplicate content"}$json$::jsonb, 'a', 'Reason codes and review queues reduce abuse risk.'),
    ('security-safety-recon', 'Can one social account be reused across multiple wallets?', $json${"a":"No","b":"Yes, always","c":"Only for high-XP quests","d":"Only after a quiz"}$json$::jsonb, 'a', 'Social identity reuse must be blocked.'),
    ('security-safety-recon', 'What should happen to suspicious high-XP submissions?', $json${"a":"Manual review","b":"Instant payout","c":"Silent deletion","d":"Leaderboard boost"}$json$::jsonb, 'a', 'High-XP and suspicious submissions require stronger review.'),
    ('security-safety-recon', 'Can users approve their own quests?', $json${"a":"No","b":"Yes","c":"Only once per day","d":"Only without a wallet"}$json$::jsonb, 'a', 'Admin-only review must be protected.'),
    ('security-safety-recon', 'What should failed verification show?', $json${"a":"Clear user messages","b":"No feedback","c":"Only raw stack traces","d":"A fake success"}$json$::jsonb, 'a', 'Clear errors help users recover without weakening review.'),
    ('read-recruiter-program', 'What does a verified recruit require?', $json${"a":"Wallet plus onboarding verification","b":"A raw page click only","c":"A copied invite code without wallet","d":"An unverified username"}$json$::jsonb, 'a', 'Recruit milestones count verified users, not raw clicks.'),
    ('read-recruiter-program', 'When should recruiter attribution link to a wallet?', $json${"a":"On wallet connect after referral tracking","b":"Only after payout","c":"Never","d":"Only in a spreadsheet"}$json$::jsonb, 'a', 'Attribution persists before wallet connect, then links to the wallet.'),
    ('read-recruiter-program', 'Can the same recruit count twice for one recruiter?', $json${"a":"No","b":"Yes","c":"Only if they use Telegram","d":"Only after 30 days"}$json$::jsonb, 'a', 'Recruit milestones must dedupe recruits.'),
    ('read-recruiter-program', 'Who approves recruiter applications?', $json${"a":"Admin review","b":"The applicant automatically","c":"Any referred user","d":"A public poll"}$json$::jsonb, 'a', 'Recruiter approval is an admin-controlled step.')
  ) as q(quest_slug, question, answers, correct_answer_key, explanation)
)
insert into public.wm_quiz_questions (
  quest_template_id,
  question,
  answers,
  correct_answer_key,
  explanation,
  active
)
select
  qt.id,
  quiz_seed.question,
  quiz_seed.answers,
  quiz_seed.correct_answer_key,
  quiz_seed.explanation,
  true
from quiz_seed
join public.wm_quest_templates qt on qt.slug = quiz_seed.quest_slug
on conflict (quest_template_id, question) do update set
  answers = excluded.answers,
  correct_answer_key = excluded.correct_answer_key,
  explanation = excluded.explanation,
  active = true;

select
  (select count(*) from public.wm_quest_categories) as category_count,
  (select count(*) from public.wm_quest_templates) as quest_template_count,
  (select count(*) from public.wm_quest_instances) as quest_instance_count,
  (select count(*) from public.wm_quiz_questions) as quiz_question_count,
  (select count(*) from public.wm_badge_templates) as badge_template_count;
