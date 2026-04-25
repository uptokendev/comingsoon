# War Missions Closeout Checklist

Use this as the living QA checklist before replacing Zealy or treating War Missions as launch-ready.

Latest repo audit: [War Missions Closeout Audit](./war-missions-closeout-audit.md).

## A. Product Checklist

- [ ] War Missions page exists.
- [ ] Start Here category exists.
- [ ] Daily Warpath category exists.
- [ ] Black Market Contracts category exists.
- [ ] Recon & Interrogation category exists.
- [ ] Operation: Reinforcements category exists.
- [ ] All Zealy-equivalent quests are seeded.
- [ ] XP values are configured in the database.
- [ ] Quest descriptions are visible and clear.
- [ ] Users can see completed, pending, rejected, and available quests.
- [ ] Users can see total XP.
- [ ] Users can see daily streak.
- [ ] Users can see leaderboard position.
- [ ] Users can see pending review status.

## B. Wallet/Auth Checklist

- [ ] Wallet connect works.
- [ ] Nonce is generated server-side.
- [ ] Signature verification works.
- [ ] Nonce expires.
- [ ] Nonce cannot be reused.
- [ ] User profile is created after wallet verification.
- [ ] Existing users are retrieved correctly.
- [ ] Take the Oath auto-completes after wallet verification.
- [ ] Banned users cannot complete quests.
- [ ] Admin users are recognized correctly.

## C. Supabase Checklist

- [ ] All migrations apply cleanly.
- [ ] RLS policies are enabled.
- [ ] Public users cannot read private admin data.
- [ ] Users can only read/update their own completion data.
- [ ] Admins can manage quests.
- [ ] Admins can review completions.
- [ ] Admin actions are logged.
- [ ] TypeScript DB types are generated.
- [ ] Seed script creates categories.
- [ ] Seed script creates all initial quest templates.
- [ ] Seed script can be safely rerun without duplicates.

## D. Quest Engine Checklist

- [ ] Quest templates work.
- [ ] Quest instances work.
- [ ] One-time quests cannot be completed twice.
- [ ] Daily quests reset at 00:00 UTC.
- [ ] Repeatable quests respect limits.
- [ ] Cooldowns work.
- [ ] Quest status flow works: pending, verified, rejected, revoked, review.
- [ ] XP is only awarded after verification.
- [ ] XP ledger records every XP grant.
- [ ] XP can be revoked.
- [ ] Revoked XP is removed from totals.
- [ ] Rejected quests show reason codes.
- [ ] Pending quests do not award XP early.

## E. Social Verification Checklist

- [ ] X account linking works.
- [ ] X follow verification works.
- [ ] X post URL submission works.
- [ ] X post ownership is checked.
- [ ] X required tag/mention is checked.
- [ ] X like count check works.
- [ ] X impression threshold check works.
- [ ] X quote URL check works.
- [ ] X reply URL check works.
- [ ] Telegram linking works.
- [ ] Telegram group membership check works.
- [ ] Discord linking works.
- [ ] Discord server membership check works.
- [ ] Social account uniqueness is enforced.
- [ ] Failed social checks show clear user messages.
- [ ] Social verification errors create logs.

## F. Daily Warpath Checklist

- [ ] Daily Warpath quests generate daily.
- [ ] Daily reset works at 00:00 UTC.
- [ ] Daily progress is stored.
- [ ] Daily XP cap works.
- [ ] Complete-all bonus works.
- [ ] Streak increments after daily completion.
- [ ] Streak does not increment twice in one day.
- [ ] Missed day breaks or freezes streak according to config.
- [ ] Maintain Radio Discipline rules work.
- [ ] Low-quality community messages are excluded.
- [ ] Daily UI shows reset countdown.
- [ ] Daily UI shows current progress.

## G. Black Market Contracts Checklist

- [ ] All four impression tiers exist.
- [ ] Users can submit X post URLs.
- [ ] Metrics are snapshotted.
- [ ] Posts below threshold stay pending.
- [ ] Recheck job works.
- [ ] Expired posts are rejected or expired.
- [ ] Highest-tier-only logic works.
- [ ] 5,000-impression quest requires manual review.
- [ ] Duplicate/copy-paste content can be flagged.
- [ ] Deleted/unavailable posts can be revoked.
- [ ] Admin notification is created for high-XP submissions.

## H. Quiz Checklist

- [ ] Quiz questions are stored in Supabase.
- [ ] Admin can edit quiz questions.
- [ ] User receives 4 questions.
- [ ] Answer order is randomized.
- [ ] Passing requires 3/4 correct.
- [ ] Failed quiz can be retried after cooldown.
- [ ] Passed quiz completes related quest.
- [ ] Quiz attempts are stored.
- [ ] User cannot farm repeated quiz XP.

