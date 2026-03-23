-- Hydra App - Initial Schema

-- ENUMS

create type public.user_role as enum (
  'starter',
  'leader',
  'supporter',
  'core_leader',
  'team_leader',
  'assistant_manager',
  'partner_manager',
  'manager',
  'owner',
  'hr'
);

create type public.tipo_contratto as enum (
  'street',
  'evento'
);

create type public.user_status as enum (
  'pending',
  'active',
  'suspended'
);

create type public.tipo_bonus as enum (
  'primo_pezzo',
  'tripletta',
  'poker',
  'manita',
  'prime_due_settimane'
);

create type public.disponibilita_slot as enum (
  'full',
  'mattina',
  'pomeriggio',
  'mezzo_turno',
  'ufficio',
  'assente'
);

-- TABLES

-- teams (created before profiles because profiles references it)
create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  leader_id     uuid,
  created_at    timestamptz not null default now()
);

-- profiles (extends auth.users)
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  email             text,
  role              public.user_role not null default 'starter',
  team_id           uuid references public.teams (id) on delete set null,
  domicilio         text,
  mezzi_trasporto   text,
  tipo_contratto    public.tipo_contratto,
  data_inizio       date,
  status            public.user_status not null default 'pending',
  created_at        timestamptz not null default now()
);

-- add fk on teams.leader_id now that profiles exists
alter table public.teams
  add constraint teams_leader_id_fkey
  foreign key (leader_id) references public.profiles (id) on delete set null;

-- pezzi (daily entries)
create table public.pezzi (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  data              date not null,
  numero_pezzi      integer not null check (numero_pezzi >= 0),
  tipo              public.tipo_contratto not null,
  mix_value         integer not null check (mix_value in (15, 17, 20, 25, 30)),
  commissione       numeric(10, 2) not null default 0,
  fail              integer not null default 0 check (fail >= 0),
  note              text,
  settimana_inizio  date not null,
  created_at        timestamptz not null default now()
);

-- bonus
create table public.bonus (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tipo        public.tipo_bonus not null,
  data        date not null,
  importo     numeric(10, 2) not null default 0,
  verificato  boolean not null default false,
  note        text,
  created_at  timestamptz not null default now()
);

-- disponibilita
create table public.disponibilita (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  settimana_inizio  date not null,
  martedi           public.disponibilita_slot not null default 'assente',
  mercoledi         public.disponibilita_slot not null default 'assente',
  giovedi           public.disponibilita_slot not null default 'assente',
  venerdi           public.disponibilita_slot not null default 'assente',
  sabato            public.disponibilita_slot not null default 'assente',
  domenica          public.disponibilita_slot not null default 'assente',
  created_at        timestamptz not null default now(),
  unique (user_id, settimana_inizio)
);

-- commissioni_lookup
create table public.commissioni_lookup (
  mix_value           integer primary key check (mix_value in (15, 17, 20, 25, 30)),
  starter_street      numeric(10, 2) not null,
  starter_evento      numeric(10, 2) not null,
  profitto_team_1     numeric(10, 2) not null,
  profitto_team_2     numeric(10, 2) not null
);

-- SEED: commissioni_lookup

insert into public.commissioni_lookup (mix_value, starter_street, starter_evento, profitto_team_1, profitto_team_2)
values
  (15, 40,  33, 40,  47),
  (17, 50,  40, 50,  60),
  (20, 55,  47, 60,  68),
  (25, 62,  55, 70,  77),
  (30, 70,  60, 100, 110);

-- INDEXES

create index idx_pezzi_user_id          on public.pezzi (user_id);
create index idx_pezzi_data             on public.pezzi (data);
create index idx_pezzi_settimana_inizio on public.pezzi (settimana_inizio);
create index idx_bonus_user_id          on public.bonus (user_id);
create index idx_bonus_data             on public.bonus (data);
create index idx_disponibilita_user_id  on public.disponibilita (user_id);
create index idx_profiles_team_id       on public.profiles (team_id);
create index idx_profiles_role          on public.profiles (role);

-- TRIGGER: auto-create profile on auth.users insert

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- HELPERS: role checks for RLS

create or replace function public.is_hr_or_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('hr', 'manager', 'owner', 'partner_manager', 'assistant_manager', 'team_leader')
  );
$$;

create or replace function public.is_hr()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'hr'
  );
$$;

-- ROW LEVEL SECURITY

alter table public.profiles           enable row level security;
alter table public.teams              enable row level security;
alter table public.pezzi              enable row level security;
alter table public.bonus              enable row level security;
alter table public.disponibilita      enable row level security;
alter table public.commissioni_lookup enable row level security;

-- profiles

create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: hr_manager read all"
  on public.profiles for select
  using (public.is_hr_or_manager());

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: hr update all"
  on public.profiles for update
  using (public.is_hr());

-- teams

create policy "teams: authenticated read"
  on public.teams for select
  using (auth.role() = 'authenticated');

create policy "teams: hr_manager insert"
  on public.teams for insert
  with check (public.is_hr_or_manager());

create policy "teams: hr_manager update"
  on public.teams for update
  using (public.is_hr_or_manager());

-- pezzi

create policy "pezzi: own insert"
  on public.pezzi for insert
  with check (auth.uid() = user_id);

create policy "pezzi: own read"
  on public.pezzi for select
  using (auth.uid() = user_id);

create policy "pezzi: hr_manager read all"
  on public.pezzi for select
  using (public.is_hr_or_manager());

create policy "pezzi: hr update"
  on public.pezzi for update
  using (public.is_hr());

create policy "pezzi: own update"
  on public.pezzi for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- bonus

create policy "bonus: own insert"
  on public.bonus for insert
  with check (auth.uid() = user_id and verificato = false);

create policy "bonus: own read"
  on public.bonus for select
  using (auth.uid() = user_id);

create policy "bonus: hr_manager read all"
  on public.bonus for select
  using (public.is_hr_or_manager());

create policy "bonus: hr update"
  on public.bonus for update
  using (public.is_hr());

-- disponibilita

create policy "disponibilita: own insert"
  on public.disponibilita for insert
  with check (auth.uid() = user_id);

create policy "disponibilita: own update"
  on public.disponibilita for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "disponibilita: own read"
  on public.disponibilita for select
  using (auth.uid() = user_id);

create policy "disponibilita: hr_manager read all"
  on public.disponibilita for select
  using (public.is_hr_or_manager());

-- commissioni_lookup

create policy "commissioni_lookup: authenticated read"
  on public.commissioni_lookup for select
  using (auth.role() = 'authenticated');

create policy "commissioni_lookup: hr update"
  on public.commissioni_lookup for update
  using (public.is_hr());
