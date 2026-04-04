# Naviora 前端需求补充与 UI 风格参考（V1 Addendum）

本文档用于补充《Naviora 前端需求文档 V1》，目标是让 Codex 能按统一标准稳定开发，减少返工。

## 0. 产品定位与命名

- 产品定位名称：`Rule-based Links and QR Routing`
- 核心标语：
  - `One link, routed smarter.`
  - `Smart links and QR routing for global audiences.`
  - `Create once, route anywhere.`
- 产品核心模型：`一个入口 + 一组规则 + 一个目标内容`
  - 入口（Entry）：用户访问的统一链接或二维码入口，是抽象的路由层。
  - 规则（Rules）：决定请求应被路由到哪个目标内容。
  - 目标内容（Target Content）：被入口命中的最终载体，可为 `link`、`pdf`、`vcard`、`file`、`deep_link` 等。
  - 重要原则：`link / PDF / vCard` 都不是入口类型，而是目标内容载体；产品不应因内容载体不同而拆成多套入口创建流。

## 1. 文档定位

- 主文档：定义业务范围与页面目标。
- 本补充：定义实现边界、交互规则、接口契约、视觉规范、验收标准。

## 1.1 阶段计划（建议）

- Phase 1：先完成 Web App 闭环
  - 官网
  - 登录 / 注册
  - 工作台
  - 入口创建、管理、分析、设置、升级
- Phase 1.5：开放 API 使用方式
  - 支持通过 API 创建、更新、归档、恢复入口
  - 支持通过 API 查询入口详情与基础分析
  - 引入 API Key 认证机制
- Phase 2：扩展平台能力
  - 更完整的规则引擎
  - 更细的分析维度
  - 团队协作、权限、Webhook、SDK 等配套能力
  - 扩展更多目标内容载体

## 1.2 目标内容优先级（当前约定）

- 当前产品优先级顺序调整为：
  - `link`：基础且默认
  - `whatsapp`：优先级高于 PDF
  - `vcard`：优先级高于 PDF
  - `pdf`：延后处理
- 这代表接下来在交互设计、数据模型预留与页面提示上，应优先围绕：
  - 网页链接跳转
  - WhatsApp 联系或会话入口
  - vCard 名片分享
- PDF 仍属于目标内容载体的一部分，但不应优先占用 V1.5 的主设计与开发资源。

## 2. V1 实现边界（冻结）

- 入口类型在 V1 保持统一，始终是 `Smart Entry / 动态二维码入口`。
- 当前 V1 前端实现先以 `link`（URL）作为默认且唯一可编辑的目标内容载体。
- 数据模型、文档与交互描述必须为后续 `whatsapp`、`vcard`、`pdf`、`file` 等目标内容载体预留扩展位。
- 扩展优先顺序上，`whatsapp` 与 `vcard` 先于 `pdf`。
- 规则模式为六种：`none | language | region | device | param | ab`，且互斥（V1 先不支持多模式组合）。
- AI 模型为 `Qwen 3.5 Plus`，只负责生成草稿，不直接保存最终二维码。
- 支持两套语言文案：`zh-Hant`、`en`。
- 前端必须先通过 mock 数据跑通完整闭环，再接真实 API。
- 产品使用方式分为两类：
  - Web App：给人工操作、运营、查看分析使用
  - API：给程序化创建、批量管理、系统集成使用

## 3. 补充业务规则

## 3.1 路由与登录态

- 未登录可访问：`/`、`/login`、`/register`、`/beta`。
- 已登录可访问：`/dashboard`、`/qrs`、`/qrs/new`、`/analytics`、`/qrs/[id]/analytics`、`/settings`、`/upgrade`。
- 登录成功后统一跳转 `/dashboard`。
- 注册成功后 V1 直接进入 `/dashboard`（如后续改为跳 `/login`，在配置层切换）。

## 3.2 链接与路由草稿规则

- `defaultUrl` 为必填，且代表默认目标地址（Target URL）。
- `defaultUrl` 在当前实现中代表默认目标内容的来源 URL；即使未来目标内容是 `pdf` 或 `vcard`，入口层仍保持不变。
- `targetType` 不应用来区分“入口类型”，而应用来标记“目标内容载体类型”。
- 产品层统一约定：
  - 外层始终是 `Entry`
  - 中间层始终是 `Rules`
  - 内层才是 `Target Content`
