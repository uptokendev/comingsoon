create table if not exists public.recruiter_waitlist (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  source text not null default 'coming-soon-popup',
  name text not null,
  x_handle text not null,
  telegram_handle text not null,
  wallet_address text not null,
  email text not null,
  country_region text,
  focus text not null default 'both',
  languages text,
  notes text,
  consent_text text not null,
  reviewed_at timestamptz,
  reviewer_notes text
);

create unique index if not exists recruiter_waitlist_email_key on public.recruiter_waitlist (lower(email));
create unique index if not exists recruiter_waitlist_wallet_key on public.recruiter_waitlist (lower(wallet_address));
create index if not exists recruiter_waitlist_status_idx on public.recruiter_waitlist (status, created_at desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_recruiter_waitlist_updated_at on public.recruiter_waitlist;
create trigger set_recruiter_waitlist_updated_at
before update on public.recruiter_waitlist
for each row execute procedure public.set_current_timestamp_updated_at();
