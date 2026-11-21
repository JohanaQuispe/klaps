-- KLAPS · vinculación de contactos de emergencia por Telegram
-- Cada fila es la pareja «código de sesión → chat de Telegram».
-- El código lo genera el navegador (KLAPS-84920) y solo se escribe desde la
-- función `klaps-telegram`, que usa la service_role key. Sin políticas de RLS,
-- la tabla es invisible para el cliente: el frontend nunca lee ni escribe aquí.

create table if not exists public.telegram_links (
  code text primary key,
  chat_id bigint not null,
  chat_name text not null default '',
  linked_at timestamptz not null default now(),
  last_verified_at timestamptz,
  last_sent_at timestamptz
);

create index if not exists telegram_links_chat_id_idx on public.telegram_links (chat_id);

alter table public.telegram_links enable row level security;

-- Sin políticas: solo la service_role (que las ignora) puede acceder.
comment on table public.telegram_links is
  'KLAPS: código de vinculación → chat de Telegram. Solo la función klaps-telegram la usa.';