- 当前 V1 可编辑值先固定为 `targetType=link`，但后续应兼容：
  - `link`
  - `whatsapp`
  - `vcard`
  - `pdf`
  - `file`
  - `deep_link`
- `ruleMode=none`：
  - 所有访问者都命中 `defaultUrl`。
- `ruleMode=language`：
  - 仅允许编辑 `languageRules`，其他规则数组在提交时清空。
  - `language` 使用 BCP 47 / ISO 639-1 代码（如 `en`、`zh-Hant`、`ja`）。
- `ruleMode=region`：
  - 仅允许编辑 `regionRules`，其他规则数组在提交时清空。
  - `region` 使用 ISO 3166-1 alpha-2 代码（如 `US`、`JP`、`TW`）。
- `ruleMode=device`：
  - 仅允许编辑 `deviceRules`，其他规则数组在提交时清空。
  - `os` 允许值：`ios | android | ipados | windows | macos | other`。
- `ruleMode=param`：
  - 仅允许编辑 `paramRules`，其他规则数组在提交时清空。
  - 每条规则最少字段：`key`、`value`、`url`。
  - 典型示例：`utm_campaign=spring`、`ref=instagram`、`channel=partner`。
- `ruleMode=ab`：
  - 仅允许编辑 `abRules`，其他规则数组在提交时清空。
  - 固定为两个变体：`A` 与 `B`。
  - 至少需填写：`A 占比`、`A URL`、`B URL`。
  - `B 占比` 自动等于 `100 - A 占比`，总和必须为 `100%`。
- 通用校验：
  - 每条规则必须满足：`key 不为空` + `url 为合法 URL`。
  - 对于 `none` 模式，规则数组必须为空。
- Tracking、Password、Folder、Expiration Date 在 V1 为“结构可填写”，不要求后端真实生效。

## 3.3 创建智能入口三步流状态机

- Step1（对话）可反复发送消息。
- Step1 的核心问题应始终是“默认目标内容是什么”，而不是“你要创建 link 还是 PDF”。
- 若用户输入的是普通网页 URL，则视为 `link` 目标内容。
- 若用户输入的是 `wa.me`、`api.whatsapp.com`、`.vcf`、vCard 数据链接或 `.pdf` / 文件直链，系统应识别其为不同的目标内容类型，并在 UI 中以 badge 或说明提示，而不是切换到另一套创建流程。
- V1 不为 `WhatsApp / vCard / PDF` 单独拆出新建入口流程；它们都属于同一套 Entry 创建流中的目标内容载体。
- 在后续扩展时，Step1 推荐的快捷入口顺序应为：
  - 粘贴链接
  - WhatsApp
  - vCard
  - PDF / 文件
- 仅当 `defaultUrl` 存在时，Step1 的“进入确认”按钮可高亮可点。
- 当用户已提供 `defaultUrl` 且 AI 判断信息已足够时，可自动进入 Step2。
- AI 在拿到明确 URL 后，最多只做一次补充追问；若用户回复“可以了 / 就这样 / ok”等确认语，应直接进入确认草稿。
- AI 需先判断场景，再按平台已有能力补问，避免无关追问：
  - 多语言场景 => `language`
  - 地区场景 => `region`
  - 设备系统场景 => `device`
  - 参数路由场景 => `param`
  - A/B Test 场景 => `ab`
  - 追踪场景 => `tracking`
  - 受限访问场景 => `password`
  - 时效场景 => `expiration date`
- Step2（确认草稿）可返回 Step1 补充信息。
- Step2 -> Step3 前执行一次草稿校验：
  - `ruleMode=device` 时校验设备系统唯一性（同一 OS 不重复）。
  - `ruleMode=param` 时校验参数名与参数值均不为空。
  - `ruleMode=ab` 时校验 A/B 两个 URL 均存在，且占比总和为 `100%`。
- Step3（设计）点击“生成二维码”触发提交；成功后跳转 `/qrs` 并显示成功提示。
- 任一步骤切换都不能丢失已输入状态（使用 store 持久当前会话）。

## 3.3.1 目标内容抽象规则

- Entry 是稳定的公开入口，例如：`go.naviora.link/l/{slug}`。
- 目标内容（Target Content）才是被路由命中的真正载体。
- 一个 Entry 至少有一个默认目标内容，可附带多条规则命中的目标内容。
- 不同规则可以命中不同内容载体，例如：
  - 默认用户 -> `https://brand.com`
  - WhatsApp 按钮 -> `https://wa.me/...`
  - 参数模式 -> 不同 vCard
  - 地区模式 -> 不同 brochure PDF
