import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type RefundSection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type RefundContent = {
  title: string;
  updatedAt: string;
  intro: string;
  summaryTitle: string;
  summaryBody: string;
  sections: RefundSection[];
  contactLabel: string;
  supportLabel: string;
  backHome: string;
};

function getRefundContent(locale: Locale): RefundContent {
  if (locale === "zh-Hant") {
    return {
      title: "退款政策",
      updatedAt: "最後更新：2026 年 4 月 10 日",
      intro:
        "本退款政策適用於 Naviora 的 SaaS 訂閱與後續啟用的付款能力。一般情況下，數位服務一旦開通並可正常使用，通常不提供無條件退款；但若因服務不可用或重大功能故障明顯影響你的核心使用，我們會在合理範圍內提供退款審核。",
      summaryTitle: "摘要說明",
      summaryBody:
        "若你在購買後 14 天內，因 Naviora 服務不可用、重大功能故障，且該問題實際影響你正常使用核心功能，可聯絡我們申請退款。我們會依實際情況審核；如適用法律另有要求，則以適用法律為準。",
      sections: [
        {
          title: "1. 可申請退款的情況",
          bullets: [
            "你在首次付款或最近一次續費後 14 天內提出申請。",
            "Naviora 出現服務不可用、重大故障，或明顯影響智能入口、公開頁面、規則配置、下載、分析或其他核心功能的正常使用。",
            "問題並非由你自己的設定錯誤、第三方內容違規、外部網址失效、瀏覽器插件衝突、網路環境或其他非 Naviora 可控因素造成。",
            "你已先聯絡我們，讓我們有合理機會驗證、排查並嘗試修復問題。",
          ],
        },
        {
          title: "2. 一般不適用退款的情況",
          bullets: [
            "你只是改變使用計畫、暫時不再需要服務，或已自行取消未來續費。",
            "因個人誤操作、路由配置錯誤、目標網址失效、第三方平台封鎖、外部追蹤碼配置錯誤等原因造成的使用問題。",
            "你已大量或長期正常使用服務後，再以非重大故障為由要求全額退款。",
            "免費、內測、試用、贈送、激活碼兌換、商務折扣、合作渠道或特殊協議方案，除非書面約定，通常不提供現金退款。",
          ],
        },
        {
          title: "3. 如何申請",
          body: [
            "請在退款窗口內透過 Email 聯絡我們，並盡量提供帳號 Email、訂單時間、付款方式、問題描述、重現步驟、截圖或影片，以及你認為受到影響的核心功能。",
          ],
          bullets: [
            "聯絡信箱：huters@qq.com",
            "主旨建議包含：Refund Request / Naviora",
            "若你透過 Paddle、Creem 或其他付款合作方完成付款，我們可能需要依據該合作方的訂單資訊核對紀錄。",
          ],
        },
        {
          title: "4. 審核與處理",
          body: [
            "我們會在收到申請後合理時間內回覆，通常先確認問題是否存在、是否可重現，以及是否屬於退款範圍。若退款獲准，款項通常會原路退回；實際到帳時間仍取決於付款合作方、銀行、發卡機構或支付渠道。",
          ],
        },
        {
          title: "5. 取消與退款不是同一件事",
          body: [
            "取消訂閱通常只會停止未來續費，不會自動產生對既有付款的退款。若你希望退款，仍需在適用期限內另行提出申請並通過審核。",
          ],
        },
        {
          title: "6. 法律保留",
          body: [
            "本政策提供的是 Naviora 一般性的 SaaS 退款處理原則，不影響你在適用消費者保護、數位內容、支付服務或其他強制性法律下可能享有的權利。若適用法律要求更高保障，將以該等法律為準。",
          ],
        },
      ],
      contactLabel: "如需申請退款、說明故障情況或確認付款紀錄，請聯絡：",
      supportLabel: "聯絡支持",
      backHome: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "退款政策",
      updatedAt: "最后更新：2026 年 4 月 10 日",
      intro:
        "本退款政策适用于 Naviora 的 SaaS 订阅与后续启用的支付能力。一般情况下，数字服务一旦开通并可正常使用，通常不提供无条件退款；但若因服务不可用或重大功能故障明显影响你的核心使用，我们会在合理范围内提供退款审核。",
      summaryTitle: "摘要说明",
      summaryBody:
        "若你在购买后 14 天内，因 Naviora 服务不可用、重大功能故障，且该问题实际影响你正常使用核心功能，可联系我们申请退款。我们会按实际情况审核；如适用法律另有要求，则以适用法律为准。",
      sections: [
        {
          title: "1. 可申请退款的情况",
          bullets: [
            "你在首次付款或最近一次续费后 14 天内提出申请。",
            "Naviora 出现服务不可用、重大故障，或明显影响智能入口、公开页面、规则配置、下载、分析或其他核心功能的正常使用。",
            "问题并非由你自己的配置错误、第三方内容违规、外部网址失效、浏览器插件冲突、网络环境或其他非 Naviora 可控因素造成。",
            "你已先联系我们，让我们有合理机会验证、排查并尝试修复问题。",
          ],
        },
        {
          title: "2. 一般不适用退款的情况",
          bullets: [
            "你只是改变使用计划、暂时不再需要服务，或已自行取消未来续费。",
            "因个人误操作、路由配置错误、目标网址失效、第三方平台封锁、外部追踪码配置错误等原因造成的使用问题。",
            "你已大量或长期正常使用服务后，再以非重大故障为由要求全额退款。",
            "免费、内测、试用、赠送、激活码兑换、商务折扣、合作渠道或特殊协议方案，除非书面约定，通常不提供现金退款。",
          ],
        },
        {
          title: "3. 如何申请",
          body: [
            "请在退款窗口内通过 Email 联系我们，并尽量提供账号 Email、订单时间、付款方式、问题描述、复现步骤、截图或视频，以及你认为受到影响的核心功能。",
          ],
          bullets: [
            "联系邮箱：huters@qq.com",
            "主题建议包含：Refund Request / Naviora",
            "若你通过 Paddle、Creem 或其他支付合作方完成付款，我们可能需要依据该合作方的订单信息核对记录。",
          ],
        },
        {
          title: "4. 审核与处理",
          body: [
            "我们会在收到申请后合理时间内回复，通常先确认问题是否存在、是否可复现，以及是否属于退款范围。若退款获准，款项通常会原路退回；实际到账时间仍取决于支付合作方、银行、发卡机构或支付渠道。",
          ],
        },
        {
          title: "5. 取消与退款不是同一件事",
          body: [
            "取消订阅通常只会停止未来续费，不会自动产生对既有付款的退款。若你希望退款，仍需在适用期限内另行提出申请并通过审核。",
          ],
        },
        {
          title: "6. 法律保留",
          body: [
            "本政策提供的是 Naviora 一般性的 SaaS 退款处理原则，不影响你在适用消费者保护、数字内容、支付服务或其他强制性法律下可能享有的权利。若适用法律要求更高保障，将以该等法律为准。",
          ],
        },
      ],
      contactLabel: "如需申请退款、说明故障情况或确认付款记录，请联系：",
      supportLabel: "联系支持",
      backHome: "返回首页",
    };
  }

  return {
    title: "Refund Policy",
    updatedAt: "Last updated: April 10, 2026",
    intro:
      "This Refund Policy applies to Naviora SaaS subscriptions and any payment features we enable over time. As a general rule, once digital service access is provisioned and working normally, refunds are not automatic. However, if service unavailability or a material product defect significantly affects your core use, we may review a refund request within a reasonable scope.",
    summaryTitle: "Summary",
    summaryBody:
      "If you contact us within 14 days of your initial payment or latest renewal because Naviora was unavailable or a material defect affected core functionality, you may request a refund review. We assess requests case by case, and if applicable law gives you stronger rights, those rights still apply.",
    sections: [
      {
        title: "1. When a refund may be considered",
        bullets: [
          "You contact us within 14 days of the original charge or latest renewal.",
          "Naviora was unavailable, or a material defect significantly affected core features such as smart entries, public pages, routing, downloads, analytics, or similar core use.",
          "The issue was not caused by your own misconfiguration, an invalid external destination, third-party content violations, browser extensions, local network issues, or other factors outside Naviora's reasonable control.",
          "You gave us a reasonable opportunity to verify, troubleshoot, and attempt a fix first.",
        ],
      },
      {
        title: "2. When refunds are generally not available",
        bullets: [
          "You changed your mind, no longer need the service, or already canceled future renewals.",
          "The issue was caused by routing mistakes, destination URL problems, external platform restrictions, third-party tracking setup, or other factors outside the product itself.",
          "You have already used the service substantially or over a longer period and the request is not tied to a material defect.",
          "Free plans, betas, trials, grants, activation-code redemptions, discounted commercial arrangements, or channel deals are generally not refundable unless we agreed otherwise in writing.",
        ],
      },
      {
        title: "3. How to request a refund",
        body: [
          "Please contact us by email within the eligible window and include the account email, order timing, payment method, a description of the issue, how to reproduce it, and any screenshots or recordings that help show the impact on core functionality.",
        ],
        bullets: [
          "Contact: huters@qq.com",
          "Suggested subject line: Refund Request / Naviora",
          "If your payment was processed through Paddle, Creem, or another billing partner, we may need to verify the order details returned by that provider.",
        ],
      },
      {
        title: "4. Review and processing",
        body: [
          "We will review the request within a reasonable time, usually by verifying whether the issue existed, whether it can be reproduced, and whether it falls within this policy. If approved, refunds are typically sent back to the original payment method, although final timing depends on the payment provider, bank, card network, or other payment channel.",
        ],
      },
      {
        title: "5. Cancellation is not the same as a refund",
        body: [
          "Canceling a subscription generally stops future renewals only. It does not automatically refund prior charges. If you want a refund, you still need to request one within the applicable window and meet the review criteria.",
        ],
      },
      {
        title: "6. Legal carve-out",
        body: [
          "This policy describes Naviora's general SaaS refund approach and does not limit any non-waivable rights you may have under applicable consumer protection, digital content, payment services, or other mandatory law. Where applicable law requires a different result, that law will control.",
        ],
      },
    ],
    contactLabel: "For refund requests, outage reports, or billing verification questions, contact:",
    supportLabel: "Contact support",
    backHome: "Back to home",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "refundPolicy");
}

export default async function RefundPolicyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const content = getRefundContent(locale);

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

        <div className="flex flex-wrap gap-3">
          <Link href={withLocale(locale, "/support")}>
            <Button>{content.supportLabel}</Button>
          </Link>
          <Link href={withLocale(locale, "/")}>
            <Button variant="secondary">{content.backHome}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
