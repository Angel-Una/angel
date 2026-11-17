import { supabase } from "@/db/supabase";
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

const arr = <T,>(d: T[] | null): T[] => (Array.isArray(d) ? d : []);

/* 轻量内存缓存：页面切换时立即渲染上次数据，避免空白闪烁 */
let convCache: Conversation[] | null = null;
let profileCache: Profile | null = null;
export const getCachedConversations = (): Conversation[] | null => convCache;
export const getCachedProfile = (): Profile | null => profileCache;

/* ---------------- Profile ---------------- */
export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase
    .from("profile")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  profileCache = data ?? null;
  return profileCache;
}

export async function updateProfile(
  patch: Partial<
    Pick<Profile, "nickname" | "avatar_url" | "context_limit" | "keepalive_enabled" | "notify_enabled">
  >,
): Promise<void> {
  const p = await getProfile();
  if (p) {
    await supabase
      .from("profile")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", p.id);
  }
}

/* ---------------- Contacts ---------------- */
export async function listContacts(): Promise<Contact[]> {
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return arr(data);
}

export async function getContact(id: string): Promise<Contact | null> {
  const { data } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function createContact(
  name: string,
  isGroup: boolean,
  avatarUrl?: string | null,
): Promise<Contact | null> {
  const { data } = await supabase
    .from("contacts")
    .insert({ name, is_group: isGroup, avatar_url: avatarUrl ?? null })
    .select()
    .maybeSingle();
  convCache = null;
  return data ?? null;
}

export async function deleteContact(id: string): Promise<void> {
  await supabase.from("contacts").delete().eq("id", id);
  convCache = null;
}

/* ---------------- Conversations ---------------- */
export async function listConversations(): Promise<Conversation[]> {
  const contacts = await listContacts();
  if (contacts.length === 0) return [];
  const ids = contacts.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("is_current", true)
    .in("contact_id", ids)
    .order("created_at", { ascending: false })
    .limit(2000);
  const latest = new Map<string, Message>();
  for (const m of arr(msgs)) if (!latest.has(m.contact_id)) latest.set(m.contact_id, m);
  const result = contacts
    .map((c) => ({ ...c, last: latest.get(c.id) ?? null }))
    .sort((a, b) => {
      const ta = a.last?.created_at ?? a.created_at;
      const tb = b.last?.created_at ?? b.created_at;
      return tb.localeCompare(ta);
    });
  convCache = result;
  return result;
}

// 首次进入时保证存在一个默认联系人（聊天记录为空）
export async function ensureDefaultContact(): Promise<void> {
  const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true });
  if ((count ?? 0) === 0) {
    await supabase.from("contacts").insert({ name: "AI 助手", is_group: false, avatar_url: null });
    convCache = null;
  }
}

