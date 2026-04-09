alter table if exists public.recruiter_waitlist
  add column if not exists approval_email_sent_at timestamptz,
  add column if not exists approval_email_last_error text,
  add column if not exists approval_email_last_attempt_at timestamptz,
  add column if not exists approval_email_send_count integer not null default 0;

create index if not exists recruiter_waitlist_approval_email_sent_idx
  on public.recruiter_waitlist (approval_email_sent_at desc nulls last);
