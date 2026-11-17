# 微信风格 AI 智能聊天

一个仿微信界面的 AI 聊天 Web 应用（React + Vite + TypeScript + Tailwind CSS + Supabase）。支持自配文本/语音 API（BYOK）、单聊/群聊、主动消息、语音转文字等。

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 准备环境变量（已附带可用的 .env，可自行替换为你自己的 Supabase）
cp .env.example .env   # 如需使用自己的 Supabase

# 3. 启动开发服务器
npm run dev
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把本项目代码推送上去：

   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. 进入仓库 **Settings → Pages**：
   - **Build and deployment → Source** 选择 **GitHub Actions**。
   - 仓库已内置 `.github/workflows/deploy.yml`，推送后会自动构建并发布。

3. 构建成功后，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 说明：项目已使用 HashRouter + 相对路径 base，刷新和子路由在 GitHub Pages 上可正常工作。

## 后端（Supabase）

前端依赖 Supabase 提供数据库、存储与 Edge Functions（`chat-completion`、`voice-tts`、`voice-asr`）。

- 若直接使用仓库 `.env` 中自带的 Supabase 连接信息，前端可开箱即用。
- 若使用你自己的 Supabase 项目，需要：
  1. 在 Supabase 中执行 `supabase/migrations/` 下的 SQL 以创建数据表与 RLS 策略；
  2. 部署 `supabase/functions/` 下的三个 Edge Functions（可用 `supabase functions deploy`）；
  3. 将 `.env` 中的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 改为你的项目值。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建（输出到 `dist/`） |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | Biome 代码检查 |
