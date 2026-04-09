create extension if not exists pgcrypto;

alter table if exists public.recruiter_waitlist
  add column if not exists recruiter_code text,
  add column if not exists approved_at timestamptz,
  add column if not exists recruiter_last_login_at timestamptz;

create unique index if not exists recruiter_waitlist_recruiter_code_key
  on public.recruiter_waitlist (upper(recruiter_code))
  where recruiter_code is not null;

create table if not exists public.ref_sessions (
  id uuid primary key default gen_random_uuid(),
  recruiter_id bigint not null references public.recruiter_waitlist(id) on delete cascade,
  recruiter_code text not null,
  landing_path text,
  source text not null default 'ref-link',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_hash text,
  ua_hash text,
  bound_wallet_address text,
  bound_at timestamptz
);

create index if not exists ref_sessions_recruiter_idx on public.ref_sessions (recruiter_id, created_at desc);
create index if not exists ref_sessions_exp_idx on public.ref_sessions (expires_at desc);

create table if not exists public.wallet_nonces (
  id bigserial primary key,
  address text not null,
  purpose text not null,
  nonce text not null,
  ref_session_id uuid references public.ref_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create unique index if not exists wallet_nonces_address_purpose_key
  on public.wallet_nonces (lower(address), purpose);

create table if not exists public.ref_wallets (
  wallet_address text primary key,
  recruiter_id bigint not null references public.recruiter_waitlist(id) on delete cascade,
  recruiter_code text not null,
  role text not null default 'unknown',
  source text not null default 'session',
  session_id uuid references public.ref_sessions(id) on delete set null,
  bound_at timestamptz not null default now(),
  signature_message text,
  created_at timestamptz not null default now()
);

create index if not exists ref_wallets_recruiter_idx on public.ref_wallets (recruiter_id, bound_at desc);
create index if not exists ref_wallets_role_idx on public.ref_wallets (role, bound_at desc);
