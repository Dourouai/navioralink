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
  backHome: string;
};

function getPrivacyContent(locale: Locale): PrivacyContent {
  if (locale === "zh-Hant") {
    return {
      title: "隱私政策",
      updatedAt: "最後更新：2026 年 4 月 9 日",
      intro:
        "本隱私政策說明 Naviora 如何蒐集、使用、保存、分享與保護你在使用網站、工作台、API、聯絡表單、公開內容頁與相關支援服務時提供的資料。當你建立帳號、建立智能入口、上傳頭像或使用分析與後續付款能力時，即表示你理解本政策所描述的資料處理方式。",
      summaryTitle: "摘要說明",
      summaryBody:
        "我們只會在提供服務、改善產品、維護安全、處理帳務與回覆支援所需的範圍內使用資料；不會將你的個人資料當作資料經紀商品出售。若你位於歐盟、歐洲經濟區、英國或瑞士，且我們代表你的企業處理資料，你也可以向我們申請資料處理協議（DPA）。",
      sections: [
        {
          title: "1. 我們蒐集哪些資料",
          body: [
            "我們蒐集的資料主要來自你主動提供的資訊、你在產品內建立或上傳的內容，以及產品正常運作過程中產生的技術紀錄。",
          ],
          bullets: [
            "帳號與聯絡資料：例如姓名、電子郵件地址、登入憑證、時區、語言偏好，以及你主動提供的公司或品牌資訊。",
            "工作資料：例如你建立的入口名稱、預設網址、語言/地區/設備/參數/A/B Test 路由規則、QR 設計設定、vCard 資料、社交媒體資料、資料夾與歸檔狀態。",
            "上傳與素材資料：例如你上傳的頭像、圖片、附件及其檔名、類型、大小、存取路徑與相關資產紀錄。這些檔案可能儲存在騰訊雲 Cloud Object Storage（COS）。",
            "分析與使用資料：例如掃碼次數、訪問時間、近似地區、裝置類型、設備系統、語言、來源維度、轉換事件，以及站點與產品互動紀錄。",
            "付款與帳務資料：若後續啟用付款、訂閱、發票或退款功能，相關結帳資料、訂單識別碼、付款狀態、訂閱狀態與稅務資訊可能由 Paddle、Creem 或其他付款合作方處理或回傳給我們。",
            "技術與安全資料：例如經截斷、匿名化或僅用於推導近似地區的網路訊號、瀏覽器類型、裝置資訊、Cookie、本機儲存、請求日誌、錯誤事件與安全監控資料。",
          ],
        },
        {
          title: "2. 我們如何使用資料",
          bullets: [
            "提供登入、入口建立、規則配置、QR 下載、分析檢視與帳號設定等核心功能。",
            "儲存並分發你上傳的頭像與公開素材，例如透過騰訊雲 COS 載入公開名片內容所需的圖片資源。",
            "維護產品穩定性、排查錯誤、偵測濫用、保護帳號安全並提升系統可靠性。",
            "理解使用趨勢，優化網站、工作台、AI 對話流程、規則配置與報表體驗。我們可能使用 Google Analytics 4 進行網站與產品分析。",
            "在你使用 AI 建立入口、整理路由草稿或取得內容建議時，相關提示、輸入內容與生成結果可能由 DeepSeek 與 Qwen 模型服務協助處理。",
            "在你使用結帳、訂閱、帳單或退款能力時，與 Paddle、Creem 或其他付款合作方協作處理交易、帳務、稅務、風險控管與客服流程。",
            "回覆支援需求、處理合規請求、資料存取請求、DPA 申請與其他商務或法務溝通。",
        ],
        },
        {
          title: "3. 我們在資料處理中的角色",
          body: [
            "在多數情況下，Naviora 會作為資料控制者（controller），處理與網站、帳號、帳務、支援、營運與合規相關的個人資料。",
            "若你是企業或團隊客戶，且我們代表你儲存、路由或顯示你提交到平台的內容或訪問資料，我們也可能就該等資料作為處理者（processor）或類似角色，依你的指示提供服務。依歐盟執委會對 GDPR controller/processor 的說明，決定「為什麼」與「如何」處理資料的一方通常為控制者；僅依他方指示處理資料的一方通常為處理者。",
          ],
        },
        {
          title: "4. 法律依據與處理基礎",
          body: [
            "在適用法規要求下，我們會依據不同情境使用相應的處理基礎，例如履行合約、遵守法律義務、保護平台安全、回應你的請求，或基於我們改善服務、保護網站及防止濫用的正當利益。若某些 Cookie、分析或行銷處理活動需要你的同意，我們會在適當情況下先取得授權。",
          ],
        },
        {
          title: "5. 我們何時會分享資料",
          body: [
            "我們不會出售你的個人資料，但在提供服務所需的情況下，可能與受我們指示處理資料的服務供應商合作。",
          ],
          bullets: [
            "騰訊雲 Cloud Object Storage（COS）：用於儲存你上傳的頭像、圖片與其他靜態素材。騰訊雲公開資料顯示，COS 為可透過 HTTP/HTTPS 存取的雲端物件儲存服務。",
            "Google Analytics 4：用於網站與產品使用分析。Google 官方表示，GA4 在蒐集資料時不會記錄或儲存個別 IP 位址；對歐盟流量，IP 位址資料僅會用於推導地理位置後立即丟棄。",
            "DeepSeek 與 Qwen：用於支援 AI 協助建立入口、整理路由草稿與內容建議。當你主動使用 AI 功能時，對應提示、內容片段與生成結果可能傳送至相關模型服務。",
            "Paddle、Creem 或其他付款合作方：若後續啟用結帳、訂閱或退款功能，相關合作方可能作為 Merchant of Record 或付款服務商處理付款、稅務、退款、拒付與客戶帳務資料。",
            "其他基礎設施、監控、客服、通知或專業顧問供應商，用於網站營運、稽核、法務、客服與安全防護。",
            "在法律要求、執法請求、爭議處理或保護 Naviora、用戶與公眾安全所必要時。",
          ],
        },
        {
          title: "6. Cookie、分析與追蹤技術",
          body: [
            "我們可能使用必要 Cookie、類似本機儲存與分析標記，以維持登入狀態、記住介面偏好、保護安全並改善產品體驗。依適用法規要求，非必要的分析或行銷 Cookie 會在取得你的同意後才啟用。你通常可以在瀏覽器中控制 Cookie 設定，但停用後部分功能可能受影響。",
          ],
        },
        {
          title: "7. 資料保存期限",
          bullets: [
            "只在達成本政策所述目的所需期間內保存資料。",
            "帳號資料通常會在帳號存續期間持續保存；若你提出刪除請求，我們會在合理期間內處理，但可能保留法律、帳務、安全或稽核所需的最小資料。",
            "分析與日誌資料可能依不同服務與法規要求保存一段時間後再匿名化、彙總化或刪除。",
            "若啟用付款能力，訂單、發票、退款、稅務與反詐欺紀錄可能依帳務、稅務、法規或付款合作方要求保存更長時間。",
          ],
        },
        {
          title: "8. 安全措施",
          body: [
            "我們採取合理的技術與管理措施保護資料，例如權限控制、加密傳輸、備份與安全監控。不過，任何網路或儲存系統都無法保證絕對安全，因此我們無法承諾零風險。",
          ],
        },
        {
          title: "9. 你的權利與選擇",
          bullets: [
            "更新或更正帳號資料。",
            "申請查閱、匯出、限制處理或刪除適用法規所保障的個人資料。",
            "對處理活動提出異議，或在適用情況下撤回同意。",
            "若你位於歐盟、歐洲經濟區、英國或瑞士，GDPR 及相關法規通常賦予你知情權、查閱權、更正權、刪除權、限制處理權、資料可攜權與反對權。",
            "依適用法規向監管機關提出申訴。我們會依適用法律時限處理請求，通常會在一個月內回覆，必要時可依法延長。",
          ],
        },
        {
          title: "10. 跨境傳輸與 DPA",
          body: [
            "由於 Naviora 可能使用位於不同地區的基礎設施與服務供應商，你的資料可能會在你所在地以外的地區處理。若適用法規要求，我們會採用充分性認定、歐盟標準契約條款（SCCs）或其他有效機制作為跨境傳輸保護措施。",
            "若你是適用 GDPR、UK GDPR 或類似法規的企業客戶，且我們代表你處理個人資料，你可以聯絡我們申請資料處理協議（Data Processing Addendum, DPA）。",
          ],
        },
        {
          title: "11. 兒童隱私",
          body: [
            "Naviora 並非以兒童為主要對象。如果你認為未成年人在未獲適當授權的情況下向我們提供了個人資料，請與我們聯絡，我們會儘快處理。",
          ],
        },
        {
          title: "12. 政策更新",
          body: [
            "我們可能不時更新本政策，以反映產品、法規或營運方式的變化。若變更屬重大性質，我們會以網站公告、產品通知或電子郵件等合理方式提醒你。",
          ],
        },
      ],
      contactLabel: "如有隱私、GDPR/UK GDPR 請求、DPA 申請或資料投訴，請聯絡：",
      backHome: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "隐私政策",
      updatedAt: "最后更新：2026 年 4 月 9 日",
      intro:
        "本隐私政策说明 Naviora 如何收集、使用、保存、共享与保护你在使用网站、工作台、API、联系表单、公开内容页及相关支持服务时提供的数据。当你创建账号、建立智能入口、上传头像或使用分析与后续付款能力时，即表示你理解本政策所描述的数据处理方式。",
      summaryTitle: "摘要说明",
      summaryBody:
        "我们只会在提供服务、改进产品、维护安全、处理账务与回复支持所需的范围内使用数据；不会将你的个人数据当作数据经纪商品出售。若你位于欧盟、欧洲经济区、英国或瑞士，且我们代表你的企业处理数据，你也可以向我们申请数据处理协议（DPA）。",
      sections: [
        {
          title: "1. 我们收集哪些数据",
          body: [
            "我们收集的数据主要来自你主动提供的信息、你在产品内创建或上传的内容，以及产品正常运行过程中产生的技术记录。",
          ],
          bullets: [
            "账号与联系数据：例如姓名、电子邮件地址、登录凭证、时区、语言偏好，以及你主动提供的公司或品牌信息。",
            "工作数据：例如你创建的入口名称、默认网址、语言/地区/设备/参数/A/B Test 路由规则、QR 设计配置、vCard 数据、社交媒体数据、文件夹与归档状态。",
            "上传与素材数据：例如你上传的头像、图片、附件及其文件名、类型、大小、访问路径与相关资产记录。这些文件可能存储在腾讯云 Cloud Object Storage（COS）。",
            "分析与使用数据：例如扫码次数、访问时间、近似地区、设备类型、设备系统、语言、来源维度、转化事件，以及站点与产品交互记录。",
            "支付与账务数据：若后续启用支付、订阅、发票或退款功能，相关结账数据、订单标识符、付款状态、订阅状态与税务信息可能由 Paddle、Creem 或其他支付合作方处理或回传给我们。",
            "技术与安全数据：例如经截断、匿名化或仅用于推导近似地区的网络信号、浏览器类型、设备信息、Cookie、本地存储、请求日志、错误事件与安全监控数据。",
          ],
        },
        {
          title: "2. 我们如何使用数据",
          bullets: [
            "提供登录、入口创建、规则配置、QR 下载、分析查看与账号设置等核心功能。",
            "存储并分发你上传的头像与公开素材，例如通过腾讯云 COS 加载公开名片内容所需的图片资源。",
            "维护产品稳定性、排查错误、识别滥用、保护账号安全并提升系统可靠性。",
            "理解使用趋势，优化网站、工作台、AI 对话流程、规则配置与报表体验。我们可能使用 Google Analytics 4 进行网站与产品分析。",
            "在你使用 AI 建立入口、整理路由草稿或获取内容建议时，相关提示、输入内容与生成结果可能由 DeepSeek 与 Qwen 模型服务协助处理。",
            "在你使用结账、订阅、账单或退款能力时，与 Paddle、Creem 或其他支付合作方协作处理交易、账务、税务、风控与客服流程。",
            "回复支持请求、处理合规请求、数据访问请求、DPA 申请与其他商务或法务沟通。",
          ],
        },
        {
          title: "3. 我们在数据处理中的角色",
          body: [
            "在多数情况下，Naviora 会作为数据控制者（controller），处理与网站、账号、账务、支持、运营与合规相关的个人数据。",
            "若你是企业或团队客户，且我们代表你存储、路由或展示你提交到平台的内容或访问数据，我们也可能就该等数据作为处理者（processor）或类似角色，依你的指示提供服务。根据欧盟委员会对 GDPR controller/processor 的说明，决定“为什么”与“如何”处理数据的一方通常为控制者；仅依他方指示处理数据的一方通常为处理者。",
          ],
        },
        {
          title: "4. 法律依据与处理基础",
          body: [
            "在适用法规要求下，我们会依据不同场景采用相应的处理基础，例如履行合同、遵守法律义务、保护平台安全、响应你的请求，或基于我们改进服务、保护网站及防止滥用的正当利益。若某些 Cookie、分析或营销处理活动需要你的同意，我们会在适当情况下先取得授权。",
          ],
        },
        {
          title: "5. 我们何时会共享数据",
          body: [
            "我们不会出售你的个人数据，但在提供服务所需的情况下，可能与受我们指示处理数据的服务供应商合作。",
          ],
          bullets: [
            "腾讯云 Cloud Object Storage（COS）：用于存储你上传的头像、图片与其他静态素材。腾讯云公开资料显示，COS 为可通过 HTTP/HTTPS 访问的云对象存储服务。",
            "Google Analytics 4：用于网站与产品使用分析。Google 官方表示，GA4 在收集数据时不会记录或存储单个 IP 地址；对欧盟流量，IP 地址数据仅会用于推导地理位置后立即丢弃。",
            "DeepSeek 与 Qwen：用于支持 AI 协助建立入口、整理路由草稿与内容建议。当你主动使用 AI 功能时，对应提示、内容片段与生成结果可能传送至相关模型服务。",
            "Paddle、Creem 或其他支付合作方：若后续启用结账、订阅或退款功能，相关合作方可能作为 Merchant of Record 或支付服务商处理付款、税务、退款、拒付与客户账务数据。",
            "其他基础设施、监控、客服、通知或专业顾问供应商，用于网站运营、审计、法务、客服与安全防护。",
            "在法律要求、执法请求、争议处理或保护 Naviora、用户与公众安全所必要时。",
          ],
        },
        {
          title: "6. Cookie、分析与追踪技术",
          body: [
            "我们可能使用必要 Cookie、类似本地存储与分析标记，以维持登录状态、记住界面偏好、保护安全并改进产品体验。依适用法规要求，非必要的分析或营销 Cookie 会在取得你的同意后才启用。你通常可以在浏览器中控制 Cookie 设置，但关闭后部分功能可能受到影响。",
          ],
        },
        {
          title: "7. 数据保存期限",
          bullets: [
            "只在实现本政策所述目的所需期间内保存数据。",
            "账号数据通常会在账号存续期间持续保存；若你提出删除请求，我们会在合理期间内处理，但可能保留法律、账务、安全或审计所需的最小数据。",
            "分析与日志数据可能依不同服务与法规要求保存一段时间后再匿名化、汇总化或删除。",
            "若启用付款能力，订单、发票、退款、税务与反欺诈记录可能依账务、税务、法规或支付合作方要求保存更长时间。",
          ],
        },
        {
          title: "8. 安全措施",
          body: [
            "我们采取合理的技术与管理措施保护数据，例如权限控制、加密传输、备份与安全监控。不过，任何网络或存储系统都无法保证绝对安全，因此我们无法承诺零风险。",
          ],
        },
        {
          title: "9. 你的权利与选择",
          bullets: [
            "更新或更正账号数据。",
            "申请查阅、导出、限制处理或删除适用法规所保障的个人数据。",
            "对处理活动提出异议，或在适用情况下撤回同意。",
            "若你位于欧盟、欧洲经济区、英国或瑞士，GDPR 及相关法规通常赋予你知情权、查阅权、更正权、删除权、限制处理权、数据可携权与反对权。",
            "依适用法规向监管机构提出投诉。我们会依适用法律时限处理请求，通常会在一个月内回复，必要时可依法延长。",
          ],
        },
        {
          title: "10. 跨境传输与 DPA",
          body: [
            "由于 Naviora 可能使用位于不同地区的基础设施与服务供应商，你的数据可能会在你所在地之外的地区处理。若适用法规要求，我们会采用充分性认定、欧盟标准合同条款（SCCs）或其他有效机制作为跨境传输保护措施。",
            "若你是适用 GDPR、UK GDPR 或类似法规的企业客户，且我们代表你处理个人数据，你可以联系我们申请数据处理协议（Data Processing Addendum, DPA）。",
          ],
        },
        {
          title: "11. 儿童隐私",
          body: [
            "Naviora 并非以儿童为主要服务对象。如果你认为未成年人在未获得适当授权的情况下向我们提供了个人数据，请与我们联系，我们会尽快处理。",
          ],
        },
        {
          title: "12. 政策更新",
          body: [
            "我们可能不时更新本政策，以反映产品、法规或运营方式的变化。若变更属于重大性质，我们会以网站公告、产品通知或邮件等合理方式提醒你。",
          ],
        },
      ],
      contactLabel: "如有隐私、GDPR/UK GDPR 请求、DPA 申请或数据投诉，请联系：",
      backHome: "返回首页",
    };
  }

  return {
    title: "Privacy Policy",
    updatedAt: "Last updated: April 9, 2026",
    intro:
      "This Privacy Policy explains how Naviora collects, uses, stores, shares, and protects information when you use the website, workspace, API, contact forms, public content pages, and related support services. By creating an account, creating smart entries, uploading an avatar, or using analytics and future billing features, you acknowledge the data practices described below.",
    summaryTitle: "Summary",
    summaryBody:
      "We use data only as needed to provide the service, improve the product, maintain security, process billing, and support users. We do not sell personal data as a data broker. If you are subject to GDPR, UK GDPR, or similar laws and we process personal data on your business's behalf, you may ask us for a data processing addendum (DPA).",
    sections: [
      {
        title: "1. Information we collect",
        body: [
          "The information we collect generally comes from what you provide directly, what you create or upload inside the product, and what is generated as part of the service operating normally.",
        ],
        bullets: [
          "Account and contact information, such as your name, email address, sign-in credentials, time zone, language preferences, and company or brand information you provide.",
          "Workspace data, such as entry names, default URLs, routing rules by language, region, device, param, and experiments, QR design settings, vCard details, social links, folders, and archive state.",
          "Upload and asset data, such as avatars, images, attachments, filenames, file types, sizes, asset paths, and related metadata. These files may be stored in Tencent Cloud Object Storage (COS).",
          "Analytics and usage data, such as scans, visit timestamps, approximate region, device type, device OS, language, source dimensions, conversion events, and interactions with our website and product.",
          "Billing and transaction data, if and when checkout, subscriptions, invoicing, or refunds are enabled, such as order identifiers, payment status, subscription status, and tax-related data processed by or returned from Paddle, Creem, or other billing partners.",
          "Technical and security data, such as truncated, anonymized, or region-derived network signals, browser type, device data, cookies, local storage, request logs, error events, and abuse or security monitoring records.",
        ],
      },
      {
        title: "2. How we use information",
        bullets: [
          "To provide core features such as sign-in, entry creation, routing setup, QR downloads, analytics, and account settings.",
          "To store and deliver the avatars and public assets you upload, including loading images needed for public card pages through Tencent Cloud COS.",
          "To maintain service reliability, troubleshoot issues, detect abuse, protect accounts, and improve security.",
          "To understand usage patterns and improve the website, workspace, AI-assisted setup, routing experience, and reporting. We may use Google Analytics 4 for website and product analytics.",
          "To power AI-assisted entry creation, routing drafts, and content suggestions. When you use AI features, relevant prompts, content fragments, and generated output may be processed by DeepSeek and Qwen model services.",
          "To work with payment and billing partners, including Paddle, Creem, and other billing partners if and when billing is enabled, for transactions, invoicing, tax handling, fraud prevention, subscription management, refunds, and support workflows.",
          "To respond to support requests, compliance requests, privacy rights requests, DPA requests, and other commercial or legal communications.",
        ],
      },
      {
        title: "3. Our role in processing data",
        body: [
          "In most cases, Naviora acts as a data controller for account administration, website operations, support, billing, service communications, security, and compliance.",
          "If you are a business or team customer and we process personal data contained in the content, routing flows, or analytics you submit to the platform on your behalf, we may also act as a processor or similar service provider for that data. As the European Commission explains, the party deciding why and how personal data is processed is generally the controller, while a party acting only on instructions is generally the processor.",
        ],
      },
      {
        title: "4. Legal bases for processing",
        body: [
          "Where required by applicable law, we rely on appropriate legal bases depending on the context, including contract performance, compliance with legal obligations, security and fraud prevention, responding to your requests, or our legitimate interests in operating, securing, and improving the service. Where consent is required, such as for certain analytics or marketing cookies, we will request it in an appropriate manner.",
        ],
      },
      {
        title: "5. When we share information",
        body: [
          "We do not sell your personal information. We may share data with service providers acting on our instructions when necessary to operate the service.",
        ],
        bullets: [
          "Tencent Cloud Object Storage (COS), which we use to store avatars, images, and other static assets. Tencent Cloud describes COS as an object storage service accessible over HTTP and HTTPS.",
          "Google Analytics 4, which we may use for website and product analytics. Google states that GA4 does not log or store individual IP addresses, and that for EU traffic IP address data is used only to derive geolocation and is then discarded.",
          "DeepSeek and Qwen, which we may use to support AI-assisted entry creation, routing drafts, and content suggestions. When you actively use AI features, relevant prompts, content fragments, and generated output may be sent to the applicable model service.",
          "Paddle, Creem, and other billing partners, if and when billing is enabled, which may act as merchant of record or related billing providers for payment processing, taxes, refunds, chargebacks, and customer billing records.",
          "Other infrastructure, monitoring, support, notification, and professional service providers that help us operate the service, communicate with users, run audits, or obtain legal advice.",
          "Authorities, counterparties, or advisors where disclosure is required by law, necessary to resolve disputes, or needed to protect Naviora, users, or the public.",
        ],
      },
      {
        title: "6. Cookies, analytics, and tracking technologies",
        body: [
          "We may use essential cookies, similar local storage, and analytics tags to keep you signed in, remember interface preferences, protect the service, and improve the product. Where required by law, non-essential analytics or marketing cookies are used only with your consent. You can usually control cookies through your browser settings, but some functionality may be limited if you disable them.",
        ],
      },
      {
        title: "7. Data retention",
        bullets: [
          "We keep data only for as long as needed to fulfill the purposes described in this policy.",
          "Account information is generally retained while your account remains active. If you request deletion, we will process that request within a reasonable period, while retaining the minimum data needed for legal, billing, security, or audit purposes.",
          "Analytics and log data may be retained for different periods depending on technical needs and legal requirements, after which they may be deleted, anonymized, or aggregated.",
          "If billing features are enabled, order, invoice, tax, refund, and anti-fraud records may be retained longer where needed for accounting, tax, chargeback, or regulatory purposes.",
        ],
      },
      {
        title: "8. Security",
        body: [
          "We use reasonable technical and organizational safeguards, including access controls, encrypted transport, backups, and security monitoring. No system can guarantee absolute security, so we cannot promise zero risk.",
        ],
      },
      {
        title: "9. Your choices and rights",
        bullets: [
          "Update or correct your account information.",
          "Request access, export, restriction, objection, or deletion of personal information where those rights apply.",
          "Withdraw consent where applicable, for example for optional analytics or marketing cookies.",
          "If you are in the EU, EEA, United Kingdom, or Switzerland, applicable data protection law generally gives you rights to be informed, access, rectification, erasure, restriction, portability, and objection.",
          "Contact a relevant supervisory authority if you believe your rights have been violated. We will respond within the timelines required by applicable law, typically within one month, subject to lawful extensions.",
        ],
      },
      {
        title: "10. International transfers and DPA",
        body: [
          "Because Naviora may rely on infrastructure and service providers in multiple regions, your information may be processed outside the place where you are located. Where required, we rely on adequacy decisions, the European Commission's Standard Contractual Clauses, or other valid safeguards for cross-border transfers.",
          "If you are a business customer subject to GDPR, UK GDPR, or similar laws and we process personal data on your behalf, you may contact us to request a Data Processing Addendum (DPA).",
        ],
      },
      {
        title: "11. Children's privacy",
        body: [
          "Naviora is not designed primarily for children. If you believe a minor has provided personal information without appropriate authorization, please contact us and we will review the request promptly.",
        ],
      },
      {
        title: "12. Updates to this policy",
        body: [
          "We may update this policy from time to time to reflect changes in the product, applicable laws, or how we operate. If a change is material, we will use a reasonable method to notify you, such as an in-product notice, website update, or email.",
        ],
      },
    ],
    contactLabel: "For privacy questions, GDPR or UK GDPR requests, DPA requests, or complaints, contact:",
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
        </section>

        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{content.backHome}</Button>
        </Link>
      </Card>
    </div>
  );
}
