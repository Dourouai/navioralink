import type { NextApiRequest, NextApiResponse } from "next";

function buildSystemPrompt(locale: string) {
  const uiLang =
    locale === "zh-Hant"
      ? "Traditional Chinese (繁體中文)"
      : locale === "zh-Hans"
        ? "Simplified Chinese (简体中文)"
        : "English";

  return `You are a Smart QR Code configuration assistant for Naviora QR platform.
Help users define their QR code through conversation, then output structured configuration.

IMPORTANT: Detect the language the user is writing in and always reply in that same language.
- If the user writes in Simplified Chinese (简体中文), reply in Simplified Chinese.
- If the user writes in Traditional Chinese (繁體中文), reply in Traditional Chinese.
- If the user writes in English, reply in English.
- If the user writes in any other language, reply in that language.
- Follow the user's language even if it changes mid-conversation.
- The UI locale is ${uiLang} — use it as a fallback only if the user's language cannot be determined from their first message.

Always respond with valid JSON in exactly this format:
{
  "reply": "Your conversational response in the user's language",
  "readyForReview": true,
  "draft": {
    "targetType": "web | whatsapp | vcard",
    "name": "QR code name, generate one when defaultUrl is known",
    "defaultUrl": "default redirect URL, or omit if not mentioned",
    "ruleMode": "none | language | region | device | param | ab",
    "whatsapp": {
      "countryCode": "86",
      "phone": "13800138000",
      "message": "optional prefilled message"
    },
    "vcard": {
      "fullName": "Contact name",
      "phone": "optional phone",
      "email": "optional email",
      "company": "optional company",
      "title": "optional title",
      "website": "optional website"
    },
    "languageRules": [{ "language": "English", "url": "https://..." }],
    "regionRules": [{ "region": "US", "url": "https://..." }],
    "deviceRules": [{ "os": "ios", "url": "https://..." }],
    "paramRules": [{ "key": "utm_campaign", "value": "spring", "url": "https://..." }],
    "abRules": [
      { "variant": "A", "weight": 50, "url": "https://..." },
      { "variant": "B", "weight": 50, "url": "https://..." }
    ]
  }
}

Rules:
- targetType "web": use defaultUrl as the main destination and optionally routing rules
- targetType "whatsapp": populate whatsapp fields when mentioned, keep ruleMode as "none", and do not use advanced routing rules
- targetType "vcard": populate vcard fields when mentioned, keep ruleMode as "none", and do not use advanced routing rules
- ruleMode "language": populate languageRules with BCP 47 / ISO 639-1 codes (e.g. "en", "zh", "zh-Hant", "ja"), set regionRules, deviceRules, paramRules, and abRules to []
- ruleMode "region": populate regionRules with ISO 3166-1 alpha-2 codes (e.g. "HK", "US", "GB"), set languageRules, deviceRules, paramRules, and abRules to []
- ruleMode "device": populate deviceRules with lowercase OS ids from this list only: ios, android, ipados, windows, macos, other. Set languageRules, regionRules, paramRules, and abRules to []
- ruleMode "param": populate paramRules with key/value/url items. Set languageRules, regionRules, deviceRules, and abRules to []
- ruleMode "ab": populate abRules with exactly two items only:
  - variant A
  - variant B
  - weight must sum to 100
  - both URLs must be present
  Set languageRules, regionRules, deviceRules, and paramRules to []
- ruleMode "none" or not specified: all arrays empty
  - If defaultUrl is known and name is missing, generate a concise name in the user's language
- Only include draft fields that have been explicitly provided by the user, except name
- If critical info is missing (e.g. defaultUrl), ask for it in your reply
- For vcard, the only required field is fullName
- For whatsapp, the only required field is phone
- Once defaultUrl is known, ask at most one short follow-up question before moving to review
- Infer the user's scenario first, then only ask about features that clearly match the scenario:
  - multilingual, language, locale => language routing
  - country, region, market, geo => region routing
  - a/b, split test, experiment, variant => ab routing
  - query param, parameter, utm, ref, source => param routing
  - tracking, GA4, Meta, ads, attribution => tracking
  - member-only, private, gated, password => password protection
  - limited time, expire, deadline, event end => expiration date
- If none of those feature signals are present, assume a simple single-link entry and do not keep asking extra questions
  - If the user says things like "可以了", "就這樣", "先這樣", "沒了", "好了", "就這樣", "就这样", "先这样", "没了", "好了", "ok", "looks good", "that's all", "done", mark readyForReview as true
- When the draft is sufficient for confirmation, set readyForReview to true and make the reply a short confirmation summary instead of another question
- Keep replies concise and helpful`;
}

