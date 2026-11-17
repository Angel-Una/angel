-- 单用户个人应用，无登录：所有表启用 RLS 并对 anon/authenticated 全量放开

-- 我的资料（头像/昵称，单行）
create table profile (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '我',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 联系人 / 群聊
create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

-- 消息（按 contact_id 隔离）
create table messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  side text not null check (side in ('me','other')),
  type text not null check (type in ('text','image','sticker')),
  content text,
  image_url text,
  created_at timestamptz not null default now()
);
create index idx_messages_contact on messages(contact_id, created_at);

-- API 配置（contact_id 为空 = 全局）
create table api_configs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  base_url text not null,
  api_key text not null,
  model text not null,
  scope text not null default 'global',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 表情包（owner_type: me / contact）
create table stickers (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('me','contact')),
  contact_id uuid references contacts(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

-- 会话美化设置（气泡样式 + 背景图）
create table chat_settings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references contacts(id) on delete cascade,
  bubble_style text not null default 'default',
  background_url text,
  updated_at timestamptz not null default now()
);

-- 启用 RLS
alter table profile enable row level security;
alter table contacts enable row level security;
alter table messages enable row level security;
alter table api_configs enable row level security;
alter table stickers enable row level security;
alter table chat_settings enable row level security;

-- 全量放开策略（单用户个人应用）
create policy "profile_all_anon" on profile for all to anon using (true) with check (true);
create policy "profile_all_auth" on profile for all to authenticated using (true) with check (true);
create policy "contacts_all_anon" on contacts for all to anon using (true) with check (true);
create policy "contacts_all_auth" on contacts for all to authenticated using (true) with check (true);
create policy "messages_all_anon" on messages for all to anon using (true) with check (true);
create policy "messages_all_auth" on messages for all to authenticated using (true) with check (true);
create policy "api_configs_all_anon" on api_configs for all to anon using (true) with check (true);
create policy "api_configs_all_auth" on api_configs for all to authenticated using (true) with check (true);
create policy "stickers_all_anon" on stickers for all to anon using (true) with check (true);
create policy "stickers_all_auth" on stickers for all to authenticated using (true) with check (true);
create policy "chat_settings_all_anon" on chat_settings for all to anon using (true) with check (true);
create policy "chat_settings_all_auth" on chat_settings for all to authenticated using (true) with check (true);

-- Storage bucket（头像/表情包/图片/背景图）
insert into storage.buckets (id, name, public) values ('chat-assets', 'chat-assets', true);

create policy "assets_read_anon" on storage.objects for select to anon using (bucket_id = 'chat-assets');
create policy "assets_insert_anon" on storage.objects for insert to anon with check (bucket_id = 'chat-assets');
create policy "assets_update_anon" on storage.objects for update to anon using (bucket_id = 'chat-assets') with check (bucket_id = 'chat-assets');
create policy "assets_delete_anon" on storage.objects for delete to anon using (bucket_id = 'chat-assets');
create policy "assets_read_auth" on storage.objects for select to authenticated using (bucket_id = 'chat-assets');
create policy "assets_insert_auth" on storage.objects for insert to authenticated with check (bucket_id = 'chat-assets');
create policy "assets_update_auth" on storage.objects for update to authenticated using (bucket_id = 'chat-assets') with check (bucket_id = 'chat-assets');
create policy "assets_delete_auth" on storage.objects for delete to authenticated using (bucket_id = 'chat-assets');

-- 种子数据：我的资料 + 一个示例联系人（还原参考图）
insert into profile (nickname, avatar_url) values ('我', 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_6701ad36-ae7f-496f-a872-b070aa4e2dbc.jpg');

with c as (
  insert into contacts (name, avatar_url)
  values ('哈基礼 ovo（家有五宝）', 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_e3a49ad5-9776-4bc1-a962-bb349f5471db.jpg')
  returning id
)
insert into messages (contact_id, side, type, content, image_url)
select id, v.side, v.type, v.content, v.image_url from c,
  (values
    ('other','text','Aᐅlo-☆.ᐯveu署名 +♡+\n♡+.☆爱暑的一颗心★.+♡\n# ♪独一无二的署名.ᐯ!\n☆*跟署名比的话宇宙很一般+☆\n๑Ω=小天使署名酱=Ω๑+.\n- ω 恶魔署名...偶尔坏.-I♡\n☾*署，似星星☆..*\nmy love署名>ᵔ<.+★+.°\n♡+★呆萌 xx酱 ٩˙ᴥ˙۶\n世一萌の xx酱[ω•ω]ᥫ᭡*✧\n+★全世界唯一的 xx .°\n☆♬署名降临♬\n☆^_署名^_☆', null),
    ('me','text','+÷ ᚛露᚜÷ᗩ-ᗩ-ᗩ᚛礼᚜ᘒ·+', null),
    ('me','sticker',null,'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_78aa2107-4cfe-4e63-94aa-7bfbc3f5baa8.jpg'),
    ('me','text','᚛ScoᗩᗩVirᗩ᚜·+', null)
  ) as v(side, type, content, image_url);