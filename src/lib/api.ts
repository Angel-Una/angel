import { loadDB, saveDB, uid, now, type LocalDB } from "@/db/local";
import type {
  Profile,
  Contact,
  Message,
  ApiConfig,
  VoiceConfig,
  Sticker,
  ChatSetting,
  Conversation,
  MessageSide,
  MessageType,
} from "@/types/types";

const arr = <T,>(d: T[] | null | undefined): T[] => (Array.isArray(d) ? d : []);

/* 轻量内存缓存：页面切换时立即渲染上次数据，避免空白闪烁 */
let convCache: Conversation[] | null = null;
let profileCache: Profile | null = null;
export const getCachedConversations = (): Conversation[] | null => convCache;
export const getCachedProfile = (): Profile | null => profileCache;

const mutate = (fn: (db: LocalDB) => void) => {
  const db = loadDB();
  fn(db);
  saveDB(db);
};

const normUrl = (u: string) => u.replace(/\/+$/, "");

/* ---------------- Profile ---------------- */
export async function getProfile(): Promise<Profile | null> {
  const db = loadDB();
  const p = db.profile[0] ?? null;
  profileCache = p;
  return p;
}

export async function updateProfile(
  patch: Partial<
    Pick<Profile, "nickname" | "avatar_url" | "context_limit" | "keepalive_enabled" | "notify_enabled">
  >,
): Promise<void> {
  mutate((db) => {
    if (db.profile.length === 0) {
      db.profile.push({
        id: uid(),
        nickname: "我",
        avatar_url: null,
        context_limit: 20,
        keepalive_enabled: false,
        notify_enabled: false,
        created_at: now(),
        updated_at: now(),
        ...patch,
      });
    } else {
      db.profile[0] = { ...db.profile[0], ...patch, updated_at: now() };
    }
  });
}

