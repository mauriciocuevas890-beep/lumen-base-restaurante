-- ============================================================
-- Lumen Base POS — Esquema Supabase (FASE 2, YA APLICADO)
-- Este es el SQL que se ejecutó en el proyecto 'lumenbase'.
-- Multi-inquilino con login: cada usuario accede solo a su(s) negocio(s),
-- usando tu tabla 'perfiles' (user_id -> cliente_id / rol agencia|cliente).
-- ============================================================

-- Tabla de estado del POS por negocio (el negocio_id = clientes.id / perfiles.cliente_id)
create table if not exists public.negocio_estado (
  negocio_id text primary key,
  datos jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
alter table public.negocio_estado enable row level security;

-- Función que decide si el usuario logueado puede ver un negocio.
-- SECURITY DEFINER: la verificación ignora la RLS de 'perfiles' de forma segura
-- (solo devuelve verdadero/falso sobre el usuario actual).
create or replace function public.usuario_puede_negocio(nid text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    -- el cliente dueño de ese negocio
    select 1 from perfiles p
      where p.user_id = auth.uid() and p.cliente_id = nid
    union
    -- la agencia a la que pertenece ese cliente
    select 1 from perfiles a
      join perfiles c on c.agencia_id = a.agencia_id
      where a.user_id = auth.uid() and a.rol = 'agencia'
        and c.rol = 'cliente' and c.cliente_id = nid
  );
$$;

-- Política: solo usuarios autenticados, y solo su(s) negocio(s).
drop policy if exists "acceso_anon_fase1" on public.negocio_estado;   -- (era la Fase 1 abierta)
drop policy if exists "pos_acceso_por_perfil" on public.negocio_estado;
create policy "pos_acceso_por_perfil" on public.negocio_estado
  for all to authenticated
  using ( public.usuario_puede_negocio(negocio_id) )
  with check ( public.usuario_puede_negocio(negocio_id) );

-- ============================================================
-- Verificado el 2026-07-21:
--   * Sin sesión: LECTURA devuelve 0 filas, ESCRITURA da 401 (RLS).
--   * Con sesión: el usuario ve solo su negocio (cliente) o los de su agencia.
-- ============================================================
