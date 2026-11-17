import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveVoiceConfig } from "@/lib/api";
import { VOICE_PROVIDERS, getVoiceProvider } from "@/lib/apiProviders";
import type { Contact } from "@/types/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contacts: Contact[];
  onSaved: () => void;
}

export default function VoiceConfigDialog({ open, onOpenChange, contacts, onSaved }: Props) {
  const [scope, setScope] = useState<"global" | "contact">("global");
  const [contactId, setContactId] = useState<string>("none");
  const [providerKey, setProviderKey] = useState<string>("openai");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [ttsModel, setTtsModel] = useState("");
  const [asrModel, setAsrModel] = useState("");
  const [saving, setSaving] = useState(false);

  const provider = useMemo(() => getVoiceProvider(providerKey) ?? VOICE_PROVIDERS[0], [providerKey]);
  const isCustom = provider.key === "custom";

  useEffect(() => {
    if (open) {
      setScope("global");
      setContactId("none");
      setProviderKey("openai");
      setUrl("");
      setKey("");
      setTtsModel(VOICE_PROVIDERS[0].ttsModels[0] ?? "");
      setAsrModel(VOICE_PROVIDERS[0].asrModels[0] ?? "");
    }
  }, [open]);

  const onPickProvider = (k: string) => {
    setProviderKey(k);
    const p = getVoiceProvider(k);
    if (!p) return;
    if (p.key === "custom") {
      setUrl("");
      setTtsModel("");
      setAsrModel("");
    } else {
      setUrl(p.baseUrl);
      setTtsModel(p.ttsModels[0] ?? "");
      setAsrModel(p.asrModels[0] ?? "");
    }
  };

  const save = async () => {
    if (isCustom && !url.trim()) {
      toast.error("请填写接口地址");
      return;
    }
    if (!key.trim() || !ttsModel.trim() || !asrModel.trim()) {
      toast.error("请完整填写密钥、TTS 与 ASR 模型");
      return;
    }
    const cid = scope === "contact" && contactId !== "none" ? contactId : null;
    if (scope === "contact" && !cid) {
      toast.error("请选择联系人");
      return;
    }
    setSaving(true);
    try {
      await saveVoiceConfig({
        contact_id: cid,
        base_url: isCustom ? url.trim() : provider.baseUrl,
        api_key: key.trim(),
        tts_model: ttsModel.trim(),
        asr_model: asrModel.trim(),
      });
      toast.success("语音 API 配置已保存");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto md:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加语音 API 配置</DialogTitle>
          <DialogDescription>
            选择商家后自动带入接口地址与模型，你只需填写密钥。配置后联系人可发送语音（TTS），语音可长按转文字（ASR）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>作用范围</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "global" | "contact")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">全局应用</SelectItem>
                <SelectItem value="contact">单独给某个联系人</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "contact" && (
            <div className="space-y-1.5">
              <Label>选择联系人</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择联系人" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>语音 API 商家</Label>
            <Select value={providerKey} onValueChange={onPickProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PROVIDERS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <Label htmlFor="v-url">API 地址</Label>
              <Input id="v-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>语音合成模型（TTS）</Label>
            {isCustom ? (
              <Input value={ttsModel} onChange={(e) => setTtsModel(e.target.value)} placeholder="tts-1" />
            ) : (
              <Select value={ttsModel} onValueChange={setTtsModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择 TTS 模型" />
                </SelectTrigger>
                <SelectContent>
                  {provider.ttsModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>语音识别模型（ASR）</Label>
            {isCustom ? (
              <Input value={asrModel} onChange={(e) => setAsrModel(e.target.value)} placeholder="whisper-1" />
            ) : (
              <Select value={asrModel} onValueChange={setAsrModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择 ASR 模型" />
                </SelectTrigger>
                <SelectContent>
                  {provider.asrModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!isCustom && (
            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <p className="break-words">
                接口地址：<span className="break-all text-foreground">{provider.baseUrl}</span>
              </p>
              <p className="mt-1">{provider.keyHint}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="v-key">API 密钥</Label>
            <Input id="v-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
