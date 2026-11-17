import { ChevronLeft, MoreHorizontal } from "lucide-react";

interface Props {
  name: string;
  typing?: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
}

export default function ChatHeader({ name, typing, onBack, onOpenSettings }: Props) {
  return (
    <section
      id="nav"
      className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-1"
    >
      <button
        type="button"
        aria-label="返回"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center text-foreground"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <h1
        className={`absolute left-1/2 max-w-[58%] -translate-x-1/2 truncate text-base ${
          typing ? "font-normal text-muted-foreground" : "font-semibold text-foreground"
        }`}
      >
        {typing ? "对方正在输入中…" : name}
      </h1>

      <button
        type="button"
        aria-label="更多菜单"
        onClick={onOpenSettings}
        className="flex h-10 w-10 items-center justify-center text-foreground"
      >
        <MoreHorizontal className="h-6 w-6" />
      </button>
    </section>
  );
}
