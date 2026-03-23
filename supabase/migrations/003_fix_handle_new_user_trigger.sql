-- Fix handle_new_user trigger to read role, team_id, and data_inizio
-- from raw_user_meta_data passed during signUp.
-- This avoids a separate UPDATE call after signup which fails when
-- there is no active session (e.g. email confirmation enabled).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_role    public.user_role;
begin
  -- Parse role safely, default to 'starter' if missing or invalid
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'starter')::public.user_role;
  exception when invalid_text_representation then
    v_role := 'starter';
  end;

  -- Parse team_id safely, null if missing or empty string
  begin
    v_team_id := nullif(trim(coalesce(new.raw_user_meta_data->>'team_id', '')), '')::uuid;
  exception when invalid_text_representation then
    v_team_id := null;
  end;

  insert into public.profiles (id, email, full_name, role, team_id, data_inizio)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_team_id,
    current_date
  );

  return new;
end;
$$;
