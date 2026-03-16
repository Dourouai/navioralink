import type { NextApiRequest, NextApiResponse } from "next";

function buildSystemPrompt(locale: string) {
  const lang = locale === "zh-Hant" ? "Traditional Chinese (繁體中文)" : "English";
  return `You are a Smart QR Code configuration assistant for Zaps QR platform.
Help users define their QR code through conversation, then output structured configuration.

IMPORTANT: Always respond in ${lang}. Do not switch languages regardless of what language the user writes in.

Always respond with valid JSON in exactly this format:
{
  "reply": "Your conversational response in ${lang}",
  "draft": {
    "name": "QR code name, or omit if not mentioned",
    "defaultUrl": "default redirect URL, or omit if not mentioned",
    "ruleMode": "none | language | region",
    "languageRules": [{ "language": "English", "url": "https://..." }],
    "regionRules": [{ "region": "US", "url": "https://..." }]
  }
}

Rules:
- ruleMode "language": populate languageRules with BCP 47 / ISO 639-1 codes (e.g. "en", "zh", "zh-Hant", "ja"), set regionRules to []
- ruleMode "region": populate regionRules with ISO 3166-1 alpha-2 codes (e.g. "HK", "US", "GB"), set languageRules to []
- ruleMode "none" or not specified: both arrays empty
- Only include draft fields that have been explicitly provided by the user
- If critical info is missing (e.g. defaultUrl), ask for it in your reply
- Keep replies concise and helpful`;
}

function extractJson(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_MODEL ?? "qwen-plus";

  if (!apiKey) {
    return res.status(500).json({ reply: "未配置 QWEN_API_KEY", draft: {} });
  }

  const { messages, locale } = req.body;

  try {
    const qwenRes = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: buildSystemPrompt(locale ?? "zh-Hant") }, ...messages],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!qwenRes.ok) {
      const err = await qwenRes.text();
      console.error("Qwen API error:", err);
      return res.status(200).json({ reply: "AI 服务暂时不可用，请稍后重试。", draft: {} });
    }

    const data = await qwenRes.json();
    const rawContent = data.choices?.[0]?.message?.content ?? "";

    let parsed: { reply?: string; draft?: object } = {};
    try {
      parsed = JSON.parse(extractJson(rawContent));
    } catch {
      parsed = { reply: rawContent, draft: {} };
    }

    return res.status(200).json({
      reply: parsed.reply ?? rawContent,
      draft: parsed.draft ?? {},
    });
  } catch (error) {
    console.error("API route error:", error);
    return res.status(200).json({ reply: "请求出错，请重试。", draft: {} });
  }
}
