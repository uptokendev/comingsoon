-- MemeWarzone War Missions seed data

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
    ('start-here', 'intercept-global-comms', 'Intercept Global Comms', 'Follow MemeWarzone on X.', 100, 'x_follow', false, null::int, null::int, null::int, '{"provider":"x"}'::jsonb),
    ('start-here', 'access-underground-comms', 'Access the Underground Comms', 'Join the official Telegram.', 100, 'telegram_join', false, null::int, null::int, null::int, '{"provider":"telegram"}'::jsonb),
    ('start-here', 'report-to-base-camp', 'Report to Base Camp', 'Join the official Discord.', 100, 'discord_join', false, null::int, null::int, null::int, '{"provider":"discord"}'::jsonb),
    ('start-here', 'take-the-oath', 'Take the Oath', 'Connect wallet and sign the oath message.', 150, 'wallet_connect', false, null::int, null::int, null::int, '{}'::jsonb),

    ('daily-warpath', 'drop-frontline-propaganda', 'Drop Frontline Propaganda', 'Post a unique X post with at least 3 likes.', 150, 'x_unique_post_likes', true, 1, 7, 86400, '{"min_likes":3}'::jsonb),
    ('daily-warpath', 'provide-covering-fire', 'Provide Covering Fire', 'Submit 2 high-quality X replies.', 150, 'x_reply_quality', true, 1, 7, 86400, '{"required_urls":2}'::jsonb),
    ('daily-warpath', 'relay-the-battleplan', 'Relay the Battleplan', 'Quote 1 post with valuable text and at least 50 impressions.', 200, 'x_quote_impressions', true, 1, 7, 86400, '{"min_impressions":50}'::jsonb),
    ('daily-warpath', 'maintain-radio-discipline', 'Maintain Radio Discipline', 'Be active in Discord and/or Telegram with meaningful messages.', 100, 'telegram_discord_activity', true, 1, 7, 86400, '{"min_meaningful_messages":3,"min_chars":20}'::jsonb),
    ('daily-warpath', 'complete-daily-warpath', 'Complete Daily Warpath', 'Complete all daily quests for a bonus.', 250, 'internal_event', true, 1, 7, 86400, '{"requires_all_daily":true}'::jsonb),

    ('black-market-contracts', 'signal-leak', 'Signal Leak', 'MemeWarzone X post with tag and 500 impressions.', 500, 'x_post_impressions', true, null::int, 1, null::int, '{"min_impressions":500,"min_chars":180,"highest_tier_group":"black_market_post"}'::jsonb),
    ('black-market-contracts', 'broadcasting-static', 'Broadcasting Static', 'MemeWarzone X post with tag and 1,000 impressions.', 1000, 'x_post_impressions', true, null::int, 1, null::int, '{"min_impressions":1000,"min_chars":180,"highest_tier_group":"black_market_post"}'::jsonb),
    ('black-market-contracts', 'viral-contagion', 'Viral Contagion', 'MemeWarzone X post with tag and 2,000 impressions.', 2500, 'x_post_impressions', true, null::int, 1, null::int, '{"min_impressions":2000,"min_chars":180,"highest_tier_group":"black_market_post"}'::jsonb),
    ('black-market-contracts', 'total-info-dominance', 'Total Info-Dominance', 'MemeWarzone X post with tag and 5,000 impressions plus manual review.', 7500, 'manual_review', true, null::int, 1, null::int, '{"min_impressions":5000,"min_chars":180,"highest_tier_group":"black_market_post","requires_admin_review":true}'::jsonb),

    ('recon', 'read-the-basics', 'Read the Basics', 'Read docs and pass a 4-question quiz.', 250, 'docs_quiz', false, null::int, null::int, 86400, '{"questions":4,"pass_score":3}'::jsonb),
    ('recon', 'leagues-airdrop-briefing', 'Leagues and Airdrop Briefing', 'Read docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, '{"questions":4,"pass_score":3}'::jsonb),
    ('recon', 'fees-treasury-objectives', 'Fees and Treasury Objectives', 'Read docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, '{"questions":4,"pass_score":3}'::jsonb),
    ('recon', 'security-safety-recon', 'Security & Safety Recon', 'Read docs and pass a 4-question quiz.', 350, 'docs_quiz', false, null::int, null::int, 86400, '{"questions":4,"pass_score":3}'::jsonb),

    ('reinforcements', 'read-recruiter-program', 'Read Recruiter Program', 'Read recruiter docs and pass a 4-question quiz.', 300, 'docs_quiz', false, null::int, null::int, 86400, '{"questions":4,"pass_score":3}'::jsonb),
    ('reinforcements', 'apply-recruiter-program', 'Apply for Recruiter Program', 'Submit recruiter application.', 500, 'recruiter_application_submitted', false, null::int, null::int, null::int, '{}'::jsonb),
    ('reinforcements', 'accepted-recruiter-program', 'Get Accepted for the Recruiter Program', 'Admin approves recruiter.', 2000, 'recruiter_application_accepted', false, null::int, null::int, null::int, '{}'::jsonb),
    ('reinforcements', 'add-recruiter-link-x-bio', 'Add Recruiter Link to X Bio', 'Add referral link to X bio.', 750, 'x_bio_link', false, null::int, null::int, 86400, '{"requires_admin_review":true}'::jsonb),
    ('reinforcements', 'call-for-reinforcements', 'Call for Reinforcements', 'Write X post recruiting your squad.', 750, 'x_unique_post_likes', false, null::int, null::int, 86400, '{}'::jsonb),
    ('reinforcements', 'assemble-fireteam', 'Assemble a Fireteam', '2 verified recruits.', 1000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":2}'::jsonb),
    ('reinforcements', 'form-full-squad', 'Form a Full Squad', '4 verified recruits.', 2000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":4}'::jsonb),
    ('reinforcements', 'expand-vanguard', 'Expand the Vanguard', '6 verified recruits.', 3000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":6}'::jsonb),
    ('reinforcements', 'build-platoon', 'Build the Platoon', '8 verified recruits.', 4000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":8}'::jsonb),
    ('reinforcements', 'deploy-strike-force', 'Deploy a Strike Force', '10 verified recruits.', 6000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":10}'::jsonb),
    ('reinforcements', 'lead-battalion', 'Lead a Battalion', '20 verified recruits.', 15000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":20}'::jsonb),
    ('reinforcements', 'mobilize-brigade', 'Mobilize a Brigade', '30 verified recruits.', 30000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits":30}'::jsonb),
    ('reinforcements', 'activate-warband', 'Activate the Warband', '5 recruits complete Start Here.', 5000, 'referral_count_verified', false, null::int, null::int, null::int, '{"verified_recruits_completed_start_here":5}'::jsonb)
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
select qt.id, case when qt.repeatable then 'daily' else 'once' end, qt.xp_reward, true, qt.metadata
from public.wm_quest_templates qt
where not exists (
  select 1 from public.wm_quest_instances qi
  where qi.quest_template_id = qt.id and qi.period_type = case when qt.repeatable then 'daily' else 'once' end and qi.period_start is null
);
