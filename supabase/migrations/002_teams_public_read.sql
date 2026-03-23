-- Allow unauthenticated (anon) users to read teams.
-- Required so the team dropdown works on the registration page
-- before the user has a session.

drop policy if exists "teams: authenticated read" on public.teams;

create policy "teams: public read"
  on public.teams for select
  using (true);
