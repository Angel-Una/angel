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
import { saveApiConfig } from "@/lib/api";
import { API_PROVIDERS, getProvider } from "@/lib/apiProviders";
import type { Contact } from "@/types/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contacts: Contact[];
  onSaved: () => void;
}

export default function ApiConfigDialog({ open, onOpenChange, contacts, onSaved }: Props) {
  const [scope, setScope] = useState<"global" | "contact">("global");
  const [contactId, setContactId] = useState<string>("none");
  const [providerKey, setProviderKey] = useState<string>("deepseek");
  const [model, setModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveModel = model === "__custom__" ? customModel.trim() : model;

  const provider = useMemo(() => getProvider(providerKey) ?? API_PROVIDERS[0], [providerKey]);

  useEffect(() => {
    if (open) {
      setScope("global");
      setContactId("none");
      setProviderKey("deepseek");
      setModel(API_PROVIDERS[0].models[0]);
      setCustomModel("");
      setKey("");
    }
  }, [open]);

  const onPickProvider = (k: string) => {
    setProviderKey(k);
    const p = getProvider(k);
    if (p) setModel(p.models[0]);
  };

  const save = async () => {
    if (!key.trim()) {
      toast.error("请填写 API 密钥");
      return;
    }
    if (!effectiveModel) {
      toast.error("请选择或输入模型");
      return;
    }
    const cid = scope === "contact" && contactId !== "none" ? contactId : null;
    if (scope === "contact" && !cid) {
      toast.error("请选择联系人");
      return;
    }
    setSaving(true);
    try {
      await saveApiConfig({
        contact_id: cid,
        base_url: provider.baseUrl,
        api_key: key.trim(),
        model: effectiveModel,
      });
      toast.success("API 配置已保存");
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
          <DialogTitle>添加 API 配置</DialogTitle>
          <DialogDescription>选择商家后自动带入接口地址与模型，你只需填写密钥。</DialogDescription>
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
            <Label>API 商家</Label>
            <Select value={providerKey} onValueChange={onPickProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {API_PROVIDERS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>模型</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">自定义模型…</SelectItem>
              </SelectContent>
            </Select>
            {model === "__custom__" && (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="输入任意模型名称，如 gpt-4o"
              />
            )}
          </div>

          <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <p className="break-words">
              接口地址：<span className="break-all text-foreground">{provider.baseUrl}</span>
            </p>
            <p className="mt-1">{provider.keyHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cfg-key">API 密钥</Label>
            <Input
              id="cfg-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
            />
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
