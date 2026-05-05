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
  backHome: string;
};

function getTermsContent(locale: Locale): TermsContent {
  if (locale === "zh-Hant") {
    return {
      title: "服務條款",
      updatedAt: "最後更新：2026 年 4 月 9 日",
      intro:
        "本服務條款適用於你對 Naviora 網站、工作台、API、內測流程、公開內容頁與相關服務的使用。當你存取或使用本服務，即表示你同意受本條款約束。如果你代表公司或組織使用本服務，表示你有權代表該主體接受這些條款。",
      summaryTitle: "摘要說明",
      summaryBody:
        "Naviora 提供智能入口、Rule-based Links、QR Routing、公開內容頁、AI 協助建立流程與分析能力。你需對自己建立的內容、目標網址、公開入口、AI 生成草稿與 API 使用行為負責，且不得將服務用於違法、詐騙、侵權或濫用場景。若你適用 GDPR 或類似法規，且我們代表你的企業處理資料，你也可向我們申請 DPA。",
      sections: [
        {
          title: "1. 服務範圍",
          bullets: [
            "Naviora 提供入口建立、QR 設計、規則配置、分析查看、帳號設定與相關支援能力。",
            "部分功能包含 AI 協助建立入口、整理規則草稿與內容建議，目前相關能力由 DeepSeek 與 Qwen 提供支援。",
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
            "AI 生成的文案、結構或路由草稿僅作為輔助建議，你仍需在發佈前自行審核其正確性、合法性與適用性。",
            "若你透過 Naviora 處理他人的個人資料，你應自行確保具備適當的合法依據、告知義務與必要授權。",
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
          title: "5. 方案、費用、付款與 Beta 功能",
          bullets: [
            "付費方案、用量上限、功能範圍與計費方式以當前 Pricing 頁、結帳頁面或書面商務說明為準。",
            "若後續啟用正式結帳、訂閱、發票或退款流程，我們可能使用 Paddle、Creem 或其他付款合作方作為 Merchant of Record 或相關付款服務商，處理付款、稅務、訂單、退款與客戶帳務。",
            "在付款功能啟用時，部分付款、稅務、退款或結帳條款亦可能受到對應付款合作方的結帳介面、客戶條款或其合法流程約束；退款資格與處理方式則以 Refund Policy 及適用法律為準。",
            "免費、試用、內測或 Beta 功能可能存在不穩定、限制較多或隨時調整的情況。",
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
          title: "7. 資料保護、角色分工與 DPA",
          body: [
            "就帳號、網站、支援、帳務、付款與營運管理相關資料而言，Naviora 通常作為資料控制者（controller）處理資料。若你是企業或團隊客戶，且我們代表你處理你提交到平台中的個人資料，我們也可能就該等資料作為處理者（processor）或類似服務供應商。",
          ],
          bullets: [
            "你應確保自己有權將資料提交到 Naviora，並依適用法規向終端使用者提供必要的隱私告知與合法處理依據。",
            "若你適用 GDPR、UK GDPR 或類似法規，且我們代表你處理個人資料，你可以聯絡我們申請資料處理協議（DPA）。",
            "若發生跨境傳輸，我們可依適用法規採用充分性認定、標準契約條款（SCCs）或其他有效保護機制作為傳輸依據。",
          ],
        },
        {
          title: "8. 智慧財產權",
          body: [
            "除你依法擁有的內容外，Naviora 的網站、軟體、介面、品牌、設計、文件與相關材料由我們或授權方擁有。條款未明示授權的權利均予保留。",
          ],
        },
        {
          title: "9. 暫停、限制與終止",
          bullets: [
            "若我們合理認為你違反本條款、造成安全風險、拖欠費用、濫用資源或使平台承受法律風險，我們可限制、暫停或終止全部或部分存取。",
            "你也可停止使用服務；但某些資料、紀錄或備份可能仍會依法律、帳務或安全需要保留一段時間。",
          ],
        },
        {
          title: "10. 可用性、第三方服務與責任限制",
          body: [
            "我們會努力維持服務可用與可靠，但不保證服務永不中斷、無錯誤或完全符合你所有商業需求。Naviora 也可能依賴第三方基礎設施與服務，例如 DeepSeek、Qwen、騰訊雲 COS、Google Analytics，以及 Paddle、Creem 或其他付款合作方的流程。對於因第三方服務中斷、網路問題、外部攻擊、設定錯誤、內容違規或你自身操作造成的損失，我們會在法律允許範圍內限制責任。",
          ],
        },
        {
          title: "11. 條款更新",
          body: [
            "我們可能更新本條款，以反映產品、價格、法規或營運方式的變化。若變更重大，我們會以合理方式公告。更新後持續使用服務，通常表示你接受新版條款。",
          ],
        },
      ],
      contactLabel: "如有條款、商務合作、付款流程、DPA 或合規相關問題，請聯絡：",
      backHome: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "服务条款",
      updatedAt: "最后更新：2026 年 4 月 9 日",
      intro:
        "本服务条款适用于你对 Naviora 网站、工作台、API、内测流程、公开内容页及相关服务的使用。当你访问或使用本服务，即表示你同意受本条款约束。如果你代表公司或组织使用本服务，表示你有权代表该主体接受这些条款。",
      summaryTitle: "摘要说明",
      summaryBody:
        "Naviora 提供智能入口、Rule-based Links、QR Routing、公开内容页、AI 协助建立流程与分析能力。你需对自己创建的内容、目标网址、公开入口、AI 生成草稿与 API 使用行为负责，且不得将服务用于违法、诈骗、侵权或滥用场景。若你适用 GDPR 或类似法规，且我们代表你的企业处理数据，你也可向我们申请 DPA。",
      sections: [
        {
          title: "1. 服务范围",
          bullets: [
            "Naviora 提供入口创建、QR 设计、规则配置、分析查看、账号设置与相关支持能力。",
            "部分功能包含 AI 协助建立入口、整理规则草稿与内容建议，目前相关能力由 DeepSeek 与 Qwen 提供支持。",
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
            "AI 生成的文案、结构或路由草稿仅作为辅助建议，你仍需在发布前自行审核其准确性、合法性与适用性。",
            "若你通过 Naviora 处理他人的个人数据，你应自行确保具备适当的合法依据、告知义务与必要授权。",
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
          title: "5. 方案、费用、支付与 Beta 功能",
          bullets: [
            "付费方案、用量上限、功能范围与计费方式以当前 Pricing 页、结账页面或书面商务说明为准。",
            "若后续启用正式结账、订阅、发票或退款流程，我们可能使用 Paddle、Creem 或其他支付合作方作为 Merchant of Record 或相关支付服务商，处理付款、税务、订单、退款与客户账务。",
            "在支付功能启用时，部分付款、税务、退款或结账条款也可能受到对应支付合作方的结账界面、客户条款或其合法流程约束；退款资格与处理方式则以 Refund Policy 及适用法律为准。",
            "免费、试用、内测或 Beta 功能可能存在不稳定、限制较多或随时调整的情况。",
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
          title: "7. 数据保护、角色分工与 DPA",
          body: [
            "就账号、网站、支持、账务、支付与运营管理相关数据而言，Naviora 通常作为数据控制者（controller）处理数据。若你是企业或团队客户，且我们代表你处理你提交到平台中的个人数据，我们也可能就该等数据作为处理者（processor）或类似服务供应商。",
          ],
          bullets: [
            "你应确保自己有权将数据提交到 Naviora，并依适用法规向终端用户提供必要的隐私告知与合法处理依据。",
            "若你适用 GDPR、UK GDPR 或类似法规，且我们代表你处理个人数据，你可以联系我们申请数据处理协议（DPA）。",
            "若发生跨境传输，我们可依适用法规采用充分性认定、标准合同条款（SCCs）或其他有效保护机制作为传输依据。",
          ],
        },
        {
          title: "8. 知识产权",
          body: [
            "除你依法拥有的内容外，Naviora 的网站、软件、界面、品牌、设计、文档与相关材料由我们或授权方拥有。条款未明确授予的权利均予保留。",
          ],
        },
        {
          title: "9. 暂停、限制与终止",
          bullets: [
            "若我们合理认为你违反本条款、造成安全风险、拖欠费用、滥用资源或使平台承担法律风险，我们可限制、暂停或终止全部或部分访问。",
            "你也可停止使用服务；但某些数据、记录或备份可能仍会因法律、账务或安全需要保留一段时间。",
          ],
        },
        {
          title: "10. 可用性、第三方服务与责任限制",
          body: [
            "我们会尽力维持服务可用与可靠，但不保证服务永不中断、无错误或完全符合你所有商业需求。Naviora 也可能依赖第三方基础设施与服务，例如 DeepSeek、Qwen、腾讯云 COS、Google Analytics，以及 Paddle、Creem 或其他支付合作方的流程。对于因第三方服务中断、网络问题、外部攻击、配置错误、内容违规或你自身操作造成的损失，我们会在法律允许范围内限制责任。",
          ],
        },
        {
          title: "11. 条款更新",
          body: [
            "我们可能更新本条款，以反映产品、价格、法规或运营方式的变化。若变更重大，我们会以合理方式公告。更新后继续使用服务，通常表示你接受新版条款。",
          ],
        },
      ],
      contactLabel: "如有条款、商务合作、支付流程、DPA 或合规相关问题，请联系：",
      backHome: "返回首页",
    };
  }

  return {
    title: "Terms of Service",
    updatedAt: "Last updated: April 9, 2026",
    intro:
      "These Terms of Service apply to your use of the Naviora website, workspace, API, beta access flow, public content pages, and related services. By accessing or using the service, you agree to these terms. If you use the service on behalf of a company or organization, you represent that you have authority to bind that entity.",
    summaryTitle: "Summary",
    summaryBody:
      "Naviora provides smart entry, rule-based link, QR routing, public content pages, AI-assisted creation flows, and analytics capabilities. You are responsible for the content, destination URLs, public entry behavior, AI-generated drafts, and API usage tied to your account, and you must not use the service for unlawful, fraudulent, infringing, or abusive purposes. If you are subject to GDPR or similar laws and we process personal data on your business's behalf, you may ask us for a DPA.",
    sections: [
      {
        title: "1. Service scope",
        bullets: [
          "Naviora offers entry creation, QR design, routing setup, analytics views, account settings, and related support features.",
          "Some features include AI-assisted entry drafting, routing suggestions, and content guidance currently supported by DeepSeek and Qwen.",
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
          "AI-generated copy, structure, or routing drafts are provided as assistance only, and you remain responsible for reviewing their accuracy, legality, and suitability before publishing.",
          "If you use Naviora to process personal data belonging to other people, you are responsible for having an appropriate lawful basis, notices, and permissions for that processing.",
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
        title: "5. Plans, fees, billing, and beta features",
        bullets: [
          "Paid plans, limits, feature access, and billing terms are governed by the current Pricing page, checkout page, or any written commercial agreement.",
          "If and when checkout, subscriptions, invoicing, or refunds are enabled, we may use Paddle, Creem, or other payment partners as merchant of record or related billing providers for payment processing, tax handling, customer invoicing, refunds, and chargebacks.",
          "When billing is enabled, parts of the checkout, tax, refund, or payment experience may also be subject to the applicable payment partner's customer-facing terms, checkout flow, or lawful billing processes. Refund eligibility and review are additionally described in the Refund Policy, subject to applicable law.",
          "Free, trial, beta, or early-access features may be more limited, less stable, or subject to change at any time.",
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
        title: "7. Data protection, role allocation, and DPA",
        body: [
          "For account administration, website operations, support, billing, payments, and general service management, Naviora generally acts as a data controller. If you are a business or team customer and we process personal data submitted to the platform on your behalf, we may also act as a processor or similar service provider for that data.",
        ],
        bullets: [
          "You are responsible for making sure you have the right to submit personal data to Naviora and for providing any legally required privacy notices and lawful basis to end users.",
          "If you are subject to GDPR, UK GDPR, or similar laws and we process personal data on your behalf, you may contact us to request a Data Processing Addendum (DPA).",
          "For international transfers, we may rely on adequacy decisions, Standard Contractual Clauses, or other valid safeguards where required by law.",
        ],
      },
      {
        title: "8. Intellectual property",
        body: [
          "Except for content you lawfully own, the website, software, interface, brand assets, documentation, and related materials in Naviora are owned by us or our licensors. Any rights not expressly granted remain reserved.",
        ],
      },
      {
        title: "9. Suspension, restriction, and termination",
        bullets: [
          "If we reasonably believe you have violated these terms, created security risk, failed to pay required fees, abused resources, or exposed the platform to legal risk, we may restrict, suspend, or terminate some or all access.",
          "You may stop using the service at any time, but certain records or backups may remain for legal, billing, audit, or security purposes for a period of time.",
        ],
      },
      {
        title: "10. Availability, third-party services, and limitation of liability",
        body: [
          "We work to keep the service available and reliable, but we do not guarantee uninterrupted availability, error-free operation, or suitability for every business need. Naviora may depend on third-party infrastructure and services, including DeepSeek, Qwen, Tencent Cloud COS, Google Analytics, and payment flows operated by Paddle, Creem, or other billing partners. To the extent permitted by law, our liability may be limited for losses caused by third-party outages, network failures, external attacks, configuration mistakes, content violations, or your own actions.",
        ],
      },
      {
        title: "11. Updates to these terms",
        body: [
          "We may update these terms to reflect changes in the product, pricing, law, or operations. If an update is material, we will provide notice through a reasonable channel. Continued use after an update will generally mean you accept the revised terms.",
        ],
      },
    ],
    contactLabel: "For questions about these terms, commercial use, billing, DPA, or compliance, contact:",
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
        </section>

        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{content.backHome}</Button>
        </Link>
      </Card>
    </div>
  );
}