- 因此，“WhatsApp 分享”“vCard 分享”“PDF 分享”“链接跳转”本质上都应被建模为：
  - 同一个 `Entry`
  - 不同的 `Target Content`
- 交互上不建议在入口创建第一步就强制用户选择 `Link / WhatsApp / vCard / PDF`，而应先让用户提供默认目标内容，再由系统识别内容类型并给出提示。

## 3.4 管理页规则

- 搜索默认按 `name`、`defaultUrl` 模糊匹配。
- 搜索同时匹配公开入口 URL（如 `go.naviora.link/l/{slug}`）。
- `defaultUrl` 需支持一键复制。
- 公开入口 URL 也需支持一键复制。
- 下载操作默认为下载该入口二维码文件（当前前端可先输出 SVG）。
- 入口不支持物理删除，只允许归档。
- 默认列表不显示 `archived` 状态入口。
- 管理页需提供“查看归档”切换，进入后只显示已归档入口。
- 已归档入口需支持“恢复”回主列表。
- 编辑入口先复用 `/qrs/new?id=xxx`。
- 每条入口需支持进入单独分析页 `/qrs/[id]/analytics`。
- 列表为空时必须显示 Empty State 和“创建智能入口”按钮。

## 3.5 分析统计规则

- 全局分析页默认统计全部已创建入口，默认时间范围为 `最近 7 天`。
- 时间范围最长支持 `365 天`，预设档位为：`7 | 30 | 90 | 180 | 365` 天。
- 全局分析页仅允许筛选“具体入口”，V1 不提供“状态”和“规则模式”筛选。
- 全局分析页需展示：
  - 总扫码次数
  - 今日扫码
  - 已纳入统计入口数
  - 独立访客
  - 平均转换率
  - 趋势图
  - Top 入口排行
  - 地区、设备类型、设备系统、语言分布
- Top 入口排行和入口管理列表均应可跳转到单入口分析页。
- 单入口分析页需展示：
  - 核心指标卡（总扫码、今日扫码、独立访客、转换率）
  - 趋势图
  - 路由快照（默认 URL、规则模式、状态、创建时间、追踪状态）
  - 世界地图流量分布
  - 地区、设备类型、设备系统、语言图表与明细
- 当前 mock 分析数据至少覆盖：`scans`、`trend`、`region`、`deviceType`、`deviceOs`、`language`、`lastScan`、`conversionRate`。
- 当接入真实分析源后，建议扩展：`city`、`browser`、`os`、`referrer`、`utm_*`、`events`。

## 3.6 设置与订阅规则

- 设置中心需包含：
  - 账号概览
  - 登录邮箱更换
  - 密码修改
  - 当前计划
  - 用量概览
  - 账单记录
- 邮箱修改必须通过弹窗流程完成：
  - Step 1：输入当前密码
  - Step 2：输入新邮箱
  - Step 3：输入新邮箱验证码
- 密码修改必须通过弹窗流程完成：
  - Step 1：发送并输入当前邮箱验证码
  - Step 2：输入新密码
  - Step 3：再次确认新密码
- 邮箱修改需校验为合法邮箱，且不能与当前邮箱相同。
- 密码修改需校验验证码非空、新密码长度、确认密码一致性。
- “当前计划”与“升级页面”必须复用同一份价格配置，避免前后台价格不一致。
- 账单记录在 V1 可使用 mock 数据，但需保留后续接 Stripe 或真实 Billing API 的结构。

## 3.7 API 使用方式规则

- 产品需支持通过 API 的方式使用，不仅限于 Web 后台操作。
- API 使用场景包括：
  - 批量创建入口
  - 更新默认 URL
  - 更新路由规则
  - 归档 / 恢复入口
  - 查询入口详情
  - 查询基础分析数据
- API 认证方式建议为 `API Key`：
  - 每个 workspace / account 可创建一组或多组 API Key
  - Key 仅在创建时明文显示一次
  - 支持禁用和轮换
- API 与 Web App 应共享同一份核心数据模型：
  - `entry`
  - `ruleMode`
  - `languageRules`
  - `regionRules`
  - `deviceRules`
  - `paramRules`
  - `tracking`
  - `status`
- API 的入口生命周期与 Web 一致：
  - 不支持物理删除
  - 仅支持归档与恢复
