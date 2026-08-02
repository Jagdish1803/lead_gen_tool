-- ============================================================
-- Pitching Tool — database schema
-- Run this in the Supabase SQL editor (or via CLI) once the
-- project exists. Idempotent-ish: safe to re-run in dev.
-- ============================================================

-- ---------- Enums -------------------------------------------

-- Pipeline stage a business moves through.
do $$ begin
  create type business_status as enum (
    'found',       -- pulled from SerpApi, not yet audited
    'audited',     -- website checked
    'drafted',     -- AI message written
    'queued',      -- message queued for sending
    'contacted',   -- message sent over WhatsApp
    'replied',     -- business replied
    'interested',  -- warm / asked pricing / meeting
    'client',      -- converted
    'skipped',     -- deliberately not pursued (no phone, etc.)
    'failed'       -- something errored on this lead
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type search_status as enum ('running', 'done', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('queued', 'sending', 'sent', 'failed', 'replied');
exception when duplicate_object then null; end $$;

-- ---------- searches ----------------------------------------
-- One row per "find businesses" run (business type + location).
create table if not exists public.searches (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_type  text not null,
  location       text not null,
  status         search_status not null default 'running',
  results_count  int not null default 0,
  error          text
);

-- ---------- businesses --------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  search_id     uuid references public.searches(id) on delete set null,

  -- from Google Maps / SerpApi
  place_id      text,                    -- Google place id, for dedupe
  name          text not null,
  phone         text,
  website       text,
  address       text,
  maps_url      text,
  category      text,
  rating        numeric(2,1),
  reviews_count int,

  -- pipeline
  status        business_status not null default 'found',
  notes         text,

  unique (place_id)
);

create index if not exists businesses_search_idx on public.businesses(search_id);
create index if not exists businesses_status_idx on public.businesses(status);

-- ---------- audits ------------------------------------------
-- One row per website audit of a business.
create table if not exists public.audits (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  business_id       uuid not null references public.businesses(id) on delete cascade,

  has_website       boolean not null,
  pagespeed_mobile  int,          -- 0-100 Lighthouse perf score
  pagespeed_desktop int,          -- 0-100
  mobile_ok         boolean,      -- responsive / viewport present
  https             boolean,      -- served over https
  issues            jsonb not null default '[]'::jsonb,  -- ["no_https","slow_mobile",...]
  summary           text,         -- human-readable audit summary
  screenshot_url    text
);

create index if not exists audits_business_idx on public.audits(business_id);

-- ---------- messages ----------------------------------------
-- Outbound (and later inbound) messages per business.
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses(id) on delete cascade,

  channel       text not null default 'whatsapp',
  direction     text not null default 'outbound',    -- 'outbound' | 'inbound'
  template_key  text,                                -- 'no_website' | 'poor_website'
  body          text not null,
  status        message_status not null default 'queued',

  scheduled_at  timestamptz,     -- when the pacing engine plans to send it
  sent_at       timestamptz,
  error         text
);

create index if not exists messages_business_idx on public.messages(business_id);
create index if not exists messages_status_idx on public.messages(status);
create index if not exists messages_scheduled_idx on public.messages(scheduled_at);

-- ---------- events ------------------------------------------
-- Pipeline timeline / audit log for the dashboard + debugging.
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_id   uuid references public.businesses(id) on delete cascade,
  stage         text not null,        -- 'finder' | 'auditor' | 'writer' | 'sender'
  level         text not null default 'info',  -- 'info' | 'warn' | 'error'
  message       text not null,
  meta          jsonb
);

create index if not exists events_business_idx on public.events(business_id);
create index if not exists events_created_idx on public.events(created_at desc);

-- ---------- app_settings (singleton) ------------------------
-- Sending controls for the WhatsApp pacing engine.
create table if not exists public.app_settings (
  id               int primary key default 1 check (id = 1),
  sending_enabled  boolean not null default false,  -- master send switch (OFF by default)
  min_delay_sec    int not null default 180,        -- 3 min
  max_delay_sec    int not null default 300,        -- 5 min
  daily_cap        int not null default 30,         -- max sends per day per number
  updated_at       timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------- whatsapp_state (singleton) ----------------------
-- Live status of the Baileys worker, written by the worker, read by the UI.
create table if not exists public.whatsapp_state (
  id               int primary key default 1 check (id = 1),
  status           text not null default 'disconnected', -- disconnected|connecting|qr|connected
  qr               text,          -- current QR string to scan (when status = 'qr')
  phone            text,          -- linked number once connected
  last_error       text,
  sent_today       int not null default 0,
  sent_today_date  date,
  updated_at       timestamptz not null default now()
);
insert into public.whatsapp_state (id) values (1) on conflict (id) do nothing;

-- ---------- Row Level Security ------------------------------
-- Solo internal tool for now: all DB access happens server-side with the
-- service-role key (which bypasses RLS). We enable RLS with NO public
-- policies so the anon/public key can't read or write anything by default.
-- When we add auth / multi-user, we'll add proper policies here.
alter table public.searches      enable row level security;
alter table public.businesses    enable row level security;
alter table public.audits        enable row level security;
alter table public.messages      enable row level security;
alter table public.events        enable row level security;
alter table public.app_settings  enable row level security;
alter table public.whatsapp_state enable row level security;
