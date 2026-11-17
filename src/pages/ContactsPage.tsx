import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, UserPlus, UsersRound, Loader2, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";
import TabLayout from "@/components/layouts/TabLayout";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listConversations, createContact, listContacts, setGroupMembers, getCachedConversations, ensureDefaultContact } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { formatListTime } from "@/lib/format";
import type { Conversation, Contact } from "@/types/types";

export default function ContactsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Conversation[]>(() => getCachedConversations() ?? []);
  const [loading, setLoading] = useState(() => getCachedConversations() === null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"contact" | "group">("contact");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [members, setMembers] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    await ensureDefaultContact();
    const data = await listConversations();
    setItems(data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = async (m: "contact" | "group") => {
    setMode(m);
    setName("");
    setAvatar("");
    setSelected([]);
    setOpen(true);
    if (m === "group") {
      const cs = await listContacts();
      setMembers(cs);
    }
  };

  const pickAvatar = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadImage(file, "avatars");
      setAvatar(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    const n = name.trim();
    if (!n) {
      toast.error(mode === "group" ? "请输入群名称" : "请输入昵称");
      return;
    }
    setSaving(true);
    try {
      const c = await createContact(n, mode === "group", avatar || null);
      if (mode === "group" && c) await setGroupMembers(c.id, selected);
      toast.success(mode === "group" ? "群聊已创建" : "联系人已添加");
      setOpen(false);
      if (c) navigate(`/chat/${c.id}`);
    } catch {
      toast.error("创建失败");
    } finally {
      setSaving(false);
    }
  };

  const lastText = (c: Conversation) => {
    if (!c.last) return "暂无消息，点击开始聊天";
    if (c.last.type === "text") return c.last.content ?? "";
    if (c.last.type === "image") return "[图片]";
    if (c.last.type === "voice") return "[语音]";
    return "[表情包]";
  };

  return (
    <TabLayout>
      <PageMeta title="联系人" description="会话列表" />
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <h1 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-md">
            <svg viewBox="0 0 512 512" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="nx-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#6366F1"/>
                  <stop offset="0.5" stopColor="#A855F7"/>
                  <stop offset="1" stopColor="#EC4899"/>
                </linearGradient>
                <linearGradient id="nx-heart" x1="128" y1="80" x2="384" y2="440" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#FBCFE8"/>
                  <stop offset="1" stopColor="#F472B6"/>
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="112" fill="url(#nx-bg)"/>
              <path d="M256 432 C 110 328, 40 252, 40 168 C 40 112, 88 72, 148 72 C 188 72, 226 94, 256 128 C 286 94, 324 72, 364 72 C 424 72, 472 112, 472 168 C 472 252, 402 328, 256 432 Z" fill="url(#nx-heart)" fillOpacity="0.95"/>
              <g stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="18" strokeLinecap="round">
                <line x1="180" y1="200" x2="256" y2="256"/>
                <line x1="332" y1="200" x2="256" y2="256"/>
                <line x1="256" y1="256" x2="256" y2="344"/>
              </g>
              <g fill="#FFFFFF">
                <circle cx="180" cy="200" r="22"/>
                <circle cx="332" cy="200" r="22"/>
                <circle cx="256" cy="256" r="30"/>
              </g>
            </svg>
          </span>
          Nexus
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="新建" className="flex h-9 w-9 items-center justify-center text-foreground">
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openCreate("contact")}>
              <UserPlus className="mr-2 h-4 w-4" />
              添加联系人
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreate("group")}>
              <UsersRound className="mr-2 h-4 w-4" />
              创建群聊
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">加载中…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Users className="h-10 w-10" />
          <p className="text-sm">还没有联系人，点击右上角 + 添加</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-medium text-foreground">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.last ? formatListTime(c.last.created_at) : ""}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{lastText(c)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto md:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "group" ? "创建群聊" : "添加联系人"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-2 py-2">
            <button
              onClick={() => avatarRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
            >
              {avatar ? (
                <img src={avatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Camera className="h-6 w-6" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-tl-md bg-foreground/60 text-background">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickAvatar(f);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">点击选择{mode === "group" ? "群" : ""}头像</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-name">{mode === "group" ? "群名称" : "昵称"}</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "group" ? "输入群名称" : "输入对方昵称"}
            />
          </div>

          {mode === "group" && (
            <div className="space-y-2">
              <Label>选择群成员</Label>
              {members.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground">还没有联系人，可稍后在群聊中添加</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {members.map((m) => {
                    const on = selected.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Users className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.name}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving || uploading}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabLayout>
  );
}
