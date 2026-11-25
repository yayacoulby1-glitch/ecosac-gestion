-- ECOSAC Gestion : base de données Supabase
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis cliquer « Run ».
-- IMPORTANT : la première personne qui crée un compte devient automatiquement administrateur.
-- Créez donc votre propre compte juste après avoir exécuté ce script.

-- 1. Membres autorisés -------------------------------------------------------
create table if not exists public.membres (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text,
  nom      text,
  role     text not null default 'saisie' check (role in ('admin','saisie')),
  cree_le  timestamptz not null default now()
);

-- 2. Toutes les données de l'application ----------------------------------------
-- Une ligne par enregistrement ; « collection » vaut conteneurs, ventes, produits, etc.
create table if not exists public.records (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  maj        timestamptz not null default now(),
  maj_par    uuid default auth.uid() references auth.users(id) on delete set null,
  primary key (collection, id)
);
alter table public.records replica identity full;

-- Historique simple : qui a modifié quoi et quand
create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.maj := now();
  new.maj_par := auth.uid();
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.records_touch();

-- 3. Règles d'accès -----------------------------------------------------------------
create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres where user_id = auth.uid())
$$;
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres where user_id = auth.uid() and role = 'admin')
$$;

alter table public.records enable row level security;
alter table public.membres enable row level security;

drop policy if exists "membres lisent" on public.records;
drop policy if exists "membres ajoutent" on public.records;
drop policy if exists "membres modifient" on public.records;
drop policy if exists "membres suppriment" on public.records;
create policy "membres lisent"     on public.records for select to authenticated using (public.est_membre());
create policy "membres ajoutent"   on public.records for insert to authenticated with check (public.est_membre());
create policy "membres modifient"  on public.records for update to authenticated using (public.est_membre()) with check (public.est_membre());
create policy "membres suppriment" on public.records for delete to authenticated using (public.est_membre());

drop policy if exists "voir son compte ou admin" on public.membres;
drop policy if exists "admin modifie" on public.membres;
drop policy if exists "admin retire" on public.membres;
create policy "voir son compte ou admin" on public.membres for select to authenticated using (user_id = auth.uid() or public.est_admin());
create policy "admin modifie" on public.membres for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "admin retire"  on public.membres for delete to authenticated using (public.est_admin() and user_id <> auth.uid());
-- Pas de règle d'ajout direct : on passe par la fonction ajouter_membre ci-dessous.

-- 4. Le premier compte créé devient administrateur ----------------------------------
create or replace function public.premier_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.membres) then
    insert into public.membres (user_id, email, nom, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nom', ''), 'admin');
  end if;
  return new;
end $$;
drop trigger if exists premier_admin on auth.users;
create trigger premier_admin after insert on auth.users
  for each row execute function public.premier_admin();

-- 5. L'administrateur donne accès à une personne qui a créé son compte ----------------
create or replace function public.ajouter_membre(p_email text, p_role text default 'saisie') returns text
language plpgsql security definer set search_path = public as $$
declare u auth.users%rowtype;
begin
  if not public.est_admin() then raise exception 'réservé à l''administrateur' using errcode = '42501'; end if;
  if p_role not in ('admin','saisie') then p_role := 'saisie'; end if;
  select * into u from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if u.id is null then return 'inconnu'; end if;
  insert into public.membres (user_id, email, nom, role)
  values (u.id, u.email, coalesce(u.raw_user_meta_data->>'nom', ''), p_role)
  on conflict (user_id) do update set role = excluded.role;
  return 'ok';
end $$;
revoke all on function public.ajouter_membre(text, text) from public, anon;
grant execute on function public.ajouter_membre(text, text) to authenticated;

-- 6. Mise à jour en temps réel entre les appareils -------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
