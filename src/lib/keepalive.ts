// 后台保活 + 系统通知工具（参考 akini 实现，适配 React）。
// 保活：静音循环音频 + 屏幕唤醒锁（Wake Lock），防止页面被系统挂起。
// 通知：浏览器 Notification API，页面在后台时收到新消息弹出系统通知。

let silentUrl: string | null = null;

// 本地生成一段静音 WAV，离线可用，不依赖远程文件。
function getSilentUrl(): string {
  if (silentUrl) return silentUrl;
  try {
    const sampleRate = 8000;
    const buffer = new ArrayBuffer(4800044);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 4800036, true);
    writeStr(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, 2 * sampleRate, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, 4800000, true);
    silentUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    return silentUrl;
  } catch {
    return "";
  }
}

let audio: HTMLAudioElement | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;

async function requestWakeLock() {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen" | "system") => Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock) wakeLock = await nav.wakeLock.request("screen");
  } catch {
    wakeLock = null;
  }
}

async function releaseWakeLock() {
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

export function startKeepalive() {
  try {
    if (!audio) {
      audio = new Audio(getSilentUrl());
      audio.loop = true;
      audio.volume = 0.01;
      audio.preload = "auto";
    }
    audio.play().catch(() => {
      // 浏览器要求用户手势后才能播放，绑定一次性手势恢复
      const resume = () => {
        audio?.play().catch(() => {});
        document.removeEventListener("touchstart", resume);
        document.removeEventListener("click", resume);
      };
      document.addEventListener("touchstart", resume, { once: true });
      document.addEventListener("click", resume, { once: true });
    });
    void requestWakeLock();
  } catch {
    /* ignore */
  }
}

export function stopKeepalive() {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
  void releaseWakeLock();
}

// 页面重新可见时，若保活开启则恢复音频与唤醒锁。
export function initKeepaliveVisibility(isEnabled: () => boolean) {
  const handler = () => {
    if (document.visibilityState === "visible" && isEnabled()) startKeepalive();
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

/* ---------------- 通知 ---------------- */

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showSystemNotify(title: string, body: string) {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.png" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}
