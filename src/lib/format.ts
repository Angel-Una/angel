// 时间格式化（Supabase 存 UTC，展示转本地时区）

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// 聊天页时间戳：今天显示 HH:mm，否则显示 M月D日 HH:mm
export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

// 会话列表时间：今天显示 HH:mm，否则 M月D日
export function formatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
