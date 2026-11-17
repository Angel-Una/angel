import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Camera, Trash2, FileUp, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BUBBLE_PRESETS, DEFAULT_BUBBLE } from "@/lib/bubblePresets";
import { uploadImage } from "@/lib/upload";
import { saveChatSetting, updateContact, updateProactive } from "@/lib/api";
import type { ChatSetting, Contact } from "@/types/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: Contact;
  current: ChatSetting | null;
  onSaved: (s: ChatSetting) => void;
  onInfoSaved: (c: Contact) => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function ChatSettingsDialog({
  open,
  onOpenChange,
  contact,
  current,
  onSaved,
  onInfoSaved,
  onDelete,
  onClear,
}: Props) {
  const isGroup = contact.is_group;
  const [bubble, setBubble] = useState(current?.bubble_style ?? DEFAULT_BUBBLE);
  const [bg, setBg] = useState(current?.background_url ?? "");
  const [name, setName] = useState(contact.name);
  const [avatar, setAvatar] = useState(contact.avatar_url ?? "");
  const [savingStyle, setSavingStyle] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [persona, setPersona] = useState("");
  const [worldview, setWorldview] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  const [proactiveOn, setProactiveOn] = useState(false);
  const [proactiveMin, setProactiveMin] = useState("5");
  const [proactiveMax, setProactiveMax] = useState("30");
  const [savingProactive, setSavingProactive] = useState(false);
  const bgRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const personaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBubble(current?.bubble_style ?? DEFAULT_BUBBLE);
      setBg(current?.background_url ?? "");
      setName(contact.name);
      setAvatar(contact.avatar_url ?? "");
      setPersona(current?.persona_text ?? "");
      setWorldview(current?.worldview_text ?? "");
      setProactiveOn(contact.proactive_enabled);
      setProactiveMin(String(contact.proactive_min_minutes));
      setProactiveMax(String(contact.proactive_max_minutes));
    }
  }, [open, current, contact]);

  const pickBg = async (file: File) => {
    try {
      setUploadingBg(true);
      const url = await uploadImage(file, "backgrounds");
      setBg(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingBg(false);
    }
  };

  const pickAvatar = async (file: File) => {
    try {
      setUploadingAvatar(true);
      const url = await uploadImage(file, "avatars");
      setAvatar(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveStyle = async () => {
    try {
      setSavingStyle(true);
      const s = await saveChatSetting(contact.id, { bubble_style: bubble, background_url: bg || null });
      if (s) onSaved(s);
      toast.success("样式已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingStyle(false);
    }
  };

  const saveInfo = async () => {
    const n = name.trim();
    if (!n) {
      toast.error("名称不能为空");
      return;
    }
    try {
      setSavingInfo(true);
      const c = await updateContact(contact.id, { name: n, avatar_url: avatar || null });
      if (c) onInfoSaved(c);
      toast.success("资料已更新");
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingInfo(false);
    }
  };

  const importPersona = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPersona(String(reader.result ?? ""));
    reader.onerror = () => toast.error("文件读取失败");
    reader.readAsText(file);
  };

  const savePersona = async () => {
    try {
      setSavingPersona(true);
      const s = await saveChatSetting(contact.id, {
        persona_text: persona.trim() || null,
        worldview_text: worldview.trim() || null,
      });
      if (s) onSaved(s);
      toast.success("人设与世界观已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingPersona(false);
    }
  };

  const saveProactive = async () => {
    const min = Math.max(1, parseInt(proactiveMin, 10) || 1);
    const max = Math.max(min, parseInt(proactiveMax, 10) || min);
    try {
      setSavingProactive(true);
      const c = await updateProactive(contact.id, { enabled: proactiveOn, min, max });
      if (c) onInfoSaved(c);
      toast.success(proactiveOn ? "已开启主动发消息" : "已关闭主动发消息");
    } catch {
      toast.error("保存失败");
    } finally {
      setSavingProactive(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isGroup ? "群聊设置" : "聊天设置"}</DialogTitle>
          <DialogDescription>修改资料、气泡样式与聊天背景图。</DialogDescription>
        </DialogHeader>

        {/* 资料 */}
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => avatarRef.current?.click()}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {avatar ? (
                <img src={avatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">图</div>
              )}
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-md bg-foreground/60 text-background">
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
                if (f) pickAvatar(f);
                e.target.value = "";
              }}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label>{isGroup ? "群名称" : "昵称"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveInfo} disabled={savingInfo || uploadingAvatar}>
              {savingInfo && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              保存资料
            </Button>
          </div>
        </div>

        {/* 气泡美化 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">气泡美化</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(BUBBLE_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBubble(key)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 ${
                  bubble === key ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{ backgroundColor: p.other, color: p.otherText }}
                  >
                    左
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{ backgroundColor: p.me, color: p.meText }}
                  >
                    右
                  </span>
                </span>
                <span className="text-xs text-foreground">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 背景图 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">聊天背景图</p>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {bg && <img src={bg} alt="背景预览" className="h-full w-full object-cover" />}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => bgRef.current?.click()} disabled={uploadingBg}>
                {uploadingBg ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                上传背景图
              </Button>
              {bg && (
                <button type="button" onClick={() => setBg("")} className="text-xs text-muted-foreground">
                  移除背景图
                </button>
              )}
            </div>
            <input
              ref={bgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickBg(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveStyle} disabled={savingStyle || uploadingBg}>
              {savingStyle && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              保存样式
            </Button>
          </div>
        </div>

        {/* 人设与世界观（仅单聊） */}
        {!isGroup && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-foreground" />
              <p className="text-sm font-medium text-foreground">人设与世界观</p>
            </div>
            <p className="text-xs text-muted-foreground">
              仅该联系人单聊生效，作为对话前期铺垫；拉进群聊后不会使用。
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>角色人设</Label>
                <Button variant="secondary" size="sm" onClick={() => personaRef.current?.click()}>
                  <FileUp className="mr-1 h-4 w-4" />
                  导入文件
                </Button>
                <input
                  ref={personaRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importPersona(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <Textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="导入人设文件，或手动输入角色设定…"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>世界观</Label>
              <Textarea
                value={worldview}
                onChange={(e) => setWorldview(e.target.value)}
                placeholder="输入世界观 / 背景设定，联系人会作为前期铺垫遵守…"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={savePersona} disabled={savingPersona}>
                {savingPersona && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                保存人设与世界观
              </Button>
            </div>
          </div>
        )}

        {/* 主动发消息（仅单聊） */}
        {!isGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium text-foreground">主动发消息</p>
                <p className="text-xs text-muted-foreground">
                  开启后，TA 会在设定的时间范围内随机主动给你发消息。
                </p>
              </div>
              <Switch checked={proactiveOn} onCheckedChange={setProactiveOn} />
            </div>
            {proactiveOn && (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="pa-min">最短间隔（分钟）</Label>
                  <Input
                    id="pa-min"
                    type="number"
                    min={1}
                    value={proactiveMin}
                    onChange={(e) => setProactiveMin(e.target.value)}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="pa-max">最长间隔（分钟）</Label>
                  <Input
                    id="pa-max"
                    type="number"
                    min={1}
                    value={proactiveMax}
                    onChange={(e) => setProactiveMax(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={saveProactive} disabled={savingProactive}>
                {savingProactive && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                保存主动消息
              </Button>
            </div>
          </div>
        )}

        {/* 危险操作 */}
        <div className="space-y-1 border-t border-border pt-3">
          <Button
            variant="ghost"
            onClick={onClear}
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            清空聊天记录
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                {isGroup ? "解散群聊" : "删除联系人"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{isGroup ? "确认解散群聊？" : "确认删除联系人？"}</AlertDialogTitle>
                <AlertDialogDescription>
                  将彻底删除{isGroup ? "该群聊" : "该联系人"}及全部聊天记录，且不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>确认{isGroup ? "解散" : "删除"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