- API 返回结构应尽量稳定、可程序消费：
  - 成功 / 失败状态
  - 统一错误码
  - 可分页列表
  - 标准时间字段（ISO 8601）
- V1 前端可先不做完整 API 管理页面，但文档、数据结构与 mock service 需为 API 模式预留字段。

## 4. 前端状态与错误处理补充

## 4.1 通用状态组件

统一使用四类页面状态：

- `loading`: 骨架屏或占位卡片
- `empty`: 空态插画 + 引导 CTA
- `error`: 错误文案 + 重试按钮
- `success`: 轻量 toast 或页面内提示

## 4.2 错误文案建议（V1）

- 登录失败：`邮箱或密码错误，请重试`
- 注册失败：`注册失败，请稍后再试`
- AI 响应失败：`AI 暂时不可用，请稍后重试`
- 保存失败：`保存失败，请检查必填项`
- 生成失败：`生成失败，请稍后重试`

## 5. Mock API 契约（建议）

为减少联调成本，mock service 统一返回：

```ts
type ApiResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
};
```

建议覆盖接口：

- `login(payload)`
- `register(payload)`
- `getDashboardStats()`
- `getQrList(params)`
- `getAnalyticsOverview()`
- `chatWithAI(messages)`
- `saveQrDraft(payload)`
- `createQr(payload)`
- `updateQr(id, payload)`
- `archiveQr(id)`
- `restoreQr(id)`
- `getQrById(id)`
- `getQrAnalytics(id, params)`
- `createApiKey(payload)`
- `listApiKeys()`
- `revokeApiKey(id)`

建议草稿结构（关键字段）：

```ts
type RuleMode = "none" | "language" | "region" | "device" | "param" | "ab";
type TargetType = "link" | "whatsapp" | "vcard" | "pdf" | "file" | "deep_link";

type TargetContent = {
  type: TargetType;
  sourceUrl: string;
  delivery?: "redirect" | "preview" | "download";
};

type Draft = {
  name?: string;
  targetType: TargetType; // 当前 V1 UI 先固定为 "link"，但模型需保留扩展位
  defaultUrl: string; // 兼容当前实现
  defaultTarget?: TargetContent; // 推荐的稳定抽象结构
  ruleMode: RuleMode;
  languageRules?: Array<{ language: string; url: string }>;
  regionRules?: Array<{ region: string; url: string }>;
  deviceRules?: Array<{ os: "ios" | "android" | "ipados" | "windows" | "macos" | "other"; url: string }>;
  paramRules?: Array<{ key: string; value: string; url: string }>;
  abRules?: Array<{ variant: "A" | "B"; weight: number; url: string }>;
};
```

建议 API Key 结构：

```ts
type ApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: string;
  createdAt: string;
  revokedAt?: string;
  scopes: Array<"entries:read" | "entries:write" | "analytics:read">;
};
```

## 6. 埋点（前端预留）

V1 可先用 `console` 或 mock tracker 占位，事件名先固定：

- `auth_login_submit`
- `auth_register_submit`
- `dashboard_click_create_qr`
- `qr_create_ai_send`
- `qr_create_enter_review`
- `qr_create_review_continue`
- `qr_create_generate_submit`
- `qr_create_rule_mode_change`
- `qr_create_device_rule_conflict`
- `qr_create_param_rule_invalid`
- `qr_create_ab_rule_invalid`
- `qr_list_search`
- `qr_list_archive`
- `qr_list_restore`
- `analytics_view_loaded`

## 7. UI 风格参考（落地规范）

## 7.1 视觉方向关键词

- Light SaaS
- Blue + Teal 主色，少量 Violet 点缀
- 玻璃感卡片（glass/surface）
- 圆角偏大、层级清晰、信息密度中高
- 不使用暗黑 Web3、不过度霓虹

## 7.2 设计 Token（与当前实现对齐）

```css
--background: #f6f9fe;
--background-soft: #edf5ff;
--surface: rgba(255, 255, 255, 0.86);
--foreground: #152238;
--muted: #6b7b90;
--border: rgba(190, 206, 226, 0.4);
--primary: #14aaf5;
--primary-strong: #3777ff;
--accent: #8a7cff;
--success: #0f9f6e;
--warning: #d29a18;
--danger: #dc4c52;
```