function extractJson(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

function hasSignal(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function inferReadyForReview(
  messages: Array<{ role: string; content: string }>,
  draft: {
    defaultUrl?: string;
    ruleMode?: string;
    targetType?: string;
    whatsapp?: { phone?: string };
    vcard?: { fullName?: string };
  } | undefined,
  modelValue: unknown,
) {
  if (typeof modelValue === "boolean") {
    return modelValue;
  }

  if (draft?.targetType === "whatsapp") {
    return Boolean(draft.whatsapp?.phone?.trim());
  }

  if (draft?.targetType === "vcard") {
    return Boolean(draft.vcard?.fullName?.trim());
  }

  if (!draft?.defaultUrl) {
    return false;
  }

  const userMessages = messages.filter((message) => message.role === "user").map((message) => message.content.trim());
  const fullText = userMessages.join("\n").toLowerCase();
  const lastUserMessage = userMessages.at(-1)?.toLowerCase() ?? "";

  const finishPatterns = [
    /可以了/,
    /就这样/,
    /先这样/,
    /没了/,
    /好了/,
    /就這樣/,
    /先這樣/,
    /沒了/,
    /\bok\b/,
    /looks good/,
    /that'?s all/,
    /good to go/,
    /done/,
  ];
    const featurePatterns = [
    /多語|多语言|語言|语言|locale|multilingual|language/,
    /地區|地区|國家|国家|market|geo|country|region/,
    /設備|设备|裝置|装置|device|ios|android|ipados|windows|macos/,
    /a\/b|ab test|split test|experiment|variant|實驗|实验|測試|测试/,
    /參數|参数|param|parameter|utm_|utm=|query|ref=|source=/,
    /追蹤|追踪|ga4|meta|pixel|tracking|attribution|ads?/,
    /密碼|密码|private|member|gated|protected|password/,
    /到期|過期|过期|期限|expire|expiration|deadline|limited time/,
  ];

  if (hasSignal(lastUserMessage, finishPatterns)) {
    return true;
  }

  if (!hasSignal(fullText, featurePatterns)) {
    return true;
  }

  return (
    draft.ruleMode === "language" ||
    draft.ruleMode === "region" ||
    draft.ruleMode === "device" ||
    draft.ruleMode === "param" ||
    draft.ruleMode === "ab"
  );
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
      return res.status(200).json({ reply: "AI service is temporarily unavailable. Please try again later.", draft: {} });
    }

    const data = await qwenRes.json();
    const rawContent = data.choices?.[0]?.message?.content ?? "";

    let parsed: {
      reply?: string;
      draft?: {
        defaultUrl?: string;
        ruleMode?: string;
        targetType?: string;
        whatsapp?: { phone?: string };
        vcard?: { fullName?: string };
      };
      readyForReview?: boolean;
    } = {};
    try {
      parsed = JSON.parse(extractJson(rawContent));
    } catch {
      parsed = { reply: rawContent, draft: {} };
    }

    const readyForReview = inferReadyForReview(messages ?? [], parsed.draft, parsed.readyForReview);

    return res.status(200).json({
      reply: parsed.reply ?? rawContent,
      draft: parsed.draft ?? {},
      readyForReview,
    });
  } catch (error) {
    console.error("API route error:", error);
    return res.status(200).json({ reply: "请求出错，请重试。", draft: {}, readyForReview: false });
  }
}
