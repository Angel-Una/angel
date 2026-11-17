import { memo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { Message } from "@/types/types";
import { getBubblePreset } from "@/lib/bubblePresets";

interface Props {
  message: Message;
  myAvatar: string | null;
  otherAvatar: string | null;
  bubbleKey: string;
  onTranscribe?: (msg: Message) => void;
}

function MessageBubbleBase({ message, myAvatar, otherAvatar, bubbleKey, onTranscribe }: Props) {
  const preset = getBubblePreset(bubbleKey);
  const isMe = message.side === "me";
  const avatar = isMe ? myAvatar : otherAvatar;
  const bg = isMe ? preset.me : preset.other;
  const color = isMe ? preset.meText : preset.otherText;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const startPress = () => {
    if (message.type === "voice" && onTranscribe) {
      pressTimer.current = window.setTimeout(() => onTranscribe(message), 600);
    }
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
        {avatar ? (
          <img src={avatar} alt={isMe ? "我" : "对方"} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {isMe ? "我" : "TA"}
          </div>
        )}
      </div>

      <div className={`flex min-w-0 max-w-[78%] flex-col ${isMe ? "items-end" : "items-start"}`}>
        {message.type === "text" ? (
          <div
            className="relative max-w-full select-none whitespace-pre-wrap break-words rounded-[22px] px-4 py-2 text-[15px] leading-relaxed"
            style={{ backgroundColor: bg, color }}
          >
            {message.content}
          </div>
        ) : message.type === "voice" ? (
          <div
            className={`relative max-w-full rounded-lg px-3 py-2 ${isMe ? "bubble-right" : "bubble-left"}`}
            style={{ backgroundColor: bg, color }}
          >
            <div
              className="flex items-center gap-2"
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
            >
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "暂停" : "播放"}
                className="flex h-8 w-8 shrink-0 items-center justify-center"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <div className="flex h-5 items-center gap-0.5">
                {[10, 16, 8, 14, 6, 12, 9, 15, 7, 11].map((h, i) => (
                  <span key={i} className="w-0.5 rounded-full bg-current opacity-70" style={{ height: h }} />
                ))}
              </div>
              <span className="text-xs opacity-70">长按转文字</span>
            </div>
            {message.content && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs opacity-90">{message.content}</p>
            )}
            <audio
              ref={audioRef}
              src={message.image_url ?? undefined}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
            />
          </div>
        ) : (
          <img
            src={message.image_url ?? ""}
            alt={message.type === "sticker" ? "表情包" : "图片"}
            className="max-h-56 max-w-full shrink-0 rounded-lg object-contain"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleBase);
export default MessageBubble;
