import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// 文字转语音：代理用户自有的 OpenAI 兼容 /audio/speech 接口，音频转存 Storage 后返回公开 URL
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { base_url, api_key, model, input } = await req.json();
    if (!base_url || !api_key || !model || !input) {
      return json({ error: "缺少必要参数" }, 400);
    }
    const endpoint = `${String(base_url).replace(/\/$/, "")}/audio/speech`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({ model, input, voice: "alloy" }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return json({ error: "语音合成失败", detail }, 502);
    }
    const buf = new Uint8Array(await upstream.arrayBuffer());
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `voice/${crypto.randomUUID()}.mp3`;
    const { data, error } = await supabase.storage
      .from("chat-assets")
      .upload(path, buf, { contentType: "audio/mpeg" });
    if (error) return json({ error: "音频上传失败", detail: error.message }, 500);
    const { data: urlData } = supabase.storage.from("chat-assets").getPublicUrl(data.path);
    return json({ audio_url: urlData.publicUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "未知错误" }, 500);
  }
});