/* ---------------- Contacts ---------------- */
export async function listContacts(): Promise<Contact[]> {
  return [...loadDB().contacts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
}

export async function getContact(id: string): Promise<Contact | null> {
  return loadDB().contacts.find((c) => c.id === id) ?? null;
}

export async function createContact(
  name: string,
  isGroup: boolean,
  avatarUrl?: string | null,
): Promise<Contact | null> {
  const c: Contact = {
    id: uid(),
    name,
    avatar_url: avatarUrl ?? null,
    is_group: isGroup,
    proactive_enabled: false,
    proactive_min_minutes: 30,
    proactive_max_minutes: 120,
    next_proactive_at: null,
    created_at: now(),
  };
  mutate((db) => db.contacts.push(c));
  convCache = null;
  return c;
}

export async function deleteContact(id: string): Promise<void> {
  mutate((db) => {
    db.contacts = db.contacts.filter((c) => c.id !== id);
    db.messages = db.messages.filter((m) => m.contact_id !== id);
    db.api_configs = db.api_configs.filter((a) => a.contact_id !== id);
    db.voice_configs = db.voice_configs.filter((a) => a.contact_id !== id);
    db.chat_settings = db.chat_settings.filter((s) => s.contact_id !== id);
    db.group_members = db.group_members.filter((g) => g.group_id !== id);
  });
  convCache = null;
}

export async function updateContact(
  id: string,
  patch: Partial<Pick<Contact, "name" | "avatar_url">>,
): Promise<Contact | null> {
  let updated: Contact | null = null;
  mutate((db) => {
    const i = db.contacts.findIndex((c) => c.id === id);
    if (i >= 0) {
      db.contacts[i] = { ...db.contacts[i], ...patch };
      updated = db.contacts[i];
    }
  });
  convCache = null;
  return updated;
}

/* ---------------- Conversations ---------------- */
export async function listConversations(): Promise<Conversation[]> {
  const db = loadDB();
  const contacts = [...db.contacts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (contacts.length === 0) {
    convCache = [];
    return [];
  }
  const latest = new Map<string, Message>();
  for (const m of db.messages) {
    if (!m.is_current) continue;
    const cur = latest.get(m.contact_id);
    if (!cur || m.created_at > cur.created_at) latest.set(m.contact_id, m);
  }
  const result = contacts
    .map((c) => ({ ...c, last: latest.get(c.id) ?? null }))
    .sort((a, b) => {
      const ta = a.last?.created_at ?? a.created_at;
      const tb = b.last?.created_at ?? b.created_at;
      return tb.localeCompare(ta);
    })
    .slice(0, 2000);
  convCache = result;
  return result;
}

// 首次进入时保证存在一个默认联系人（聊天记录为空）
export async function ensureDefaultContact(): Promise<void> {
  const db = loadDB();
  if (db.contacts.length === 0) {
    mutate((d) => {
      d.contacts.push({
        id: uid(),
        name: "AI 助手",
        avatar_url: null,
        is_group: false,
        proactive_enabled: false,
        proactive_min_minutes: 30,
        proactive_max_minutes: 120,
        next_proactive_at: null,
        created_at: now(),
      });
    });
    convCache = null;
  }
}

/* ---------------- Messages ---------------- */
export async function listMessages(contactId: string): Promise<Message[]> {
  return loadDB()
    .messages.filter((m) => m.contact_id === contactId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 500);
}

export async function addMessage(
  contactId: string,
  msg: {
    side: MessageSide;
    type: MessageType;
    content?: string | null;
    image_url?: string | null;
    slot_id?: string | null;
    version?: number;
    is_current?: boolean;
  },
): Promise<Message | null> {
  const m: Message = {
    id: uid(),
    contact_id: contactId,
    side: msg.side,
    type: msg.type,
    content: msg.content ?? null,
    image_url: msg.image_url ?? null,
    slot_id: msg.slot_id ?? null,
    version: msg.version ?? 1,
    is_current: msg.is_current ?? true,
    created_at: now(),
  };
  mutate((db) => db.messages.push(m));
  convCache = null;
  return m;
}

export async function clearMessages(contactId: string): Promise<void> {
  mutate((db) => {
    db.messages = db.messages.filter((m) => m.contact_id !== contactId);
  });
  convCache = null;
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  mutate((db) => {
    const i = db.messages.findIndex((m) => m.id === id);
    if (i >= 0) db.messages[i] = { ...db.messages[i], content };
  });
}

export async function updateMessageMeta(
  id: string,
  patch: Partial<Pick<Message, "slot_id" | "version" | "is_current">>,
): Promise<void> {
  mutate((db) => {
    const i = db.messages.findIndex((m) => m.id === id);
    if (i >= 0) db.messages[i] = { ...db.messages[i], ...patch };
  });
}

// 将某 slot 内指定消息设为当前版本，其余版本置为非当前
export async function setSlotCurrent(slotId: string, currentId: string): Promise<void> {
  mutate((db) => {
    for (const m of db.messages) {
      if (m.slot_id === slotId) m.is_current = m.id === currentId;
    }
  });
  convCache = null;
}

export async function deleteMessage(id: string): Promise<void> {
  mutate((db) => {
    db.messages = db.messages.filter((m) => m.id !== id);
  });
  convCache = null;
}

// 删除某条消息之后（或包含该条）的所有消息，用于「重新生成」
export async function deleteMessagesFrom(
  contactId: string,
  createdAt: string,
  inclusive: boolean,
): Promise<void> {
  mutate((db) => {
    db.messages = db.messages.filter((m) => {
      if (m.contact_id !== contactId) return true;
      return inclusive ? m.created_at < createdAt : m.created_at <= createdAt;
    });
  });
  convCache = null;
}

/* ---------------- API configs ---------------- */
export async function listApiConfigs(): Promise<ApiConfig[]> {
  return [...loadDB().api_configs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100);
}

// 优先联系人专属配置，其次全局配置
export async function resolveApiConfig(contactId: string): Promise<ApiConfig | null> {
  const list = loadDB().api_configs;
  const specific = list
    .filter((a) => a.contact_id === contactId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (specific) return specific;
  const global = list
    .filter((a) => a.contact_id === null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  return global ?? null;
}

export async function saveApiConfig(cfg: {
  contact_id: string | null;
  base_url: string;
  api_key: string;
  model: string;
}): Promise<void> {
  const scope = cfg.contact_id ? "contact" : "global";
  mutate((db) => {
    db.api_configs = db.api_configs.filter((a) =>
      cfg.contact_id ? a.contact_id !== cfg.contact_id : a.contact_id !== null,
    );
    db.api_configs.push({
      id: uid(),
      ...cfg,
      scope,
      created_at: now(),
      updated_at: now(),
    });
  });
}

export async function deleteApiConfig(id: string): Promise<void> {
  mutate((db) => {
    db.api_configs = db.api_configs.filter((a) => a.id !== id);
  });
}

/* ---------------- Stickers ---------------- */
export async function listStickers(): Promise<Sticker[]> {
  return [...loadDB().stickers]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 300);
}

export async function addSticker(
  ownerType: "me" | "contact",
  contactId: string | null,
  imageUrl: string,
): Promise<void> {
  mutate((db) => {
    db.stickers.push({
      id: uid(),
      owner_type: ownerType,
      contact_id: contactId,
      image_url: imageUrl,
      created_at: now(),
    });
  });
}

export async function deleteSticker(id: string): Promise<void> {
  mutate((db) => {
    db.stickers = db.stickers.filter((s) => s.id !== id);
  });
}

/* ---------------- Chat settings ---------------- */
export async function getChatSetting(contactId: string): Promise<ChatSetting | null> {
  return loadDB().chat_settings.find((s) => s.contact_id === contactId) ?? null;
}

export async function saveChatSetting(
  contactId: string,
  patch: {
    bubble_style?: string;
    background_url?: string | null;
    persona_text?: string | null;
    worldview_text?: string | null;
  },
): Promise<ChatSetting | null> {
  let result: ChatSetting | null = null;
  mutate((db) => {
    const i = db.chat_settings.findIndex((s) => s.contact_id === contactId);
    if (i >= 0) {
      db.chat_settings[i] = { ...db.chat_settings[i], ...patch, updated_at: now() };
      result = db.chat_settings[i];
    } else {
      const s: ChatSetting = {
        id: uid(),
        contact_id: contactId,
        bubble_style: "default",
        background_url: null,
        persona_text: null,
        worldview_text: null,
        updated_at: now(),
        ...patch,
      };
      db.chat_settings.push(s);
      result = s;
    }
  });
  return result;
}

/* ---------------- AI（直接从浏览器请求用户配置的 API） ---------------- */
export async function requestAIReply(
  cfg: ApiConfig,
  history: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(`${normUrl(cfg.base_url)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.api_key}`,
    },
    body: JSON.stringify({ model: cfg.model, messages: history }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI 请求失败 (${res.status}): ${detail || res.statusText}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || data.error);
  const content = data?.choices?.[0]?.message?.content;
  if (content == null) throw new Error("AI 未返回内容");
  return content.toString();
}

/* ---------------- Contact proactive messaging ---------------- */
function randomNextIso(min: number, max: number): string {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);
  const minutes = lo + Math.random() * (hi - lo);
  return new Date(Date.now() + minutes * 60000).toISOString();
}

export async function updateProactive(
  contactId: string,
  patch: { enabled: boolean; min: number; max: number },
): Promise<Contact | null> {
  const min = Math.max(1, Math.round(patch.min));
  const max = Math.max(min, Math.round(patch.max));
  const next = patch.enabled ? randomNextIso(min, max) : null;
  let updated: Contact | null = null;
  mutate((db) => {
    const i = db.contacts.findIndex((c) => c.id === contactId);
    if (i >= 0) {
      db.contacts[i] = {
        ...db.contacts[i],
        proactive_enabled: patch.enabled,
        proactive_min_minutes: min,
        proactive_max_minutes: max,
        next_proactive_at: next,
      };
      updated = db.contacts[i];
    }
  });
  return updated;
}

export async function listProactiveContacts(): Promise<Contact[]> {
  return loadDB()
    .contacts.filter((c) => c.proactive_enabled)
    .sort((a, b) => (a.next_proactive_at ?? "").localeCompare(b.next_proactive_at ?? ""))
    .slice(0, 200);
}

export async function updateNextProactive(contactId: string, iso: string | null): Promise<void> {
  mutate((db) => {
    const i = db.contacts.findIndex((c) => c.id === contactId);
    if (i >= 0) db.contacts[i].next_proactive_at = iso;
  });
}

/* ---------------- Group members ---------------- */
export async function setGroupMembers(groupId: string, contactIds: string[]): Promise<void> {
  mutate((db) => {
    db.group_members = db.group_members.filter((g) => g.group_id !== groupId);
    for (const cid of contactIds) {
      db.group_members.push({ id: uid(), group_id: groupId, contact_id: cid, created_at: now() });
    }
  });
}

export async function listGroupMembers(groupId: string): Promise<Contact[]> {
  const db = loadDB();
  const ids = db.group_members
    .filter((g) => g.group_id === groupId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 100)
    .map((g) => g.contact_id);
  if (ids.length === 0) return [];
  return db.contacts.filter((c) => ids.includes(c.id));
}

/* ---------------- Voice configs ---------------- */
export async function listVoiceConfigs(): Promise<VoiceConfig[]> {
  return [...loadDB().voice_configs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100);
}

export async function resolveVoiceConfig(contactId: string): Promise<VoiceConfig | null> {
  const list = loadDB().voice_configs;
  const specific = list
    .filter((a) => a.contact_id === contactId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (specific) return specific;
  const global = list
    .filter((a) => a.contact_id === null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  return global ?? null;
}

export async function saveVoiceConfig(cfg: {
  contact_id: string | null;
  base_url: string;
  api_key: string;
  tts_model: string;
  asr_model: string;
}): Promise<void> {
  const scope = cfg.contact_id ? "contact" : "global";
  mutate((db) => {
    db.voice_configs = db.voice_configs.filter((a) =>
      cfg.contact_id ? a.contact_id !== cfg.contact_id : a.contact_id !== null,
    );
    db.voice_configs.push({
      id: uid(),
      ...cfg,
      scope,
      created_at: now(),
      updated_at: now(),
    });
  });
}

export async function deleteVoiceConfig(id: string): Promise<void> {
  mutate((db) => {
    db.voice_configs = db.voice_configs.filter((a) => a.id !== id);
  });
}

/* ---------------- Voice AI（直接从浏览器请求） ---------------- */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "application/octet-stream";
  const bin = atob(b64 ?? "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function requestTTS(cfg: VoiceConfig, text: string): Promise<string> {
  const res = await fetch(`${normUrl(cfg.base_url)}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.api_key}`,
    },
    body: JSON.stringify({ model: cfg.tts_model, input: text, voice: "alloy" }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`语音合成失败 (${res.status}): ${detail || res.statusText}`);
  }
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("语音合成结果读取失败"));
    reader.readAsDataURL(blob);
  });
}

export async function requestASR(cfg: VoiceConfig, audioUrl: string): Promise<string> {
  const blob = dataUrlToBlob(audioUrl);
  const form = new FormData();
  form.append("file", blob, "audio.mp3");
  form.append("model", cfg.asr_model);
  const res = await fetch(`${normUrl(cfg.base_url)}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.api_key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`语音识别失败 (${res.status}): ${detail || res.statusText}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || data.error);
  return (data?.text ?? "").toString();
}
