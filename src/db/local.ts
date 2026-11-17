// 纯浏览器端本地数据库：所有数据只存在当前浏览器的 localStorage 中，
// 每个用户/浏览器互相独立，不与任何后端共享。

import type {
  Profile,
  Contact,
  Message,
  ApiConfig,
  VoiceConfig,
  Sticker,
  ChatSetting,
  GroupMember,
} from "@/types/types";

const STORAGE_KEY = "angel_db_v1";

export interface LocalDB {
  profile: Profile[];
  contacts: Contact[];
  messages: Message[];
  api_configs: ApiConfig[];
  voice_configs: VoiceConfig[];
  stickers: Sticker[];
  chat_settings: ChatSetting[];
  group_members: GroupMember[];
}

const emptyDB = (): LocalDB => ({
  profile: [],
  contacts: [],
  messages: [],
  api_configs: [],
  voice_configs: [],
  stickers: [],
  chat_settings: [],
  group_members: [],
});

export function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as Partial<LocalDB>;
    return { ...emptyDB(), ...parsed };
  } catch {
    return emptyDB();
  }
}

export function saveDB(db: LocalDB): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    // localStorage 可能被禁用或已满
    console.error("保存本地数据失败", e);
  }
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function now(): string {
  return new Date().toISOString();
}

// 通用：取出某张表
export function table<K extends keyof LocalDB>(key: K): LocalDB[K] {
  return loadDB()[key];
}

// 通用：写回某张表（其余表保持不变）
export function writeTable<K extends keyof LocalDB>(key: K, rows: LocalDB[K]): void {
  const db = loadDB();
  db[key] = rows;
  saveDB(db);
}

// 通用：更新整张数据库
export function updateDB(mutator: (db: LocalDB) => void): LocalDB {
  const db = loadDB();
  mutator(db);
  saveDB(db);
  return db;
}
