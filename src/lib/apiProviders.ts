// 常见 API 商家预设：选择商家后自动带入地址与模型列表，用户只需填密钥。
// 文本：OpenAI 兼容 /chat/completions；语音：OpenAI 兼容 /audio/speech 与 /audio/transcriptions。

export interface ApiProvider {
  key: string;
  name: string;
  baseUrl: string;
  models: string[];
  keyHint: string;
}

export const API_PROVIDERS: ApiProvider[] = [
  {
    key: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyHint: "在 platform.deepseek.com 创建 API Key",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-ultra",
    ],
    keyHint: "在 aistudio.google.com 获取 Gemini API Key",
  },
  {
    key: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4o-2024-11-20",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o1",
      "o3-mini",
    ],
    keyHint: "在 platform.openai.com 创建 API Key",
  },
  {
    key: "qwen",
    name: "通义千问 (DashScope)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      "qwen-plus",
      "qwen-turbo",
      "qwen-max",
      "qwen-long",
      "qwen-plus-latest",
      "qwen2.5-72b-instruct",
    ],
    keyHint: "在 dashscope.aliyun.com 创建 API Key",
  },
  {
    key: "glm",
    name: "智谱清言 (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v1",
    models: ["glm-4-plus", "glm-4", "glm-4-flash", "glm-4-air", "glm-3-turbo"],
    keyHint: "在 open.bigmodel.cn 创建 API Key",
  },
  {
    key: "moonshot",
    name: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "moonshot-v1-auto"],
    keyHint: "在 platform.moonshot.cn 创建 API Key",
  },
  {
    key: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimaxi.com/v1",
    models: ["MiniMax-Text-01", "abab6.5-chat", "abab6.5-chat-preview", "abab5.5-chat"],
    keyHint: "在 platform.minimaxi.com 创建 API Key",
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.1-70b-instruct",
      "google/gemini-flash-1.5",
    ],
    keyHint: "在 openrouter.ai 创建 API Key",
  },
];

export function getProvider(key: string): ApiProvider | undefined {
  return API_PROVIDERS.find((p) => p.key === key);
}

/* ---------------- 语音 API 商家 ---------------- */

export interface VoiceProvider {
  key: string;
  name: string;
  baseUrl: string;
  ttsModels: string[];
  asrModels: string[];
  keyHint: string;
}

export const VOICE_PROVIDERS: VoiceProvider[] = [
  {
    key: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    ttsModels: ["tts-1", "tts-1-hd"],
    asrModels: ["whisper-1", "gpt-4o-mini-transcribe"],
    keyHint: "在 platform.openai.com 创建 API Key",
  },
  {
    key: "qwen",
    name: "通义千问 (DashScope)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    ttsModels: ["cosyvoice-v1", "cosyvoice-v2"],
    asrModels: ["paraformer-v2", "sensevoice-v1"],
    keyHint: "在 dashscope.aliyun.com 创建 API Key",
  },
  {
    key: "custom",
    name: "自定义（其他兼容接口）",
    baseUrl: "",
    ttsModels: [],
    asrModels: [],
    keyHint: "填写任意 OpenAI 兼容的 /audio/speech 与 /audio/transcriptions 接口",
  },
];

export function getVoiceProvider(key: string): VoiceProvider | undefined {
  return VOICE_PROVIDERS.find((p) => p.key === key);
}
