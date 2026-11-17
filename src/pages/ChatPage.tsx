import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ChatSettingsDialog from "@/components/chat/ChatSettingsDialog";
import {
  getContact,
  getProfile,
  listMessages,
  addMessage,
  clearMessages,
  getChatSetting,
  resolveApiConfig,
  resolveVoiceConfig,
  requestAIReply,
  requestTTS,
  requestASR,
  updateMessageContent,
  deleteContact,
} from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { showSystemNotify, notifyPermission } from "@/lib/keepalive";
import { formatChatTime } from "@/lib/format";
import { uid } from "@/db/local";
import type { Contact, Message, Profile, ChatSetting } from "@/types/types";

const TIME_GAP = 5 * 60 * 1000;

// 将同一 slot 的多个历史版本折叠为当前版本，避免重复显示
function buildDisplayList(messages: Message[]): { key: string; message: Message; position: string }[] {
  const slotMap = new Map<string, Message[]>();
  const nodes: { key: string; message: Message; position: string }[] = [];
  for (const m of messages) {
    if (m.slot_id) {
      const arr = slotMap.get(m.slot_id) ?? [];
      arr.push(m);
      slotMap.set(m.slot_id, arr);
    } else {
      nodes.push({ key: m.id, message: m, position: m.created_at });
    }
  }
  for (const [slotId, arr] of slotMap) {
    const current = arr.find((v) => v.is_current) ?? arr[arr.length - 1];
    nodes.push({ key: `slot-${slotId}`, message: current, position: arr[0].created_at });
  }
  nodes.sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  return nodes;
}

