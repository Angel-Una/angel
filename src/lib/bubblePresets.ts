// 气泡美化预设：用户可在三点菜单中切换
export interface BubblePreset {
  label: string;
  me: string;
  meText: string;
  other: string;
  otherText: string;
}

export const BUBBLE_PRESETS: Record<string, BubblePreset> = {
  classic: {
    label: "经典白绿",
    me: "hsl(100 78% 67%)",
    meText: "hsl(0 0% 9%)",
    other: "hsl(0 0% 100%)",
    otherText: "hsl(0 0% 9%)",
  },
  pink: {
    label: "少女粉",
    me: "hsl(340 82% 76%)",
    meText: "hsl(340 45% 28%)",
    other: "hsl(340 70% 92%)",
    otherText: "hsl(340 40% 30%)",
  },
  ocean: {
    label: "海洋蓝",
    me: "hsl(205 78% 58%)",
    meText: "hsl(0 0% 100%)",
    other: "hsl(205 55% 90%)",
    otherText: "hsl(205 45% 25%)",
  },
  mono: {
    label: "极简灰",
    me: "hsl(0 0% 22%)",
    meText: "hsl(0 0% 100%)",
    other: "hsl(0 0% 92%)",
    otherText: "hsl(0 0% 15%)",
  },
};

export const DEFAULT_BUBBLE = "classic";

export function getBubblePreset(key: string | null | undefined): BubblePreset {
  return BUBBLE_PRESETS[key ?? DEFAULT_BUBBLE] ?? BUBBLE_PRESETS[DEFAULT_BUBBLE];
}
