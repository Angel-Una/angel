import { useEffect, useRef } from "react";
import {
  listProactiveContacts,
  resolveApiConfig,
  getChatSetting,
  requestAIReply,
  addMessage,
  updateNextProactive,
} from "@/lib/api";
import { showSystemNotify } from "@/lib/keepalive";
import type { Contact } from "@/types/types";

const CHECK_INTERVAL = 30000; // 每 30 秒检查一次

function randomNextIso(min: number, max: number): string {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);
  const minutes = lo + Math.random() * (hi - lo);
  return new Date(Date.now() + minutes * 60000).toISOString();
}

// 全局调度器：让开启了「主动发消息」的联系人，在设定的时间范围内随机主动给用户发消息。
export default function ProactiveScheduler() {
  const busy = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = async () => {
      let contacts: Contact[] = [];
      try {
        contacts = await listProactiveContacts();
      } catch {
        return;
      }
      const now = Date.now();
      for (const c of contacts) {
        if (busy.current.has(c.id)) continue;
        const nextAt = c.next_proactive_at ? new Date(c.next_proactive_at).getTime() : 0;
        if (nextAt > now) continue;
        busy.current.add(c.id);
        try {
          const [cfg, setting] = await Promise.all([
            resolveApiConfig(c.id),
            getChatSetting(c.id),
          ]);
          if (!cfg) {
            // 未配置 API：顺延到下次再试
            await updateNextProactive(c.id, randomNextIso(c.proactive_min_minutes, c.proactive_max_minutes));
            continue;
          }
          const msgs: { role: string; content: string }[] = [];
          const parts: string[] = [];
          if (setting?.worldview_text) parts.push(`【世界观设定（严格遵守）】\n${setting.worldview_text}`);
          if (setting?.persona_text) parts.push(`【角色人设（严格遵守）】\n${setting.persona_text}`);
          if (parts.length) {
            msgs.push({
              role: "system",
              content: `你是一个聊天角色，请严格遵守以下设定：\n\n${parts.join("\n\n")}`,
            });
          }
          msgs.push({
            role: "user",
            content:
              "（现在请你主动给我发一条消息，自然地开启一个话题，语气口语化、简短，像真人主动找朋友聊天一样。只输出你要发的那句话本身，不要加任何说明。）",
          });
          const reply = await requestAIReply(cfg, msgs);
          if (reply) {
            await addMessage(c.id, {
              side: "other",
              type: "text",
              content: reply,
              slot_id: null,
              version: 1,
              is_current: true,
            });
            window.dispatchEvent(new CustomEvent("proactive-message", { detail: c.id }));
            if (document.hidden) showSystemNotify(c.name, reply.slice(0, 60));
          }
          await updateNextProactive(c.id, randomNextIso(c.proactive_min_minutes, c.proactive_max_minutes));
        } catch {
          // 单次失败忽略，顺延到下次
          await updateNextProactive(c.id, randomNextIso(c.proactive_min_minutes, c.proactive_max_minutes));
        } finally {
          busy.current.delete(c.id);
        }
      }
    };

    const id = window.setInterval(tick, CHECK_INTERVAL);
    const first = window.setTimeout(tick, 5000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, []);

  return null;
}
