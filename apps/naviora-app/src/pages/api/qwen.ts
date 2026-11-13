import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

import {
  getAiConversationLimitExceededMessage,
  mapPlanConstraintMessage,
  PLAN_AI_CONVERSATION_LIMIT_ERROR,
} from "@/lib/billing/plan-entitlements";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { assertAiConversationAllowanceForUser, PlanConstraintError } from "@/lib/supabase/subscription-controls";

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
    "targetType": "web | whatsapp | vcard | openapp",
    "name": "QR code name, generate one when defaultUrl is known",
    "defaultUrl": "default redirect URL, or omit if not mentioned",
    "ruleMode": "none | language | region | device | param | ab",
    "whatsapp": {
      "countryCode": "86",
      "phone": "13800138000",
      "message": "optional prefilled message"
    },
    "openApp": {
      "preset": "wechat | custom",
      "copyText": "text the user wants copied",
      "appUrl": "weixin:// or a custom app deep link"
    },
    "vcard": {
      "fullName": "Contact name",
      "phone": "optional phone",
      "email": "optional email",
      "company": "optional company",
      "title": "optional title",
      "website": "optional website",
      "socialLinks": [
        { "platform": "wechat", "url": "your-wechat-id" },
        { "platform": "wechatofficial", "url": "your-official-account-id" },
        { "platform": "linkedin", "url": "https://linkedin.com/in/your-profile" }
      ]
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
- targetType "openapp": populate openApp.copyText and openApp.appUrl, keep ruleMode as "none", do not use advanced routing rules, and set defaultUrl to the same appUrl when appUrl is known
- targetType "openapp": populate openApp.appUrl, include openApp.copyText only when the user wants text copied first, keep ruleMode as "none", do not use advanced routing rules, and set defaultUrl to the same appUrl when appUrl is known
- targetType "vcard": populate vcard fields when mentioned, keep ruleMode as "none", and do not use advanced routing rules
- If the user clearly asks for a digital business card, contact card, profile card, 名片, 電子名片, business card QR, or vCard, lock targetType to "vcard" and keep collecting only vcard-related fields unless the user explicitly says it is not a card
- If the user clearly asks to open WeChat, another app, a deep link, a URL scheme, a custom app URL, or to copy text before jumping into an app, lock targetType to "openapp" and keep collecting only open-app-related fields unless the user explicitly changes direction
- If the user clearly asks for WhatsApp, lock targetType to "whatsapp" and keep collecting only WhatsApp-related fields unless the user explicitly changes direction
- Once targetType is clear, do not suggest switching to another target type on your own and do not ask irrelevant web-link questions
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
- For vcard, socialLinks can use only these platform ids: linkedin, instagram, facebook, x, threads, youtube, tiktok, github, pinterest, reddit, wechat, wechatofficial, whatsapp, telegram, line, messenger, discord, skype, signal, weibo, xiaohongshu, bilibili, douyin, website
- If the user wants a vcard and has not provided any social media or IM channel yet, ask one short follow-up that suggests supported options such as WeChat, WhatsApp, Telegram, LINE, LinkedIn, Instagram, X, Messenger, Discord, Signal, or Skype
- For whatsapp, the only required field is phone
- For openapp, appUrl is required and copyText is optional
- For vcard or whatsapp, keep the conversation scoped to that target type and do not redirect the user back to a generic web flow unless they explicitly change their mind
- For openapp, keep the conversation scoped to app-launch details and do not redirect the user back to a generic web flow unless they explicitly change their mind
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
    vcard?: {
      fullName?: string;
      phone?: string;
      email?: string;
      website?: string;
      socialLinks?: Array<{ platform?: string; url?: string }>;
    };
  } | undefined,
  modelValue: unknown,
) {
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

  if (draft?.targetType === "whatsapp") {
    return Boolean(draft.whatsapp?.phone?.trim());
  }

  if (draft?.targetType === "openapp") {
    return Boolean((draft as { openApp?: { appUrl?: string } }).openApp?.appUrl?.trim());
  }

  if (draft?.targetType === "vcard") {
    if (!draft.vcard?.fullName?.trim()) {
      return false;
    }

    const hasSocialOrImChannel = Boolean(draft.vcard.socialLinks?.some((item) => item.url?.trim()));

    if (hasSocialOrImChannel) {
      return true;
    }

    return hasSignal(lastUserMessage, finishPatterns);
  }

  if (typeof modelValue === "boolean") {
    return modelValue;
  }

  if (!draft?.defaultUrl) {
    return false;
  }

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

function createPagesApiSupabaseClient(req: NextApiRequest) {
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll() {
        // The create flow only needs to read the existing session here.
      },
    },
  });
}

function getAiConversationLimitMessage(locale?: string) {
  if (locale === "zh-Hant") {
    return "你目前方案的本月 AI 對話次數已用完，升級後即可繼續使用。";
  }

  if (locale === "zh-Hans") {
    return "你当前方案的本月 AI 对话次数已用完，升级后即可继续使用。";
  }

  return getAiConversationLimitExceededMessage();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_MODEL ?? "qwen-plus";
  const apiBaseUrl = (process.env.QWEN_API_BASE_URL?.trim() || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");

  if (!apiKey) {
    return res.status(500).json({ reply: "未配置 QWEN_API_KEY", draft: {} });
  }

  const { messages, locale } = req.body;

  try {
    const hasSupabaseBackend = hasSupabaseEnv() && hasSupabaseAdminEnv();
    const localTestMode = process.env.NODE_ENV !== "production" && process.env.QWEN_LOCAL_TEST_MODE === "true";

    if (!hasSupabaseBackend && !localTestMode) {
      return res.status(200).json({
        reply: locale === "zh-Hant" ? "AI 服務尚未完成設定。" : locale === "zh-Hans" ? "AI 服务尚未完成配置。" : "AI service is not configured yet.",
        draft: {},
        readyForReview: false,
      });
    }

    if (hasSupabaseBackend) {
      const supabase = createPagesApiSupabaseClient(req);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return res.status(200).json({
          reply: locale === "zh-Hant" ? "請先登入後再使用 AI 助理。" : locale === "zh-Hans" ? "请先登录后再使用 AI 助理。" : "Please sign in before using the AI assistant.",
          draft: {},
          readyForReview: false,
        });
      }

      const admin = createAdminSupabaseClient();

      try {
        await assertAiConversationAllowanceForUser(user.id, admin);
      } catch (error) {
        if (error instanceof PlanConstraintError && error.code === PLAN_AI_CONVERSATION_LIMIT_ERROR) {
          return res.status(200).json({
            reply: getAiConversationLimitMessage(locale),
            draft: {},
            readyForReview: false,
          });
        }

        throw error;
      }

      await admin.from("ai_conversation_events").insert({
        user_id: user.id,
        locale: locale ?? null,
        source: "qr_create",
      });
    }

    const qwenRes = await fetch(
      `${apiBaseUrl}/chat/completions`,
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
        vcard?: {
          fullName?: string;
          phone?: string;
          email?: string;
          website?: string;
          socialLinks?: Array<{ platform?: string; url?: string }>;
        };
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
    const message =
      error instanceof Error
        ? mapPlanConstraintMessage(error.message)
        : locale === "zh-Hant"
          ? "請求出錯，請稍後重試。"
          : locale === "zh-Hans"
            ? "请求出错，请稍后重试。"
            : "Something went wrong. Please try again.";

    return res.status(200).json({ reply: message, draft: {}, readyForReview: false });
  }
}