/* ---------------- Messages ---------------- */
export async function listMessages(contactId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(500);
  return arr(data);
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
  const { data } = await supabase
    .from("messages")
    .insert({
      contact_id: contactId,
      side: msg.side,
      type: msg.type,
      content: msg.content ?? null,
      image_url: msg.image_url ?? null,
      slot_id: msg.slot_id ?? null,
      version: msg.version ?? 1,
      is_current: msg.is_current ?? true,
    })
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function clearMessages(contactId: string): Promise<void> {
  await supabase.from("messages").delete().eq("contact_id", contactId);
}

/* ---------------- API configs ---------------- */
export async function listApiConfigs(): Promise<ApiConfig[]> {
  const { data } = await supabase
    .from("api_configs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return arr(data);
}

// 优先联系人专属配置，其次全局配置
export async function resolveApiConfig(contactId: string): Promise<ApiConfig | null> {
  const { data: specific } = await supabase
    .from("api_configs")
    .select("*")
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (specific) return specific;
  const { data: global } = await supabase
    .from("api_configs")
    .select("*")
    .is("contact_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return global ?? null;
}

export async function saveApiConfig(cfg: {
  contact_id: string | null;
  base_url: string;
  api_key: string;
  model: string;
}): Promise<void> {
  const scope = cfg.contact_id ? "contact" : "global";
  if (cfg.contact_id) {
    await supabase.from("api_configs").delete().eq("contact_id", cfg.contact_id);
  } else {
    await supabase.from("api_configs").delete().is("contact_id", null);
  }
  await supabase.from("api_configs").insert({ ...cfg, scope });
}

export async function deleteApiConfig(id: string): Promise<void> {
  await supabase.from("api_configs").delete().eq("id", id);
}

/* ---------------- Stickers ---------------- */
export async function listStickers(): Promise<Sticker[]> {
  const { data } = await supabase
    .from("stickers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  return arr(data);
}

export async function addSticker(
  ownerType: "me" | "contact",
  contactId: string | null,
  imageUrl: string,
): Promise<void> {
  await supabase.from("stickers").insert({ owner_type: ownerType, contact_id: contactId, image_url: imageUrl });
}

export async function deleteSticker(id: string): Promise<void> {
  await supabase.from("stickers").delete().eq("id", id);
}

/* ---------------- Chat settings ---------------- */
export async function getChatSetting(contactId: string): Promise<ChatSetting | null> {
  const { data } = await supabase.from("chat_settings").select("*").eq("contact_id", contactId).maybeSingle();
  return data ?? null;
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
  const existing = await getChatSetting(contactId);
  if (existing) {
    await supabase
      .from("chat_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { ...existing, ...patch };
  }
  const { data } = await supabase
    .from("chat_settings")
    .insert({ contact_id: contactId, ...patch })
    .select()
    .maybeSingle();
  return data ?? null;
}

/* ---------------- AI ---------------- */
export async function requestAIReply(
  cfg: ApiConfig,
  history: { role: string; content: string }[],
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("chat-completion", {
    body: {
      base_url: cfg.base_url,
      api_key: cfg.api_key,
      model: cfg.model,
      messages: history,
    },
  });
  if (error) {
    const detail = await error?.context?.text?.();
    throw new Error(detail || error.message || "AI 请求失败");
  }
  if (data?.error) throw new Error(data.error);
  return (data?.reply ?? "").toString();
}

/* ---------------- Contact update ---------------- */
export async function updateContact(
  id: string,
  patch: Partial<Pick<Contact, "name" | "avatar_url">>,
): Promise<Contact | null> {
  const { data } = await supabase.from("contacts").update(patch).eq("id", id).select().maybeSingle();
  return data ?? null;
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
  const { data } = await supabase
    .from("contacts")
    .update({
      proactive_enabled: patch.enabled,
      proactive_min_minutes: min,
      proactive_max_minutes: max,
      next_proactive_at: next,
    })
    .eq("id", contactId)
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function listProactiveContacts(): Promise<Contact[]> {
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("proactive_enabled", true)
    .order("next_proactive_at", { ascending: true })
    .limit(200);
  return arr(data) as Contact[];
}

export async function updateNextProactive(contactId: string, iso: string | null): Promise<void> {
  await supabase.from("contacts").update({ next_proactive_at: iso }).eq("id", contactId);
}

/* ---------------- Group members ---------------- */
export async function setGroupMembers(groupId: string, contactIds: string[]): Promise<void> {
  await supabase.from("group_members").delete().eq("group_id", groupId);
  if (contactIds.length > 0) {
    const rows = contactIds.map((cid) => ({ group_id: groupId, contact_id: cid }));
    await supabase.from("group_members").insert(rows);
  }
}

export async function listGroupMembers(groupId: string): Promise<Contact[]> {
  const { data } = await supabase
    .from("group_members")
    .select("contact_id")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(100);
  const ids = arr(data).map((r) => r.contact_id);
  if (ids.length === 0) return [];
  const { data: contacts } = await supabase.from("contacts").select("*").in("id", ids);
  return arr(contacts);
}

/* ---------------- Voice configs ---------------- */
export async function listVoiceConfigs(): Promise<VoiceConfig[]> {
  const { data } = await supabase
    .from("voice_configs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return arr(data);
}

export async function resolveVoiceConfig(contactId: string): Promise<VoiceConfig | null> {
  const { data: specific } = await supabase
    .from("voice_configs")
    .select("*")
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (specific) return specific;
  const { data: global } = await supabase
    .from("voice_configs")
    .select("*")
    .is("contact_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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
  if (cfg.contact_id) {
    await supabase.from("voice_configs").delete().eq("contact_id", cfg.contact_id);
  } else {
    await supabase.from("voice_configs").delete().is("contact_id", null);
  }
  await supabase.from("voice_configs").insert({ ...cfg, scope });
}

export async function deleteVoiceConfig(id: string): Promise<void> {
  await supabase.from("voice_configs").delete().eq("id", id);
}

/* ---------------- Voice AI ---------------- */
export async function requestTTS(cfg: VoiceConfig, text: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("voice-tts", {
    body: { base_url: cfg.base_url, api_key: cfg.api_key, model: cfg.tts_model, input: text },
  });
  if (error) {
    const detail = await error?.context?.text?.();
    throw new Error(detail || error.message || "语音合成失败");
  }
  if (data?.error) throw new Error(data.error);
  return (data?.audio_url ?? "").toString();
}

export async function requestASR(cfg: VoiceConfig, audioUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("voice-asr", {
    body: { base_url: cfg.base_url, api_key: cfg.api_key, model: cfg.asr_model, audio_url: audioUrl },
  });
  if (error) {
    const detail = await error?.context?.text?.();
    throw new Error(detail || error.message || "语音识别失败");
  }
  if (data?.error) throw new Error(data.error);
  return (data?.text ?? "").toString();
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  await supabase.from("messages").update({ content }).eq("id", id);
}

export async function updateMessageMeta(
  id: string,
  patch: Partial<Pick<Message, "slot_id" | "version" | "is_current">>,
): Promise<void> {
  await supabase.from("messages").update(patch).eq("id", id);
}

// 将某 slot 内指定消息设为当前版本，其余版本置为非当前
export async function setSlotCurrent(slotId: string, currentId: string): Promise<void> {
  await supabase.from("messages").update({ is_current: false }).eq("slot_id", slotId);
  await supabase.from("messages").update({ is_current: true }).eq("id", currentId);
}

export async function deleteMessage(id: string): Promise<void> {
  await supabase.from("messages").delete().eq("id", id);
}

// 删除某条消息之后（或包含该条）的所有消息，用于「重新生成」
export async function deleteMessagesFrom(
  contactId: string,
  createdAt: string,
  inclusive: boolean,
): Promise<void> {
  if (inclusive) {
    await supabase.from("messages").delete().eq("contact_id", contactId).gte("created_at", createdAt);
  } else {
    await supabase.from("messages").delete().eq("contact_id", contactId).gt("created_at", createdAt);
  }
}
