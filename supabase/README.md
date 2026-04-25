# Supabase Setup

## War Missions

For a fresh Supabase setup, run this single file in the Supabase SQL Editor:

1. `supabase/war_missions_full_import.sql`

That import combines the War Missions schema and seed data. It creates the `wm_*` tables, public read RLS policies for public quest surfaces, current War Missions categories and quest templates, daily/weekly quest instance support, verification logs, rate-limit events, duplicate-submission fingerprints, quiz questions, prize workflow tables, and the Core Launch Set badge catalog.

If you prefer Supabase CLI migrations instead, run these files in order:

1. `supabase/migrations/20260424_war_missions_schema.sql`
2. `supabase/seed/war_missions_seed.sql`
