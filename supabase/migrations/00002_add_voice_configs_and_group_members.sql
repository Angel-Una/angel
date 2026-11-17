-- 语音 API 配置表（TTS/ASR，OpenAI 兼容）
create table public.voice_configs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  base_url text not null,
  api_key text not null,
  tts_model text not null,
  asr_model text not null,
  scope text not null default 'global',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.voice_configs enable row level security;
create policy "voice_configs_all_anon" on public.voice_configs for all to anon using (true) with check (true);
create policy "voice_configs_all_auth" on public.voice_configs for all to authenticated using (true) with check (true);
create index idx_voice_configs_contact on public.voice_configs(contact_id);

-- 群成员表
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.contacts(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, contact_id)
);
alter table public.group_members enable row level security;
create policy "group_members_all_anon" on public.group_members for all to anon using (true) with check (true);
create policy "group_members_all_auth" on public.group_members for all to authenticated using (true) with check (true);
create index idx_group_members_group on public.group_members(group_id);