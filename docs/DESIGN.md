---
# ── 以下 3 项模型手写 ──
name: 对话配置一体
source_draft: 4
fonts:
  heading: "HarmonyOSSans"
  body: "HarmonyOSSans"

# ── 以下整块 = apply_design_tokens.py --emit-designmd-tokens 的 stdout，原样粘贴，禁手抄 ──
tokens:
  radius: "0.5rem"
  background: "0 0% 93%"
  foreground: "0 0% 9%"
  card: "0 0% 100%"
  card-foreground: "0 0% 9%"
  primary: "100 78% 67%"
  primary-foreground: "0 0% 9%"
  secondary: "0 0% 96%"
  secondary-foreground: "0 0% 9%"
  muted: "0 0% 89%"
  muted-foreground: "0 0% 38%"
  accent: "100 78% 67%"
  accent-foreground: "0 0% 9%"
  destructive: "0 75% 55%"
  destructive-foreground: "0 0% 100%"
  border: "0 0% 88%"
  input: "0 0% 88%"
  ring: "100 78% 67%"
  popover: "0 0% 100%"
  popover-foreground: "0 0% 9%"
section_blueprint:
  chat: "relative mx-auto flex h-[100dvh] max-w-[480px] flex-col overflow-hidden bg-background"
  nav: "relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-1"
  messages: "space-y-5 px-3 py-4"
  input-bar: "shrink-0 border-t border-border bg-card px-3 py-2"
---

## Overview
一比一还原微信聊天界面的移动端竖版对话页。气质定位是"熟人社交的亲切感"：微信绿气泡、点阵壁纸、漂浮粉色爱心装饰、圆润小气泡尾巴，营造轻松治愈的私聊氛围。signature element 是「点阵壁纸 + 漂浮爱心 + 微信绿气泡」三件套共同构成的微信私聊视觉记忆点，配合消息逐条错峰入场强化"正在聊天"的现场感。

## Colors
60-30-10 分布：60% 由浅灰底（`bg-background` 0 0% 93%）与白色气泡/导航（`bg-card`）承担；30% 由深灰文字（`text-foreground`）与中灰辅助文字（`text-muted-foreground`）、`border-border` 分隔线承担；10% 强调色是微信绿 `bg-primary`（100 78% 67%），只用于气泡填充与发送态高亮。本设计为浅色单主题（还原微信日间界面），不做暗色分支。绿色气泡上的文字用 `text-primary-foreground`（近黑），保证 ≥4.5:1。

## Typography
字体统一用 HarmonyOSSans（Regular 400 / Medium 500 / Bold 700），通过 `@font-face` 注册 BOS 字体文件。字阶：导航标题 16px semibold、消息正文 15px、时间戳 12px。行高：正文 1.6，标题 1.3。中文社交语境下保持系统级易读性，不引入装饰性字体。

## Layout
移动优先，整页收口在 `max-w-[480px]` 居中容器内，`h-[100dvh]` 三段式：顶部导航（h-14 shrink-0）→ 消息流（flex-1 overflow-y-auto）→ 底部输入栏（shrink-0）。断点只用 `md`，本页面在桌面端以居中手机框呈现。消息流内部 `space-y-5` 控制节奏。

## Components
- 导航栏 `bg-card border-b`：左返回箭头、居中对方昵称、右三点菜单。
- 气泡：左/右均为微信绿 `bg-primary text-primary-foreground`，`rounded-lg` + 圆润小尾巴（8px 方块 rotate45 + border-radius）。
- 时间戳：居中 `bg-muted text-muted-foreground` 小药丸，格式"10月17日 07:16"。
- 底部输入栏 `bg-card`（与顶部导航栏底色一致）：浅灰圆角输入框（占位"发送消息…"）+ 最右侧加号（发送图片）按钮。
- 三点菜单：唤出「API 配置 / 清空聊天记录 / 关于助手」下拉。

## Do's and Don'ts
- 禁渐变文字、禁蓝色系直接色（`bg-blue-500`）。
- 气泡尾巴保持小而圆润，禁尖角大三角。
- 图标统一 lucide-react / 内联 SVG，禁 emoji 充当功能图标。
- 每屏强调色仅微信绿一处语义，不滥用。
