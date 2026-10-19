-- ════════════════════════════════════════════════════════════════════════════
--  EDEN — Ficha de Jogador · esquema Supabase
--  Cole TUDO no SQL Editor do Supabase e clique em "Run" (uma única vez).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  codigo      text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  gm          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome    text,
  primary key (room_id, user_id)
);

create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_id     uuid references public.rooms(id) on delete set null,
  nome        text not null default '',
  jogador     text not null default '',
  casca       text not null default '',
  nivel       int  not null default 1 check (nivel between 1 and 99),
  morto       boolean not null default false,
  data_morte  timestamptz,
  foto        text,
  galeria     jsonb not null default '[]'::jsonb,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists characters_owner_idx on public.characters(owner);
create index if not exists characters_room_idx  on public.characters(room_id);

-- Funções auxiliares (SECURITY DEFINER evita recursão nas políticas)
create or replace function public.is_gm(r uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.rooms where id = r and gm = auth.uid()) $$;

create or replace function public.is_member(r uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid()) $$;

-- REGRA DO LIVRO (3.1/9.6), imposta também no servidor:
-- pontos de atributo arquivados ≤ espaços do nível (1→2, 2→3, 3→4, 4→5, 5+→6)
create or replace function public.check_character() returns trigger
language plpgsql as $$
declare lim int; usados int;
begin
  lim := least(greatest(new.nivel, 1), 5) + 1;
  usados := case when jsonb_typeof(new.data->'arquivados') = 'array'
                 then jsonb_array_length(new.data->'arquivados') else 0 end;
  if usados > lim then
    raise exception 'Limite de pontos arquivados excedido (% de % espaços no nível %)', usados, lim, new.nivel;
  end if;
  if tg_op = 'UPDATE' and new.owner <> old.owner then
    raise exception 'O dono da ficha não pode ser alterado';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists characters_check on public.characters;
create trigger characters_check before insert or update on public.characters
  for each row execute function public.check_character();

-- Segurança por linha (RLS)
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;
alter table public.characters   enable row level security;

drop policy if exists rooms_select on public.rooms;
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;
create policy rooms_select on public.rooms for select using (gm = auth.uid() or public.is_member(id));
create policy rooms_insert on public.rooms for insert with check (gm = auth.uid());
create policy rooms_update on public.rooms for update using (gm = auth.uid());
create policy rooms_delete on public.rooms for delete using (gm = auth.uid());

drop policy if exists members_select on public.room_members;
drop policy if exists members_delete on public.room_members;
create policy members_select on public.room_members for select using (user_id = auth.uid() or public.is_gm(room_id));
create policy members_delete on public.room_members for delete using (user_id = auth.uid() or public.is_gm(room_id));

drop policy if exists chars_select on public.characters;
drop policy if exists chars_insert on public.characters;
drop policy if exists chars_update on public.characters;
drop policy if exists chars_delete on public.characters;
-- O jogador vê as próprias fichas; o Mestre vê (e pode editar) as fichas das suas salas.
create policy chars_select on public.characters for select using (owner = auth.uid() or public.is_gm(room_id));
create policy chars_insert on public.characters for insert
  with check (owner = auth.uid() and (room_id is null or public.is_member(room_id) or public.is_gm(room_id)));
create policy chars_update on public.characters for update
  using (owner = auth.uid() or public.is_gm(room_id))
  with check (
    (owner = auth.uid() and (room_id is null or public.is_member(room_id) or public.is_gm(room_id)))
    or public.is_gm(room_id)
  );
create policy chars_delete on public.characters for delete using (owner = auth.uid());

-- RPCs
create or replace function public.entrar_sala(p_codigo text, p_nome text) returns public.rooms
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from public.rooms where codigo = upper(trim(p_codigo));
  if not found then return null; end if;
  insert into public.room_members(room_id, user_id, nome) values (r.id, auth.uid(), p_nome)
    on conflict do nothing;
  return r;
end $$;

create or replace function public.sair_sala(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.characters set room_id = null where owner = auth.uid() and room_id = p_room;
  delete from public.room_members where room_id = p_room and user_id = auth.uid();
end $$;

create or replace function public.remover_da_sala(p_char uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.characters set room_id = null
   where id = p_char and public.is_gm(room_id);
end $$;

revoke all on function public.entrar_sala(text, text), public.sair_sala(uuid), public.remover_da_sala(uuid) from public, anon;
grant execute on function public.entrar_sala(text, text), public.sair_sala(uuid), public.remover_da_sala(uuid) to authenticated;

-- Tempo real: o Mestre vê as fichas mudando ao vivo
do $$ begin
  alter publication supabase_realtime add table public.characters;
exception when duplicate_object then null; end $$;