```css
--radius-xl: 28px;
--radius-lg: 22px;
--radius-md: 16px;
--shadow-card: 0 24px 60px rgba(31, 55, 92, 0.08);
--shadow-soft: 0 12px 30px rgba(31, 55, 92, 0.05);
```

字体建议：`Plus Jakarta Sans` + `Noto Sans TC`。

## 7.3 布局规范

- Marketing 页面：顶部简洁导航 + Hero + 模块化内容区。
- App 页面：左侧导航 + 顶部条 + 内容容器。
- 内容最大宽度：`max-w-[1600px]`（App Shell）。
- 卡片优先使用圆角 + 浅边框 + 软阴影，避免硬边框和厚重阴影。

## 7.4 组件样式原则

- Button：主按钮使用蓝青渐变，次按钮使用白底描边。
- Input：默认浅边框，focus 态提升到 `sky` 色。
- Card：优先 `glass-panel` 或 `surface-panel`，保持白底可读性。
- Badge：用于状态和标签，不承载长文本。
- Table/List：行高舒展，操作按钮右侧对齐，hover 有轻背景变化。

## 7.5 动效规范

- 只保留必要动效：`fade-up` 进入、按钮 hover、卡片轻微过渡。
- 时长建议：`180ms ~ 320ms`。
- 避免大范围复杂动画，保证后台页稳定可读。

## 7.6 图表风格

- 趋势线使用主色蓝系，辅助线使用浅灰。
- Tooltip 与卡片风格一致（圆角 + 浅边框）。
- 不使用高饱和多色并列，Top 排行可用 1 主色 + 2 辅色。

## 7.7 响应式规则

- `>=1280px`：双栏完整布局（新建二维码页显示右侧辅助区）。
- `768px ~ 1279px`：部分区域单栏堆叠，保留关键信息顺序。
- `<768px`：表格可转卡片，CTA 固定在可见区域，输入区可完整操作。

## 8. 页面级补充验收（精简版）

- 首页：首屏 5 秒内可理解产品价值，CTA 清晰。
- 登录/注册：校验完整、错误提示明确、提交流程可感知 loading。
- 工作台：统计卡 + 最近入口 + 快捷入口完整可点。
- 创建智能入口：三步切换完整，状态不丢失，可触发生成动作。
- 路由规则：`language / region / device / param / ab` 五类都可创建并通过基础校验。
- 入口管理：搜索、归档、恢复、编辑入口可用，空态完整。
- 分析统计：默认展示全部入口最近 7 天数据，并支持切换到 `30/90/180/365` 天。
- 分析统计：仅筛选具体入口，地区、设备类型、设备系统、语言分布与排行可随筛选和时间范围同步变化。
- 单入口分析：趋势图、世界地图、地区/设备类型/设备系统/语言分布均可展示 mock 数据。
- 设置中心：邮箱修改弹窗、密码修改弹窗、当前计划、账单记录可完成 mock 闭环。
- 升级页：与 Pricing 页共享同一份价格与额度配置。
- 404 页面：需具备品牌一致的视觉设计和多语言文案能力。

## 9. 给 Codex 的执行约束（建议直接复用）

- 先页面骨架，再交互，再 mock 串联，再真实接口。
- 新增文案必须同步双语字典。
- 重复 UI 优先抽组件，不在页面内复制粘贴结构。
- 不引入 V1 范围外二维码类型和高级配置。
- 每完成一个阶段，必须可访问、可点击、可继续迭代。

## 10. Definition of Done（V1）

- 所有目标路由可访问。
- 登录态与路由守卫可运行。
- 创建智能入口三步流完整闭环（含 mock AI）。
- 管理页、统计页、单入口分析页可展示并操作 mock 数据。
- 设置页和升级页可访问，且与现有导航联通。
- 样式符合统一视觉规范，不出现明显风格漂移。

## 11. 多语言适配要求

- 所有用户可见页面、组件、按钮、表单、提示、错误信息等，均需支持多语言（zh-Hant、en）。
- 采用国际化字典管理文案，新增文案需同步双语字典。
- 路由结构采用 [locale] 目录，支持 /zh-Hant、/en 等路径自动切换。
- 404、设置、登录、注册等页面均需多语言适配。
- 允许用户在界面内切换语言，切换后页面内容即时更新。
- 新增页面或功能时，需同步补充多语言文案。
- 每个页面需提供对应语言的 `title` 与 `description` metadata，动态页面需支持根据入口名称生成标题。
