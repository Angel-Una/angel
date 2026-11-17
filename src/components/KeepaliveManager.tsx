import { useEffect, useRef } from "react";
import { getProfile } from "@/lib/api";
import {
  startKeepalive,
  stopKeepalive,
  initKeepaliveVisibility,
} from "@/lib/keepalive";

// 全局保活管理器：放在 App 层，切换页面时不会被卸载中断。
// 读取 profile.keepalive_enabled 决定是否启动；监听页面可见性自动恢复。
export default function KeepaliveManager() {
  const enabledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      const p = await getProfile();
      if (!mounted) return;
      enabledRef.current = !!p?.keepalive_enabled;
      if (enabledRef.current) startKeepalive();
      else stopKeepalive();
    };

    sync();

    // 页面切回前台时，若已开启则恢复保活
    const cleanupVisibility = initKeepaliveVisibility(() => enabledRef.current);

    // 监听 storage 变化（其他标签页修改了保活设置）
    const onStorage = () => sync();
    window.addEventListener("storage", onStorage);

    // 定期重新同步（应对在「我的」页切换开关的情况）
    const timer = window.setInterval(sync, 2000);

    return () => {
      mounted = false;
      cleanupVisibility();
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
      // 注意：不在此处 stopKeepalive，让保活跨页面持续生效；
      // 只有用户主动关闭或 profile.keepalive_enabled 变为 false 时才停止。
    };
  }, []);

  return null;
}
