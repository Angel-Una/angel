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

// 语音转文字：代理用户自有的 OpenAI 兼容 /audio/transcriptions 接口
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { base_url, api_key, model, audio_url } = await req.json();
    if (!base_url || !api_key || !model || !audio_url) {
      return json({ error: "缺少必要参数" }, 400);
    }
    const audioResp = await fetch(audio_url);
    if (!audioResp.ok) return json({ error: "音频下载失败" }, 502);
    const audioBuf = await audioResp.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([audioBuf]), "audio.mp3");
    form.append("model", model);
    const endpoint = `${String(base_url).replace(/\/$/, "")}/audio/transcriptions`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${api_key}` },
      body: form,
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return json({ error: "语音识别失败", detail }, 502);
    }
    const data = await upstream.json();
    return json({ text: (data.text ?? "").toString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "未知错误" }, 500);
  }
});
