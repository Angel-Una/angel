// AI 代理：将用户自配的 API（地址/密钥/模型）以 OpenAI 兼容格式转发，隐藏密钥调用细节。
// 安全说明：本函数不使用任何平台密钥（无 INTEGRATIONS_API_KEY / Vault / service-role）。
// 转发的 api_key 与 base_url 均为终端用户自己填写、存储于其数据库的「自带密钥」，
// 仅发往用户自己指定的官方 API 端点，且不写入任何日志。

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { base_url, api_key, model, messages } = await req.json();

    if (!base_url || !api_key || !model || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: "缺少必要参数：base_url / api_key / model / messages" }, 400);
    }

    let endpoint = String(base_url).trim();
    if (!/\/chat\/completions$/.test(endpoint)) {
      endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
    }

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return json({ error: `上游接口返回 ${upstream.status}`, detail: text.slice(0, 500) }, 502);
    }

    let reply = "";
    try {
      const parsed = JSON.parse(text);
      reply = parsed?.choices?.[0]?.message?.content ?? "";
    } catch {
      reply = text;
    }

    return json({ reply: (reply ?? "").trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `请求失败：${msg}` }, 500);
  }
});
