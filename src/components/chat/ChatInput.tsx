import { useRef, useState } from "react";

interface Props {
  onSendText: (text: string) => void;
  onPickImage: (file: File) => void;
}

export default function ChatInput({ onSendText, onPickImage }: Props) {
  const [value, setValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const send = () => {
    const t = value.trim();
    if (!t) return;
    onSendText(t);
    setValue("");
  };

  return (
    <section id="input-bar" className="shrink-0 border-t border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2.5">
        {/* 最左侧：加号（发送图片） */}
        <button
          type="button"
          aria-label="发送图片"
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
        </button>

        {/* 右侧：输入框（胶囊样式） */}
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center rounded-full border border-border bg-muted/40 px-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="发送消息…"
            className="w-full bg-transparent px-2 text-left text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
