import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type PrivacySection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type PrivacyContent = {
  title: string;
  updatedAt: string;
  intro: string;
  summaryTitle: string;
  summaryBody: string;
  sections: PrivacySection[];
  contactLabel: string;
  reviewNote: string;
  backHome: string;
};

function getPrivacyContent(locale: Locale): PrivacyContent {
  if (locale === "zh-Hant") {
    return {
      title: "隱私政策",
      updatedAt: "最後更新：2026 年 4 月 3 日",
      intro:
        "本隱私政策說明 Naviora 如何蒐集、使用、保存與保護你在使用網站、工作台、API 與相關支援服務時提供的資料。當你建立帳號、提交內測表單、建立智能入口或查看分析時，即代表你理解本政策所描述的資料處理方式。",
      summaryTitle: "摘要說明",
      summaryBody:
        "我們只會在提供服務、改善產品、維護安全、處理帳務與提供支援所需的範圍內使用資料；不會將你的個人資料當作資料經紀商品出售。",
      sections: [
        {
          title: "1. 我們蒐集哪些資料",
          body: [
            "我們蒐集的資料主要來自你主動提供的資訊、你在產品內建立的內容，以及產品運作過程中產生的基本技術紀錄。",
          ],
          bullets: [
            "帳號資料：例如姓名、電子郵件地址、登入憑證、時區與語言偏好。",
            "工作資料：例如你建立的入口名稱、預設網址、語言/地區/設備/參數/A/B Test 路由規則、QR 設計設定、資料夾與歸檔狀態。",
            "分析資料：例如掃碼次數、訪問時間、地區、裝置類型、設備系統、語言、來源維度與轉換事件。",
            "支援與聯繫資料：例如你透過表單、電子郵件或內測申請提供的品牌網址、使用情境與回饋內容。",
            "技術資料：例如 IP 位址、瀏覽器類型、裝置資訊、Cookie、日誌紀錄與安全事件資料。",
          ],
        },
        {
          title: "2. 我們如何使用資料",
          bullets: [
            "提供登入、入口建立、規則配置、QR 下載、分析檢視與帳號設定等核心功能。",
            "維護產品穩定性、排查錯誤、偵測濫用與提升安全性。",
            "回覆支援需求、處理帳務紀錄、發送服務通知與重要更新。",
            "理解使用趨勢，優化介面、AI 對話流程、規則配置與報表體驗。",
            "在你同意或適用法規允許的情況下，與你聯繫產品更新、內測進度或方案資訊。",
          ],
        },
        {
          title: "3. 法律依據與處理基礎",
          body: [
            "在適用法規要求下，我們會依據不同情境使用相應的處理基礎，例如履行合約、遵守法律義務、保護平台安全、回應你的請求，或基於我們改善服務的正當利益。若某些處理活動需要你的同意，我們會在適當情況下先取得授權。",
          ],
        },
        {
          title: "4. 我們何時會分享資料",
          body: [
            "我們不會出售你的個人資料，但在提供服務所需的情況下，可能與受我們指示處理資料的服務供應商合作。",
          ],
          bullets: [
            "基礎設施與主機服務供應商，用於網站、資料庫與檔案儲存。",
            "分析、錯誤監測與通知服務供應商，用於產品監控與訊息發送。",
            "付款、表單或支援工具供應商，用於帳務、申請與客服流程。",
            "在法律要求、執法請求、爭議處理或保護 Naviora、用戶與公眾安全所必要時。",
          ],
        },
        {
          title: "5. Cookie 與追蹤技術",
          body: [
            "我們可能使用 Cookie、類似本機儲存與分析標記，以維持登入狀態、記住介面偏好、衡量功能使用情況並改善產品體驗。你通常可以在瀏覽器中控制 Cookie 設定，但停用後部分功能可能受影響。",
          ],
        },
        {
          title: "6. 資料保存期限",
          bullets: [
            "只在達成本政策所述目的所需期間內保存資料。",
            "帳號資料通常會在帳號存續期間持續保存；若你提出刪除請求，我們會在合理期間內處理，但可能保留法律、帳務、安全或稽核所需的最小資料。",
            "分析與日誌資料可能依不同服務與法規要求保存一段時間後再匿名化、彙總化或刪除。",
          ],
        },
        {
          title: "7. 安全措施",
          body: [
            "我們採取合理的技術與管理措施保護資料，例如權限控制、加密傳輸、備份與安全監控。不過，任何網路或儲存系統都無法保證絕對安全，因此我們無法承諾零風險。",
          ],
        },
        {
          title: "8. 你的權利與選擇",
          bullets: [
            "更新或更正帳號資料。",
            "申請查閱、匯出、限制處理或刪除適用法規所保障的個人資料。",
            "選擇不接收部分行銷或更新通知。",
            "依適用法規撤回同意，或向監管機關提出申訴。",
          ],
        },
        {
          title: "9. 跨境傳輸",
          body: [
            "由於 Naviora 可能使用位於不同地區的基礎設施與服務供應商，你的資料可能會在你所在地以外的地區處理。我們會盡合理努力，要求合作方依適用法規與適當保護措施處理資料。",
          ],
        },
        {
          title: "10. 兒童隱私",
          body: [
            "Naviora 並非以兒童為主要對象。如果你認為未成年人在未獲適當授權的情況下向我們提供了個人資料，請與我們聯絡，我們會儘快處理。",
          ],
        },
        {
          title: "11. 政策更新",
          body: [
            "我們可能不時更新本政策，以反映產品、法規或營運方式的變化。若變更屬重大性質，我們會以網站公告、產品通知或電子郵件等合理方式提醒你。",
          ],
        },
      ],
      contactLabel: "如有隱私相關問題、資料請求或投訴，請聯絡：",
      reviewNote: "本頁內容為產品通用版本，正式上線前仍建議依你的實際公司主體、資料流與法務要求再進一步審閱。",
      backHome: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "隐私政策",
      updatedAt: "最后更新：2026 年 4 月 3 日",
      intro:
        "本隐私政策说明 Naviora 如何收集、使用、保存与保护你在使用网站、工作台、API 及相关支持服务时提供的数据。当你创建账号、提交内测表单、建立智能入口或查看分析时，即表示你理解本政策所描述的数据处理方式。",
      summaryTitle: "摘要说明",
      summaryBody:
        "我们只会在提供服务、改进产品、维护安全、处理账务与提供支持所需的范围内使用数据；不会将你的个人数据当作数据经纪商品出售。",
      sections: [
        {
          title: "1. 我们收集哪些数据",
          body: [
            "我们收集的数据主要来自你主动提供的信息、你在产品内创建的内容，以及产品运行过程中产生的基础技术记录。",
          ],
          bullets: [
            "账号数据：例如姓名、电子邮件地址、登录凭证、时区与语言偏好。",
            "工作数据：例如你创建的入口名称、默认网址、语言/地区/设备/参数/A/B Test 路由规则、QR 设计配置、文件夹与归档状态。",
            "分析数据：例如扫码次数、访问时间、地区、设备类型、设备系统、语言、来源维度与转化事件。",
            "支持与联系数据：例如你通过表单、邮件或内测申请提供的品牌网址、使用场景与反馈内容。",
            "技术数据：例如 IP 地址、浏览器类型、设备信息、Cookie、日志记录与安全事件数据。",
          ],
        },
        {
          title: "2. 我们如何使用数据",
          bullets: [
            "提供登录、入口创建、规则配置、QR 下载、分析查看与账号设置等核心功能。",
            "维护产品稳定性、排查错误、识别滥用并提升安全性。",
            "回复支持请求、处理账单记录、发送服务通知与重要更新。",
            "理解使用趋势，优化界面、AI 对话流程、规则配置与报表体验。",
            "在你同意或适用法规允许的情况下，与你联系产品更新、内测进度或方案信息。",
          ],
        },
        {
          title: "3. 法律依据与处理基础",
          body: [
            "在适用法规要求下，我们会依据不同场景采用相应的处理基础，例如履行合同、遵守法律义务、保护平台安全、响应你的请求，或基于我们改进服务的正当利益。若某些处理活动需要你的同意，我们会在适当情况下先取得授权。",
          ],
        },
        {
          title: "4. 我们何时会共享数据",
          body: [
            "我们不会出售你的个人数据，但在提供服务所需的情况下，可能与受我们指示处理数据的服务供应商合作。",
          ],
          bullets: [
            "基础设施与主机服务供应商，用于网站、数据库与文件存储。",
            "分析、错误监控与通知服务供应商，用于产品监控与消息发送。",
            "支付、表单或支持工具供应商，用于账务、申请与客服流程。",
            "在法律要求、执法请求、争议处理或保护 Naviora、用户与公众安全所必要时。",
          ],
        },
        {
          title: "5. Cookie 与追踪技术",
          body: [
            "我们可能使用 Cookie、类似本地存储与分析标记，以维持登录状态、记住界面偏好、衡量功能使用情况并改进产品体验。你通常可以在浏览器中控制 Cookie 设置，但关闭后部分功能可能受到影响。",
          ],
        },
        {
          title: "6. 数据保存期限",
          bullets: [
            "只在实现本政策所述目的所需期间内保存数据。",
            "账号数据通常会在账号存续期间持续保存；若你提出删除请求，我们会在合理期间内处理，但可能保留法律、账务、安全或审计所需的最小数据。",
            "分析与日志数据可能依不同服务与法规要求保存一段时间后再匿名化、汇总化或删除。",
          ],
        },
        {
          title: "7. 安全措施",
          body: [
            "我们采取合理的技术与管理措施保护数据，例如权限控制、加密传输、备份与安全监控。不过，任何网络或存储系统都无法保证绝对安全，因此我们无法承诺零风险。",
          ],
        },
        {
          title: "8. 你的权利与选择",
          bullets: [
            "更新或更正账号数据。",
            "申请查阅、导出、限制处理或删除适用法规所保障的个人数据。",
            "选择不接收部分营销或更新通知。",
            "依适用法规撤回同意，或向监管机构提出投诉。",
          ],
        },
        {
          title: "9. 跨境传输",
          body: [
            "由于 Naviora 可能使用位于不同地区的基础设施与服务供应商，你的数据可能会在你所在地之外的地区处理。我们会尽合理努力，要求合作方依适用法规与适当保护措施处理数据。",
          ],
        },
        {
          title: "10. 儿童隐私",
          body: [
            "Naviora 并非以儿童为主要服务对象。如果你认为未成年人在未获得适当授权的情况下向我们提供了个人数据，请与我们联系，我们会尽快处理。",
          ],
        },
        {
          title: "11. 政策更新",
          body: [
            "我们可能不时更新本政策，以反映产品、法规或运营方式的变化。若变更属于重大性质，我们会以网站公告、产品通知或邮件等合理方式提醒你。",
          ],
        },
      ],
      contactLabel: "如有隐私相关问题、数据请求或投诉，请联系：",
      reviewNote: "本页内容为产品通用版本，正式上线前仍建议根据你的实际公司主体、数据流与法务要求再进一步审阅。",
      backHome: "返回首页",
    };
  }

  return {
    title: "Privacy Policy",
    updatedAt: "Last updated: April 3, 2026",
    intro:
      "This Privacy Policy explains how Naviora collects, uses, stores, and protects information when you use the website, workspace, API, and related support services. By creating an account, submitting a beta application, creating smart entries, or reviewing analytics, you acknowledge the data practices described below.",
    summaryTitle: "Summary",
    summaryBody:
      "We use data only as needed to provide the service, improve the product, maintain security, process billing, and support users. We do not sell personal information as a data broker.",
    sections: [
      {
        title: "1. Information we collect",
        body: [
          "The information we collect generally comes from what you provide directly, what you create inside the product, and what is generated as part of the service operating normally.",
        ],
        bullets: [
          "Account information, such as your name, email address, sign-in credentials, time zone, and language preferences.",
          "Workspace data, such as entry names, default URLs, language, region, device, param, and A/B test routing rules, QR design settings, folders, and archive state.",
          "Analytics data, such as scans, visit timestamps, region, device type, device OS, language, source dimensions, and conversion events.",
          "Support and contact information, such as the brand URL, use case, and feedback you share through forms, email, or beta applications.",
          "Technical data, such as IP address, browser type, device data, cookies, logs, and security event records.",
        ],
      },
      {
        title: "2. How we use information",
        bullets: [
          "To provide core features such as sign-in, entry creation, routing setup, QR downloads, analytics, and account settings.",
          "To maintain service reliability, troubleshoot issues, detect abuse, and improve security.",
          "To respond to support requests, manage billing records, and send important service notices.",
          "To understand usage patterns and improve the product, AI-assisted setup, rule configuration, and reporting experience.",
          "To contact you about updates, beta progress, or plan information where permitted by law or based on your choices.",
        ],
      },
      {
        title: "3. Legal bases for processing",
        body: [
          "Where required by applicable law, we rely on appropriate legal bases depending on the context, including contract performance, compliance with legal obligations, security and fraud prevention, responding to your requests, or our legitimate interests in operating and improving the service. Where consent is required, we will request it in an appropriate manner.",
        ],
      },
      {
        title: "4. When we share information",
        body: [
          "We do not sell your personal information. We may share data with service providers acting on our instructions when necessary to operate the service.",
        ],
        bullets: [
          "Infrastructure and hosting providers that help us run the website, databases, and file storage.",
          "Analytics, monitoring, and notification providers that support product performance and communication.",
          "Payment, form, or support providers used for billing, applications, and customer support workflows.",
          "Authorities, counterparties, or advisors where disclosure is required by law, necessary to resolve disputes, or needed to protect Naviora, users, or the public.",
        ],
      },
      {
        title: "5. Cookies and tracking technologies",
        body: [
          "We may use cookies, similar local storage, and analytics tags to keep you signed in, remember interface preferences, measure feature usage, and improve the service. You can usually control cookies through your browser settings, but some functionality may be limited if you disable them.",
        ],
      },
      {
        title: "6. Data retention",
        bullets: [
          "We keep data only for as long as needed to fulfill the purposes described in this policy.",
          "Account information is generally retained while your account remains active. If you request deletion, we will process that request within a reasonable period, while retaining the minimum data needed for legal, billing, security, or audit purposes.",
          "Analytics and log data may be retained for different periods depending on technical needs and legal requirements, after which they may be deleted, anonymized, or aggregated.",
        ],
      },
      {
        title: "7. Security",
        body: [
          "We use reasonable technical and organizational safeguards, including access controls, encrypted transport, backups, and security monitoring. No system can guarantee absolute security, so we cannot promise zero risk.",
        ],
      },
      {
        title: "8. Your choices and rights",
        bullets: [
          "Update or correct your account information.",
          "Request access, export, restriction, or deletion of personal information where those rights apply.",
          "Choose not to receive certain marketing or product update communications.",
          "Withdraw consent where applicable or contact a relevant regulator if you believe your rights have been violated.",
        ],
      },
      {
        title: "9. International transfers",
        body: [
          "Because Naviora may rely on infrastructure and service providers in multiple regions, your information may be processed outside the place where you are located. We take reasonable steps to require appropriate safeguards consistent with applicable law.",
        ],
      },
      {
        title: "10. Children's privacy",
        body: [
          "Naviora is not designed primarily for children. If you believe a minor has provided personal information without appropriate authorization, please contact us and we will review the request promptly.",
        ],
      },
      {
        title: "11. Updates to this policy",
        body: [
          "We may update this policy from time to time to reflect changes in the product, applicable laws, or how we operate. If a change is material, we will use a reasonable method to notify you, such as an in-product notice, website update, or email.",
        ],
      },
    ],
    contactLabel: "For privacy questions, data requests, or complaints, contact:",
    reviewNote:
      "This page is a general product version and should still be reviewed against your actual company entity, data flows, and legal requirements before formal launch.",
    backHome: "Back to home",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "privacy");
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const content = getPrivacyContent(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 md:px-8">
      <Card className="space-y-8 p-7 md:p-9">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-[linear-gradient(135deg,rgba(99,188,248,0.14),rgba(141,121,255,0.12))] px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-[rgba(145,180,247,0.22)]">
            {content.updatedAt}
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">{content.title}</h1>
          <p className="text-sm leading-7 text-slate-600">{content.intro}</p>
        </div>

        <section className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.98))] p-5 ring-1 ring-[rgba(190,206,226,0.45)]">
          <h2 className="text-base font-semibold text-slate-900">{content.summaryTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{content.summaryBody}</p>
        </section>

        <div className="space-y-6">
          {content.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="rounded-[24px] bg-slate-50/85 p-5 ring-1 ring-slate-100">
          <p className="text-sm leading-7 text-slate-600">
            {content.contactLabel}{" "}
            <a href="mailto:huters@qq.com" className="font-medium text-sky-700 hover:underline">
              huters@qq.com
            </a>
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-500">{content.reviewNote}</p>
        </section>

        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{content.backHome}</Button>
        </Link>
      </Card>
    </div>
  );
}
