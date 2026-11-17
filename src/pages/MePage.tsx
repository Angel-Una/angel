import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Plus, Trash2, KeyRound, Mic, Save, SlidersHorizontal, Activity } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import TabLayout from "@/components/layouts/TabLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ApiConfigDialog from "@/components/me/ApiConfigDialog";
import VoiceConfigDialog from "@/components/me/VoiceConfigDialog";
import {
  getProfile,
  updateProfile,
  listApiConfigs,
  listVoiceConfigs,
  listContacts,
  deleteApiConfig,
  deleteVoiceConfig,
  getCachedProfile,
} from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import {
  startKeepalive,
  stopKeepalive,
  notifySupported,
  requestNotifyPermission,
  showSystemNotify,
} from "@/lib/keepalive";
import type { Profile, ApiConfig, VoiceConfig, Contact } from "@/types/types";

export default function MePage() {
  const [profile, setProfile] = useState<Profile | null>(() => getCachedProfile());
  const [nickname, setNickname] = useState(() => getCachedProfile()?.nickname ?? "");
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [voiceConfigs, setVoiceConfigs] = useState<VoiceConfig[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [apiOpen, setApiOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [contextLimit, setContextLimit] = useState(() => String(getCachedProfile()?.context_limit ?? 20));
  const [keepaliveOn, setKeepaliveOn] = useState(() => getCachedProfile()?.keepalive_enabled ?? false);
  const [notifyOn, setNotifyOn] = useState(() => getCachedProfile()?.notify_enabled ?? false);
  const [uptimeSec, setUptimeSec] = useState(0);
  const keepaliveRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const loadConfigs = async () => {
    const [c, v, ct] = await Promise.all([listApiConfigs(), listVoiceConfigs(), listContacts()]);
    setConfigs(c);
    setVoiceConfigs(v);
    setContacts(ct);
  };

  const loadAll = async () => {
    const p = await getProfile();
    setProfile(p);
    setNickname(p?.nickname ?? "");
    setContextLimit(String(p?.context_limit ?? 20));
    setNotifyOn(p?.notify_enabled ?? false);
    if (p?.keepalive_enabled) {
      keepaliveRef.current = true;
      setKeepaliveOn(true);
      startRef.current = Date.now();
      startKeepalive();
    }
    await loadConfigs();
  };
  useEffect(() => {
    loadAll();
  }, []);

  // 保活：仅维护运行时长计时；保活启停已由全局 KeepaliveManager 接管，切换页面不再中断
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (keepaliveRef.current && startRef.current) {
        setUptimeSec(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const contactName = (id: string | null) =>
    contacts.find((c) => c.id === id)?.name ?? "未知联系人";

  const saveNickname = async () => {
    const n = nickname.trim() || "我";
    setNickname(n);
    await updateProfile({ nickname: n });
    toast.success("昵称已保存");
  };

  const saveContext = async () => {
    const v = Math.max(1, Math.min(200, parseInt(contextLimit, 10) || 20));
    setContextLimit(String(v));
    await updateProfile({ context_limit: v });
    setProfile((prev) => (prev ? { ...prev, context_limit: v } : prev));
    toast.success("基础设置已保存");
  };

  const formatUptime = (s: number) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  };

  const applyKeepalive = (on: boolean) => {
    keepaliveRef.current = on;
    setKeepaliveOn(on);
    if (on) {
      startRef.current = Date.now();
      setUptimeSec(0);
      startKeepalive();
    } else {
      startRef.current = null;
      setUptimeSec(0);
      stopKeepalive();
    }
  };

  const toggleKeepalive = async (on: boolean) => {
    applyKeepalive(on);
    // 关闭保活时，后台通知需联动关闭
    if (!on && notifyOn) {
      setNotifyOn(false);
      await updateProfile({ keepalive_enabled: false, notify_enabled: false });
      setProfile((prev) =>
        prev ? { ...prev, keepalive_enabled: false, notify_enabled: false } : prev,
      );
      return;
    }
    try {
      await updateProfile({ keepalive_enabled: on });
      setProfile((prev) => (prev ? { ...prev, keepalive_enabled: on } : prev));
    } catch {
      toast.error("保存失败");
    }
  };

  const toggleNotify = async (on: boolean) => {
    if (on) {
      if (!notifySupported()) {
        toast.error("当前浏览器不支持系统通知");
        return;
      }
      const perm = await requestNotifyPermission();
      if (perm !== "granted") {
        toast.error(
          perm === "denied" ? "通知权限被拒绝，请在浏览器设置中允许后重试" : "未获得通知权限",
        );
        return;
      }
      setNotifyOn(true);
      if (!keepaliveRef.current) applyKeepalive(true);
      await updateProfile({ notify_enabled: true, keepalive_enabled: true });
      setProfile((prev) =>
        prev ? { ...prev, notify_enabled: true, keepalive_enabled: true } : prev,
      );
      showSystemNotify("AI 聊天", "后台通知已开启，可在后台接收新消息");
    } else {
      setNotifyOn(false);
      await updateProfile({ notify_enabled: false });
      setProfile((prev) => (prev ? { ...prev, notify_enabled: false } : prev));
    }
  };

  const onAvatar = async (file: File) => {
    try {
      setAvatarUploading(true);
      const url = await uploadImage(file, "avatars");
      await updateProfile({ avatar_url: url });
      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      toast.success("头像已更新");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setAvatarUploading(false);
    }
  };

  const onDeleteConfig = async (id: string) => {
    await deleteApiConfig(id);
    toast.success("已删除");
    loadConfigs();
  };

  const onDeleteVoice = async (id: string) => {
    await deleteVoiceConfig(id);
    toast.success("已删除");
    loadConfigs();
  };

  return (
    <TabLayout>
      <PageMeta title="Nexus" description="个人设置" />
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-border bg-card px-4">
        <h1 className="text-base font-semibold text-foreground">我的</h1>
      </header>

      <div className="space-y-4 p-4">
        {/* 资料 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => avatarRef.current?.click()}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">我</div>
              )}
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/60 text-background">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAvatar(f);
                e.target.value = "";
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs text-muted-foreground">我的昵称 / 点击头像更换</p>
              <div className="flex items-center gap-2">
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="h-9" />
                <Button size="sm" onClick={saveNickname} disabled={avatarUploading}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 基础设置 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">基础设置</h2>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">上下文上限</p>
              <p className="text-xs text-muted-foreground">AI 回复时携带的历史消息条数（1-200）</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                type="number"
                value={contextLimit}
                onChange={(e) => setContextLimit(e.target.value)}
                className="h-9 w-20"
                min={1}
                max={200}
              />
              <Button size="sm" onClick={saveContext}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* 后台运行 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">后台运行</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">后台消息通知</p>
                <p className="text-xs text-muted-foreground">
                  页面在后台时收到新消息弹出系统通知（开启将同时开启保活）
                </p>
              </div>
              <Switch checked={notifyOn} onCheckedChange={toggleNotify} className="shrink-0" />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">后台保活</p>
                <p className="text-xs text-muted-foreground">防止页面被系统挂起，保持后台运行</p>
              </div>
              <Switch checked={keepaliveOn} onCheckedChange={toggleKeepalive} className="shrink-0" />
            </div>
            {keepaliveOn && (
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                已保活 {formatUptime(uptimeSec)}
              </p>
            )}
          </div>
        </section>

        {/* 文本 API 配置 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <KeyRound className="h-4 w-4" />
              文本 API 配置
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setApiOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              添加
            </Button>
          </div>
          {configs.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              还没有配置，添加后即可驱动 AI 回复
            </p>
          ) : (
            <div className="space-y-2">
              {configs.map((cfg) => (
                <div key={cfg.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          cfg.contact_id ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {cfg.contact_id ? contactName(cfg.contact_id) : "全局"}
                      </span>
                      <span className="break-words text-sm font-medium text-foreground">{cfg.model}</span>
                    </div>
                    <p className="break-all text-xs text-muted-foreground">{cfg.base_url}</p>
                  </div>
                  <button
                    onClick={() => onDeleteConfig(cfg.id)}
                    aria-label="删除"
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 语音 API 配置 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Mic className="h-4 w-4" />
              语音 API 配置
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setVoiceOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              添加
            </Button>
          </div>
          {voiceConfigs.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              配置后联系人可发送语音，语音可长按转文字
            </p>
          ) : (
            <div className="space-y-2">
              {voiceConfigs.map((cfg) => (
                <div key={cfg.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          cfg.contact_id ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {cfg.contact_id ? contactName(cfg.contact_id) : "全局"}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        TTS {cfg.tts_model} · ASR {cfg.asr_model}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{cfg.base_url}</p>
                  </div>
                  <button
                    onClick={() => onDeleteVoice(cfg.id)}
                    aria-label="删除"
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ApiConfigDialog open={apiOpen} onOpenChange={setApiOpen} contacts={contacts} onSaved={loadConfigs} />
      <VoiceConfigDialog open={voiceOpen} onOpenChange={setVoiceOpen} contacts={contacts} onSaved={loadConfigs} />
    </TabLayout>
  );
}
