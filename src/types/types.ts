// 数据模型类型（与浏览器本地存储结构对应）

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  context_limit: number;
  keepalive_enabled: boolean;
  notify_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
  proactive_enabled: boolean;
  proactive_min_minutes: number;
  proactive_max_minutes: number;
  next_proactive_at: string | null;
  created_at: string;
}

export type MessageSide = "me" | "other";
export type MessageType = "text" | "image" | "sticker" | "voice";

export interface Message {
  id: string;
  contact_id: string;
  side: MessageSide;
  type: MessageType;
  content: string | null;
  image_url: string | null;
  slot_id: string | null;
  version: number;
  is_current: boolean;
  created_at: string;
}

export interface ApiConfig {
  id: string;
  contact_id: string | null;
  base_url: string;
  api_key: string;
  model: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface Sticker {
  id: string;
  owner_type: "me" | "contact";
  contact_id: string | null;
  image_url: string;
  created_at: string;
}

export interface ChatSetting {
  id: string;
  contact_id: string;
  bubble_style: string;
  background_url: string | null;
  persona_text: string | null;
  worldview_text: string | null;
  updated_at: string;
}

export interface Conversation extends Contact {
  last: Message | null;
}

export interface VoiceConfig {
  id: string;
  contact_id: string | null;
  base_url: string;
  api_key: string;
  tts_model: string;
  asr_model: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  contact_id: string;
  created_at: string;
}