export default function ChatPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [setting, setSetting] = useState<ChatSetting | null>(null);
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  // 只滚动消息容器本身，绝不触发页面/父级滚动
  const scrollToBottom = useCallback(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = async () => {
    if (!contactId) return;
    const [ct, p, msgs, cfg] = await Promise.all([
      getContact(contactId),
      getProfile(),
      listMessages(contactId),
      getChatSetting(contactId),
    ]);
    setContact(ct);
    setProfile(p);
    setMessages(msgs);
    setSetting(cfg);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // 仅在消息数量变化时滚动到底部，不随 thinking 变化重复滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === contactId) {
        listMessages(contactId).then(setMessages);
      }
    };
    window.addEventListener("proactive-message", handler);
    return () => window.removeEventListener("proactive-message", handler);
  }, [contactId]);

  const displayItems = useMemo(() => buildDisplayList(messages), [messages]);

  const buildSystemPrompt = () => {
    if (contact?.is_group) return "";
    const parts: string[] = [];
    if (setting?.worldview_text)
      parts.push(`【世界观设定（请作为前期背景严格遵守）】\n${setting.worldview_text}`);
    if (setting?.persona_text) parts.push(`【角色人设（请严格扮演该角色）】\n${setting.persona_text}`);
    if (parts.length === 0) return "";
    return `你是一个聊天角色，请严格遵守以下设定进行回复：\n\n${parts.join("\n\n")}`;
  };

  const triggerAI = async (history: Message[]) => {
    if (!contactId) return;
    const [cfg, voiceCfg] = await Promise.all([
      resolveApiConfig(contactId),
      resolveVoiceConfig(contactId),
    ]);
    if (!cfg) {
      const tip: Message = {
        id: `tip-${Date.now()}`,
        contact_id: contactId,
        side: "other",
        type: "text",
        content: "请先在「我的」页面配置 API 后再试～",
        image_url: null,
        slot_id: null,
        version: 1,
        is_current: true,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tip]);
      return;
    }
    setThinking(true);
    try {
      const limit = Math.max(1, profile?.context_limit ?? 20);
      const msgs = history
        .filter((m) => m.type === "text" && m.content)
        .slice(-limit)
        .map((m) => ({ role: m.side === "me" ? "user" : "assistant", content: m.content as string }));
      const sys = buildSystemPrompt();
      if (sys) msgs.unshift({ role: "system", content: sys });
      const reply = await requestAIReply(cfg, msgs);
      if (reply) {
        // 持久化 AI 回复，避免离开后再进入时丢失
        const ai = await addMessage(contactId, {
          side: "other",
          type: "text",
          content: reply,
          slot_id: null,
          version: 1,
          is_current: true,
        });
        if (ai) setMessages((prev) => [...prev, ai]);
        if (document.hidden && profile?.notify_enabled && notifyPermission() === "granted") {
          showSystemNotify(contact?.name ?? "新消息", reply.slice(0, 60));
        }
        if (voiceCfg) {
          try {
            const audioUrl = await requestTTS(voiceCfg, reply);
            if (audioUrl) {
              const voice = await addMessage(contactId, {
                side: "other",
                type: "voice",
                content: reply,
                image_url: audioUrl,
                slot_id: null,
                version: 1,
                is_current: true,
              });
              if (voice) setMessages((prev) => [...prev, voice]);
            }
          } catch {
            // 语音合成失败时忽略，文本回复已展示
          }
        }
      } else {
        toast.error("AI 未返回内容");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI 请求失败");
    } finally {
      setThinking(false);
    }
  };

  const sendText = async (text: string) => {
    if (!contactId) return;
    const msgId = uid();
    const createdAt = new Date().toISOString();
    const optimistic: Message = {
      id: msgId,
      contact_id: contactId,
      side: "me",
      type: "text",
      content: text,
      image_url: null,
      slot_id: null,
      version: 1,
      is_current: true,
      created_at: createdAt,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      // 复用同一个 id，避免乐观消息被替换时 React 卸载重渲染造成闪烁
      await addMessage(contactId, { side: "me", type: "text", content: text, id: msgId });
      triggerAI([...messages, optimistic]);
    } catch {
      toast.error("发送失败");
      setMessages((prev) => prev.filter((x) => x.id !== msgId));
    }
  };

  const sendImage = async (file: File) => {
    if (!contactId) return;
    try {
      const url = await uploadImage(file, "images");
      const m = await addMessage(contactId, { side: "me", type: "image", image_url: url });
      if (m) setMessages((prev) => [...prev, m]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    }
  };

  const handleTranscribe = useCallback(
    async (msg: Message) => {
      if (!contactId) return;
      const voiceCfg = await resolveVoiceConfig(contactId);
      if (!voiceCfg) {
        toast.error("请先在「我的」配置语音 API");
        return;
      }
      try {
        const text = await requestASR(voiceCfg, msg.image_url ?? "");
        if (text) {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, content: text } : m)));
          await updateMessageContent(msg.id, text);
        } else {
          toast.error("未识别到文字");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "识别失败");
      }
    },
    [contactId],
  );

  const onClear = async () => {
    if (!contactId) return;
    await clearMessages(contactId);
    setMessages([]);
    toast.success("聊天记录已清空");
  };

  const handleDelete = async () => {
    if (!contactId) return;
    await deleteContact(contactId);
    toast.success(contact?.is_group ? "群聊已解散" : "联系人已删除");
    navigate("/");
  };

  if (!contact) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-background">
        <p className="text-muted-foreground">联系人不存在</p>
        <Button variant="secondary" onClick={() => navigate("/")}>
          返回联系人
        </Button>
      </div>
    );
  }

  const bgUrl = setting?.background_url;

  return (
    <section
      id="chat"
      className="relative mx-auto flex h-[100dvh] max-w-[480px] flex-col overflow-hidden bg-background"
    >
      <PageMeta title={contact.name} description="聊天" />
      <ChatHeader
        name={contact.name}
        typing={thinking && !contact.is_group}
        onBack={() => navigate("/")}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div
        className="chat-wallpaper relative min-h-0 flex-1 overflow-hidden"
        style={
          bgUrl
            ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div ref={feedRef} className="feed-scroll absolute inset-0 overflow-y-auto">
          <div id="messages" className="space-y-4 px-3 py-4">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">还没有消息，打个招呼吧～</p>
            ) : (
              displayItems.map((node, i) => {
                const prev = i > 0 ? displayItems[i - 1] : null;
                const showTime =
                  !prev ||
                  new Date(node.message.created_at).getTime() -
                    new Date(prev.message.created_at).getTime() >=
                    TIME_GAP;
                return (
                  <div key={node.key} className="space-y-2">
                    {showTime && (
                      <div className="flex justify-center">
                        <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] text-muted-foreground/80">
                          {formatChatTime(node.message.created_at)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={node.message}
                      myAvatar={profile?.avatar_url ?? null}
                      otherAvatar={contact.avatar_url}
                      bubbleKey={setting?.bubble_style || "classic"}
                      onTranscribe={handleTranscribe}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ChatInput onSendText={sendText} onPickImage={sendImage} />

      <ChatSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        contact={contact}
        current={setting}
        onSaved={setSetting}
        onInfoSaved={setContact}
        onDelete={handleDelete}
        onClear={onClear}
      />
    </section>
  );
}