## I. Recruiter / Reinforcements Checklist

- [ ] Recruiter application form exists.
- [ ] Application writes to Supabase.
- [ ] Admin receives notification.
- [ ] Admin can accept application.
- [ ] Admin can reject application.
- [ ] Accepted user becomes recruiter.
- [ ] Referral code/link is generated.
- [ ] Referral link tracking works.
- [ ] Referral attribution persists before wallet connect.
- [ ] Referred user links on wallet connect.
- [ ] Verified recruit counting works.
- [ ] Recruit milestones complete correctly.
- [ ] Same recruit cannot count twice.
- [ ] Suspicious recruits can be rejected.
- [ ] X bio link quest can be reviewed.
- [ ] Recruiting post quest works.
- [ ] Activate the Warband requires active recruits, not just signups.

## J. Leaderboard / Prize Checklist

- [ ] Current leaderboard works.
- [ ] Weekly leaderboard works.
- [ ] Season leaderboard works.
- [ ] All-time leaderboard works.
- [ ] Leaderboards exclude banned users.
- [ ] Leaderboards exclude revoked XP.
- [ ] Leaderboard snapshot can be generated.
- [ ] Prize pool can be created.
- [ ] Winners can be selected manually or by raffle logic.
- [ ] Winners can be published.
- [ ] Winner status can be marked pending, approved, paid, or disqualified.
- [ ] Public winner page exists.

## K. Admin Checklist

- [ ] Admin mission manager works.
- [ ] Admin category manager works.
- [ ] Admin quest template manager works.
- [ ] Admin completion review works.
- [ ] Admin notification center works.
- [ ] Admin recruiter application page works.
- [ ] Admin user risk page works.
- [ ] Admin can revoke XP.
- [ ] Admin can ban user.
- [ ] Admin can resolve notifications.
- [ ] Admin audit log records key actions.
- [ ] Admin pages are protected from normal users.

## L. Security / Abuse Checklist

- [ ] RLS prevents users from editing XP.
- [ ] RLS prevents users from approving their own quests.
- [ ] Users cannot spoof another wallet.
- [ ] Users cannot reuse another social account.
- [ ] Users cannot complete one-time quests twice.
- [ ] Users cannot bypass pending review.
- [ ] Admin-only functions require admin role or allowlisted admin wallet.
- [ ] Edge functions validate all inputs.
- [ ] Rate limits exist for quest submissions.
- [ ] Suspicious repeated submissions are flagged.
- [ ] Logs exist for failed verification attempts.
- [ ] High-XP rewards require stronger review.
- [ ] Recruit milestones use verified recruits only.

## M. QA / Smoke Test Checklist

Test with at least these users:

- [ ] Normal user
- [ ] Already-following X user
- [ ] Already-in-Telegram user
- [ ] Already-in-Discord user
- [ ] Recruiter applicant
- [ ] Approved recruiter
- [ ] Referred user
- [ ] Suspicious duplicate user
- [ ] Admin user
- [ ] Banned user

Required smoke tests:

- [ ] New user completes Start Here.
- [ ] Existing social follower gets auto XP.
- [ ] Daily Warpath resets correctly.
- [ ] X post with 0 likes stays pending.
- [ ] X post with 3 likes verifies.
- [ ] X quote with 50 impressions verifies.
- [ ] Black Market post reaches highest tier only.
- [ ] Quiz passes at 3/4.
- [ ] Quiz fails at 2/4.
- [ ] Recruiter application creates admin notification.
- [ ] Admin approves recruiter.
- [ ] Recruiter link attributes new user.
- [ ] Recruit milestone completes at correct count.
- [ ] XP revoke updates leaderboard.
- [ ] Banned user disappears from leaderboard.
- [ ] Weekly leaderboard snapshot works.

## Final Definition of Done

War Missions is ready to launch when:

- [ ] Users can connect wallet.
- [ ] Users can link socials.
- [ ] Users can complete Start Here.
- [ ] Users can complete Daily Warpath.
- [ ] Users can submit Black Market Contracts.
- [ ] Users can complete quizzes.
- [ ] Users can apply as recruiter.
- [ ] Users can recruit verified users.
- [ ] Users earn XP through the ledger.
- [ ] Users appear on leaderboards.
- [ ] Admins can review users and submissions without manual database edits.

The first production release is closed only when:

- [ ] All seeded Zealy-equivalent quests exist.
- [ ] All core verification types work or have manual review fallback.
- [ ] XP ledger is accurate.
- [ ] Leaderboards are accurate.
- [ ] Admin review is functional.
- [ ] Recruiter application and referral tracking work.
- [ ] Daily reset works.
- [ ] Anti-abuse basics are active.
- [ ] QA smoke tests pass.
- [ ] No critical admin flow requires editing Supabase rows manually.
