import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type TermsSection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type TermsContent = {
  title: string;
  updatedAt: string;
  intro: string;
  summaryTitle: string;
  summaryBody: string;
  sections: TermsSection[];
  contactLabel: string;
  reviewNote: string;
  backHome: string;
};

function getTermsContent(locale: Locale): TermsContent {
  if (locale === "zh-Hant") {
    return {
      title: "服務條款",
      updatedAt: "最後更新：2026 年 4 月 3 日",
      intro:
        "本服務條款適用於你對 Naviora 網站、工作台、API、內測流程與相關服務的使用。當你存取或使用本服務，即表示你同意受本條款約束。如果你代表公司或組織使用本服務，表示你有權代表該主體接受這些條款。",
      summaryTitle: "摘要說明",
      summaryBody:
        "Naviora 提供智能入口、Rule-based Links、QR Routing 與分析能力。你需對自己建立的內容、目標網址、公開入口與 API 使用行為負責，且不得將服務用於違法、詐騙、侵權或濫用場景。",
      sections: [
        {
          title: "1. 服務範圍",
          bullets: [
            "Naviora 提供入口建立、QR 設計、規則配置、分析查看、帳號設定與相關支援能力。",
            "不同方案、測試版本或 API 功能可能有不同配額、限制或可用範圍。",
            "我們可依產品發展需要新增、調整、限制或下線部分功能。",
          ],
        },
        {
          title: "2. 帳號與存取",
          bullets: [
            "你應提供準確且最新的帳號資訊，並妥善保管登入憑證、驗證碼與 API Key。",
            "你需對帳號或 API Key 底下發生的活動負責，除非相關行為明顯由我們的系統錯誤造成。",
            "如你發現未經授權的存取、洩漏或濫用情況，應盡快通知我們。",
          ],
        },
        {
          title: "3. 內容、連結與路由責任",
          body: [
            "你對自己建立、上傳、發佈或透過 Naviora 分流的內容、網址、活動頁與 QR 入口承擔主要責任。",
          ],
          bullets: [
            "你應確保目標網址、內容與活動符合適用法律、第三方平台規範與知識產權要求。",
            "你不得利用 Naviora 導向惡意程式、詐騙頁面、侵權內容、成人違法內容或其他有害場景。",
            "若你使用 A/B Test、地區分流、裝置分流或參數規則，應自行確認配置正確且不誤導使用者。",
          ],
        },
        {
          title: "4. 可接受使用規範",
          bullets: [
            "不得濫發、干擾、逆向工程、繞過限制、探測漏洞或嘗試未經授權存取系統。",
            "不得將服務用於垃圾訊息、批量詐騙、釣魚、假冒或其他濫用流量情境。",
            "不得以任何方式損害服務穩定性、其他用戶體驗或我們與合作夥伴的安全。",
          ],
        },
        {
          title: "5. 方案、費用與 Beta 功能",
          bullets: [
            "付費方案、用量上限、功能範圍與計費方式以當前 Pricing 頁或書面說明為準。",
            "免費、試用、內測或 Beta 功能可能存在不穩定、限制較多或隨時調整的情況。",
            "若後續接入正式支付系統，相關續費、升級、降級與退款規則會依當時公告與帳務條款處理。",
          ],
        },
        {
          title: "6. API 與整合使用",
          bullets: [
            "若你使用 API、Webhook、追蹤碼或第三方整合，應自行確保整合方式合法、安全且不超出授權範圍。",
            "你不得共享、轉售或公開暴露 API Key，亦不得以自動化方式濫用服務資源。",
            "我們可為維持穩定性與安全性而設定速率限制、用量限制或暫停異常請求。",
          ],
        },
        {
          title: "7. 智慧財產權",
          body: [
            "除你依法擁有的內容外，Naviora 的網站、軟體、介面、品牌、設計、文件與相關材料由我們或授權方擁有。條款未明示授權的權利均予保留。",
          ],
        },
        {
          title: "8. 暫停、限制與終止",
          bullets: [
            "若我們合理認為你違反本條款、造成安全風險、拖欠費用、濫用資源或使平台承受法律風險，我們可限制、暫停或終止全部或部分存取。",
            "你也可停止使用服務；但某些資料、紀錄或備份可能仍會依法律、帳務或安全需要保留一段時間。",
          ],
        },
        {
          title: "9. 可用性、免責與責任限制",
          body: [
            "我們會努力維持服務可用與可靠，但不保證服務永不中斷、無錯誤或完全符合你所有商業需求。對於因第三方服務中斷、網路問題、外部攻擊、設定錯誤、內容違規或你自身操作造成的損失，我們會在法律允許範圍內限制責任。",
          ],
        },
        {
          title: "10. 條款更新",
          body: [
            "我們可能更新本條款，以反映產品、價格、法規或營運方式的變化。若變更重大，我們會以合理方式公告。更新後持續使用服務，通常表示你接受新版條款。",
          ],
        },
      ],
      contactLabel: "如有條款、商務合作或合規相關問題，請聯絡：",
      reviewNote: "本頁內容為產品通用版本，正式商用前仍建議依你的公司主體、付款流程、法域與合規要求再做法務審閱。",
      backHome: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "服务条款",
      updatedAt: "最后更新：2026 年 4 月 3 日",
      intro:
        "本服务条款适用于你对 Naviora 网站、工作台、API、内测流程及相关服务的使用。当你访问或使用本服务，即表示你同意受本条款约束。如果你代表公司或组织使用本服务，表示你有权代表该主体接受这些条款。",
      summaryTitle: "摘要说明",
      summaryBody:
        "Naviora 提供智能入口、Rule-based Links、QR Routing 与分析能力。你需对自己创建的内容、目标网址、公开入口与 API 使用行为负责，且不得将服务用于违法、诈骗、侵权或滥用场景。",
      sections: [
        {
          title: "1. 服务范围",
          bullets: [
            "Naviora 提供入口创建、QR 设计、规则配置、分析查看、账号设置与相关支持能力。",
            "不同方案、测试版本或 API 功能可能有不同配额、限制或可用范围。",
            "我们可根据产品发展需要新增、调整、限制或下线部分功能。",
          ],
        },
        {
          title: "2. 账号与访问",
          bullets: [
            "你应提供准确且最新的账号信息，并妥善保管登录凭证、验证码与 API Key。",
            "你需对账号或 API Key 之下发生的活动负责，除非相关行为明显由我们的系统错误造成。",
            "如你发现未经授权的访问、泄露或滥用情况，应尽快通知我们。",
          ],
        },
        {
          title: "3. 内容、链接与路由责任",
          body: [
            "你对自己创建、上传、发布或通过 Naviora 分流的内容、网址、活动页与 QR 入口承担主要责任。",
          ],
          bullets: [
            "你应确保目标网址、内容与活动符合适用法律、第三方平台规范与知识产权要求。",
            "你不得利用 Naviora 导向恶意程序、诈骗页面、侵权内容、违法成人内容或其他有害场景。",
            "若你使用 A/B Test、地区分流、设备分流或参数规则，应自行确认配置正确且不误导用户。",
          ],
        },
        {
          title: "4. 可接受使用规范",
          bullets: [
            "不得滥发、干扰、逆向工程、绕过限制、探测漏洞或尝试未经授权访问系统。",
            "不得将服务用于垃圾信息、批量诈骗、钓鱼、冒充或其他滥用流量场景。",
            "不得以任何方式损害服务稳定性、其他用户体验或我们与合作伙伴的安全。",
          ],
        },
        {
          title: "5. 方案、费用与 Beta 功能",
          bullets: [
            "付费方案、用量上限、功能范围与计费方式以当前 Pricing 页或书面说明为准。",
            "免费、试用、内测或 Beta 功能可能存在不稳定、限制较多或随时调整的情况。",
            "若后续接入正式支付系统，相关续费、升级、降级与退款规则会依当时公告与账务条款处理。",
          ],
        },
        {
          title: "6. API 与集成使用",
          bullets: [
            "若你使用 API、Webhook、追踪码或第三方集成，应自行确保集成方式合法、安全且不超出授权范围。",
            "你不得共享、转售或公开暴露 API Key，也不得以自动化方式滥用服务资源。",
            "我们可为维持稳定性与安全性而设置速率限制、用量限制或暂停异常请求。",
          ],
        },
        {
          title: "7. 知识产权",
          body: [
            "除你依法拥有的内容外，Naviora 的网站、软件、界面、品牌、设计、文档与相关材料由我们或授权方拥有。条款未明确授予的权利均予保留。",
          ],
        },
        {
          title: "8. 暂停、限制与终止",
          bullets: [
            "若我们合理认为你违反本条款、造成安全风险、拖欠费用、滥用资源或使平台承担法律风险，我们可限制、暂停或终止全部或部分访问。",
            "你也可停止使用服务；但某些数据、记录或备份可能仍会因法律、账务或安全需要保留一段时间。",
          ],
        },
        {
          title: "9. 可用性、免责声明与责任限制",
          body: [
            "我们会尽力维持服务可用与可靠，但不保证服务永不中断、无错误或完全符合你所有商业需求。对于因第三方服务中断、网络问题、外部攻击、配置错误、内容违规或你自身操作造成的损失，我们会在法律允许范围内限制责任。",
          ],
        },
        {
          title: "10. 条款更新",
          body: [
            "我们可能更新本条款，以反映产品、价格、法规或运营方式的变化。若变更重大，我们会以合理方式公告。更新后继续使用服务，通常表示你接受新版条款。",
          ],
        },
      ],
      contactLabel: "如有条款、商务合作或合规相关问题，请联系：",
      reviewNote: "本页内容为产品通用版本，正式商用前仍建议根据你的公司主体、付款流程、法域与合规要求再做法务审阅。",
      backHome: "返回首页",
    };
  }

  return {
    title: "Terms of Service",
    updatedAt: "Last updated: April 3, 2026",
    intro:
      "These Terms of Service apply to your use of the Naviora website, workspace, API, beta access flow, and related services. By accessing or using the service, you agree to these terms. If you use the service on behalf of a company or organization, you represent that you have authority to bind that entity.",
    summaryTitle: "Summary",
    summaryBody:
      "Naviora provides smart entry, rule-based link, QR routing, and analytics capabilities. You are responsible for the content, destination URLs, public entry behavior, and API usage tied to your account, and you must not use the service for unlawful, fraudulent, infringing, or abusive purposes.",
    sections: [
      {
        title: "1. Service scope",
        bullets: [
          "Naviora offers entry creation, QR design, routing setup, analytics views, account settings, and related support features.",
          "Different plans, beta versions, or API capabilities may include different limits, quotas, or availability.",
          "We may add, change, limit, or discontinue features as the product evolves.",
        ],
      },
      {
        title: "2. Accounts and access",
        bullets: [
          "You must provide accurate and current account information and protect your sign-in credentials, verification codes, and API keys.",
          "You are responsible for activity that occurs under your account or API keys unless it is clearly caused by our own system error.",
          "If you become aware of unauthorized access, leakage, or abuse, you should notify us promptly.",
        ],
      },
      {
        title: "3. Responsibility for content, links, and routing",
        body: [
          "You are primarily responsible for the content, destination URLs, campaign pages, and QR entry flows you create, upload, publish, or route through Naviora.",
        ],
        bullets: [
          "You must ensure your target URLs, linked content, and campaigns comply with applicable law, third-party platform rules, and intellectual property requirements.",
          "You must not use Naviora to route traffic to malware, phishing, infringing material, unlawful adult content, or other harmful destinations.",
          "If you use A/B tests, regional routing, device routing, or param rules, you are responsible for making sure those configurations are accurate and not misleading.",
        ],
      },
      {
        title: "4. Acceptable use",
        bullets: [
          "You may not spam, interfere with, reverse engineer, bypass restrictions, probe vulnerabilities, or attempt unauthorized access to the service.",
          "You may not use the service for phishing, impersonation, bulk fraud, abusive traffic flows, or other harmful activity.",
          "You may not use the service in a way that harms platform stability, other users, or the security of Naviora and its partners.",
        ],
      },
      {
        title: "5. Plans, fees, and beta features",
        bullets: [
          "Paid plans, limits, feature access, and billing terms are governed by the current Pricing page or any written commercial agreement.",
          "Free, trial, beta, or early-access features may be more limited, less stable, or subject to change at any time.",
          "If formal billing is enabled later, renewal, upgrade, downgrade, and refund handling will follow the applicable billing terms in effect at that time.",
        ],
      },
      {
        title: "6. API and integrations",
        bullets: [
          "If you use the API, webhooks, tracking integrations, or third-party tools, you must ensure that your implementation is lawful, secure, and within the scope of your authorization.",
          "You may not share, resell, or publicly expose API keys, or abuse service resources through automation.",
          "We may apply rate limits, usage limits, or temporary restrictions to protect service reliability and security.",
        ],
      },
      {
        title: "7. Intellectual property",
        body: [
          "Except for content you lawfully own, the website, software, interface, brand assets, documentation, and related materials in Naviora are owned by us or our licensors. Any rights not expressly granted remain reserved.",
        ],
      },
      {
        title: "8. Suspension, restriction, and termination",
        bullets: [
          "If we reasonably believe you have violated these terms, created security risk, failed to pay required fees, abused resources, or exposed the platform to legal risk, we may restrict, suspend, or terminate some or all access.",
          "You may stop using the service at any time, but certain records or backups may remain for legal, billing, audit, or security purposes for a period of time.",
        ],
      },
      {
        title: "9. Availability, disclaimers, and limitation of liability",
        body: [
          "We work to keep the service available and reliable, but we do not guarantee uninterrupted availability, error-free operation, or suitability for every business need. To the extent permitted by law, our liability may be limited for losses caused by third-party outages, network failures, external attacks, configuration mistakes, content violations, or your own actions.",
        ],
      },
      {
        title: "10. Updates to these terms",
        body: [
          "We may update these terms to reflect changes in the product, pricing, law, or operations. If an update is material, we will provide notice through a reasonable channel. Continued use after an update will generally mean you accept the revised terms.",
        ],
      },
    ],
    contactLabel: "For questions about these terms, compliance, or commercial use, contact:",
    reviewNote:
      "This page is a general product version and should still be reviewed against your company structure, billing flow, target jurisdictions, and legal requirements before commercial launch.",
    backHome: "Back to home",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "terms");
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const content = getTermsContent(locale);

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
