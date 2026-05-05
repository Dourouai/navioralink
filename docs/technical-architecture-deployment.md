# Naviora 技术架构与上线方案

## 1. 文档目的

这份文档用于明确 Naviora 第一阶段上线时的技术选型、域名拆分、环境规划、数据存储方式、支付接入方式，以及测试与发布流程。

目标是支持以下两类线上服务稳定运行：

- `naviora.link`
  官网、登录注册、工作台、价格页、设置页、分析页
- `go.naviora.link`
  统一公开访问域名，负责智能入口、公开内容展示与最终跳转

同时要求：

- 官网与后台后续可以持续更新
- 但主站更新不要影响公开访问层
- 主站更新不要影响访问记录与分析统计

---

## 2. 首发技术栈

### 2.1 核心组合

- `Vercel`
  部署 Next.js 应用与短链解析服务
- `Supabase`
  负责 Auth、Postgres、Row Level Security
- `腾讯云 COS`
  负责头像、公开名片图片、后续 PDF/文件等对象存储
- `Creem`
  负责订阅收款、结算、客户 Portal、Webhook 生命周期通知

### 2.2 补充基础设施

- `Brevo`
  用于验证码、密码重置、邮箱变更通知、账单邮件
- `Sentry`
  用于线上错误监控
- `Upstash Redis`（可选但推荐）
  用于短链命中缓存、限流、AI 对话额度控制

---

## 3. 域名与项目拆分

## 3.1 当前推荐拆分

当前阶段建议使用 `2 个 Vercel 项目`，但不是旧的 `app + go`，而是：

### 项目 A：`naviora-web`

承载以下域名：

- `naviora.link`
- `www.naviora.link`

职责：

- 官网与营销页面
- 登录注册
- Dashboard / Settings / Analytics / Pricing / Upgrade
- 文件与媒体库
- 支付回调 UI
- Creem webhook 处理入口
- 分析 UI、图表和访问明细展示

### 项目 B：`naviora-public`

承载以下域名：

- `go.naviora.link`

职责：

- 根据 slug 查找 entry
- 执行规则命中
- 记录访问日志
- 记录公开内容互动事件
- 重定向到最终目标
- 公开内容页
- 公开密码页
- preview 公开访问入口
- 后续邀请函、PDF、视频、profile、电子名片模板等内容载体

这个项目的定位不应只是“先把 page 和 go 放一起”，而应该明确成：

- `public` 是 Naviora 的长期公开访问层
- `go` 是入口分发层
- `content` 是内容承载层

也就是说，后续即使新增：

- 邀请函内容模式
- PDF 内容模式
- 视频内容模式
- Link in bio / profile 页面
- 电子名片多模板 / 多样式版本

这些能力也应优先继续沉淀在 `naviora-public`，而不是回到主站项目里。

### 3.1.1 数据统计职责边界

在 `web / public` 两项目结构下，数据统计不建议整体迁移到 `public`，而应明确分层：

- `naviora-public`
  - 负责公开访问与公开内容互动事件采集
  - 写入 `entry_visits` 等原始事件
  - 承接套餐访问限制和统计写链路
- `Supabase`
  - 负责原始明细、聚合表和统计函数
  - 作为统计真源与聚合中心
- `naviora-web`
  - 负责 Dashboard 分析页、图表、筛选、访问明细展示和导出能力

建议始终坚持：

- `public = collect`
- `database = aggregate`
- `web = render`

这样可以保证：

- 公开访问热路径保持轻量
- 分析页继续留在工作台体系内维护
- 后续如果访问量继续增长，也可以单独优化写入与聚合，而不必迁移整个分析模块

## 3.2 为什么现阶段推荐 `web / public`

当前阶段的核心诉求已经从“首发快”变成了“主站持续更新，但不要影响公开访问面”。因此：

- `page` 如果继续放在主站项目里，官网和后台每次发版都会把 `page` 一起带着发布
- `page` 和 `go` 都属于公开访问层，发布节奏、稳定性要求更接近
- 先把 `web` 和 `public` 分开，比立刻拆成 3 个项目更容易控制复杂度

结论：

- 当前阶段优先拆成 `web` 和 `public`
- 等流量和复杂度上来，再把 `page` 和 `go` 从 `public` 里继续拆开

补充判断：

- 如果未来 `page` 的内容模式越来越多，这不会削弱 `web / public` 两项目方案，反而更说明公开内容层应该从主站独立出来
- 也就是说，`page` 的扩展性是继续保留在 `public` 的理由，不是把它放回 `web` 的理由

## 3.3 为什么暂时不直接拆成 3 个项目

当前阶段不建议立即拆成 `web / page / go` 三个项目，原因是：

- `page` 与 `go` 仍有较多联动，例如 preview、密码访问、公开内容跳转
- 过早拆成 3 个项目，会增加部署、环境变量、联调和回滚复杂度
- 当前最需要先解决的是“主站更新不要影响公开面”，而不是把公开面内部立即细拆

---

## 4. 运行环境规划

## 4.1 最低配置

至少准备 `2 套环境`：

- `Preview`
- `Production`

## 4.2 更理想配置

建议按 `3 层` 使用：

- `Local`
- `Preview`
- `Production`

## 4.3 各环境职责

### Local

- 开发与本地调试
- 可连接本地 Supabase 或测试 Supabase
- 使用 Creem `test mode`

### Preview

- 每个分支自动生成预览部署
- 用于设计验收与联调
- 连接测试 Supabase
- 使用 Creem `test mode`

### Production

- 正式线上环境
- 连接正式 Supabase
- 使用 Creem `live mode`

---

## 5. Supabase 角色分工

## 5.1 Auth

用于：

- 邮箱登录
- Google 登录
- Session 管理
- 后续验证码流程

建议：

- Dashboard 与用户资料操作均使用 Supabase Auth 用户 ID 作为主关联键

## 5.2 Postgres

用于存储结构化数据：

- 用户资料
- 入口
- 路由规则
- 命中目标
- 访问日志
- 订阅状态
- vCard 内容数据
- 文件元数据

结论：

- `用户资料本体放 Postgres`
- `文件资产放 腾讯云 COS`

不要把用户资料整体存进对象存储。

## 5.3 腾讯云 COS

用于存储文件资产：

- 用户头像
- 名片页图片
- 品牌图片
- 后续 PDF 与下载文件

### 建议 Bucket

- `card-assets`
  名片头像、公开卡片素材
- `brand-assets`
  logo、品牌图片、营销素材
- `documents`
  后续 PDF、白皮书、下载文件

### 权限建议

COS Bucket 默认以 `private` 为主。

第一阶段建议：

- 上传资产默认 private
- 需要公开展示的图片，通过服务端生成 signed URL
- 后续再根据业务增加 public derivative 或缓存策略

这样更适合未来“图片权限控制”能力，不会因为首发方便而把所有文件永久公开。

## 5.4 Supabase Auth + Brevo SMTP

Supabase Auth 负责：

- 注册验证邮件
- 修改邮箱验证邮件
- 密码重置邮件

这类邮件建议统一通过 `Brevo SMTP` 发出，而不是继续使用 Supabase 默认测试发件配置。

推荐做法：

1. 在 Brevo 中验证 `naviora.link` 发件域名
2. 获取 SMTP Relay 凭证
3. 在 Supabase Dashboard 的 Auth SMTP 设置里填写：
   - host: `smtp-relay.brevo.com`
   - port: `587`
   - username / password: 使用 Brevo SMTP 凭证
4. 在 Supabase Auth Redirect URLs 中加入：
   - local
   - preview
   - production
   的 callback / verify / reset 地址

说明：

- 应用代码里的业务通知邮件，也统一走 Brevo API
- Supabase Auth 自带的验证类邮件，统一走 Brevo SMTP
- 这样用户看到的发件域名与业务通知会保持一致

## 5.5 Row Level Security

Supabase RLS 作为基础权限层，建议规则：

- 用户只能读取和修改自己的 `entries`
- 用户只能访问自己上传的 `assets`
- 用户只能查看自己的 `subscriptions` 与 `billing_events`
- 公开名片页与公开内容页，统一通过服务端查询或安全视图读取

---

## 6. 数据模型建议

## 6.1 用户与权限

- `users`
  由 Supabase Auth 管理
- `profiles`
  补充用户信息，例如姓名、公司、头像、默认语言、当前套餐

## 6.2 智能入口

- `entries`
  智能入口主表
- `entry_targets`
  目标载体表
- `entry_rules`
  路由规则表
- `entry_visits`
  访问明细日志
- `entry_analytics_daily`
  统计聚合表

### Entry 模型建议

一个 Entry 始终代表一个 Smart Entry，而不是 Web / WhatsApp / vCard 三种不同产品。

外层结构：

- `entry`
  - id
  - slug
  - status
  - target_type
  - default_target_id
  - rule_mode
  - user_id

目标内容：

- `entry_targets`
  - id
  - entry_id
  - kind: `web | whatsapp | vcard | pdf | file`
  - payload jsonb
  - display_name

规则：

- `entry_rules`
  - id
  - entry_id
  - mode
  - condition jsonb
  - target_id

## 6.3 vCard

建议单独保留：

- `vcard_profiles`
  - entry_id
  - full_name
  - phone
  - email
  - company
  - title
  - website
  - summary
  - avatar_asset_id

- `vcard_social_links`
  - vcard_profile_id
  - platform
  - url

## 6.4 文件与对象存储元数据

- `assets`
  - id
  - user_id
  - bucket
  - object_path
  - mime_type
  - size
  - visibility
  - created_at

---

## 7. 入口与内容 URL 规划

## 7.1 统一公开域名

公开访问统一建议使用：

- `https://go.naviora.link`

原因：

- 避免 `go` 与 `page` 跨域带来的 preview、密码访问、统计归因复杂度
- 让公开入口与公开内容都落在同一发布面
- 后续扩展 PDF、视频、电子名片、多模板时，不需要再维护双域名心智

## 7.2 路径前缀约定

当前官方公开链接与后续自定义域名链接，统一建议先使用：

- `https://go.naviora.link/l/{slug}`

说明：

- `l` 是当前唯一正式输出的公开路径前缀
- slug 建议继续使用 10 位随机字母数字
- 现有系统内部即便还保留其他兼容路径，也不应作为当前首发口径继续放大

后续如果 `l` 明确不够用，再单独评估新增前缀，例如：

- `p` = PDF
- `v` = invitation
- `b` = bio / profile
- `m` = media / video

在那之前，不建议提前开放更多公开路径前缀。

## 7.3 后期规划：支持 go 单域名自定义绑定

后期可为付费套餐提供“公开域名自定义绑定”能力，例如：

- `go.brand.com` 作为统一公开访问域名

建议规划如下：

- 用户在设置页填写希望绑定的公开子域名
- 系统生成 DNS 配置指引，要求用户完成 `CNAME` 或平台指定记录
- 服务端完成域名归属校验、证书签发与路由绑定
- 绑定成功后，正式公开链接统一走：
  - `/l/*`

首发口径建议明确为：

- 只支持 `go` 自定义域名
- 不做 `page` 自定义域名
- 不提前开放 `/s/*`、`/c/*` 作为自定义域名路径
- 等 `/l/*` 明确不够用时，再单独评估新增其他前缀

这项能力建议作为 `Plus` 及更高阶套餐的后期扩展项，以增强品牌一致性与企业化交付能力。

---

## 8. go.naviora.link 解析流程

## 8.1 命中流程

1. 用户访问 `go.naviora.link/{prefix}/{slug}`
2. 查询 `entries`
3. 检查状态
   - `draft`
   - `active`
   - `paused`
   - `expired`
   - `archived`
4. 读取默认 target 与规则
5. 根据条件命中：
   - language
   - region
   - device
   - param
   - ab
6. 如果目标类型是内容承载型（例如电子名片），直接渲染公开内容
7. 如果目标类型是跳转型，写入访问日志并跳转到最终目标

## 8.1.1 分析链路建议

统一公开域名后，推荐的统计链路如下：

1. 访问者命中 `go.naviora.link/{prefix}/{slug}`
2. `naviora-public` 负责采集并写入原始事件
3. 数据库同步或异步维护聚合表
4. `naviora-web` 的分析页读取聚合结果并展示

这意味着：

- 统计展示仍然属于 `web`
- 统计采集属于 `public`
- 真正需要优先优化的是数据库写入与聚合，而不是把分析 UI 挪到公开层

## 8.2 建议缓存

首发建议：

- slug 命中结果可缓存到 Redis
- 高读低写场景下，缓存 30-120 秒即可
- 更新 entry 时主动失效对应 key

---

## 9. 支付与订阅方案

## 9.1 角色

Creem 负责：

- Checkout
- Subscription 生命周期
- Customer portal
- 支付结果通知

Supabase 负责：

- 内部用户订阅状态
- 套餐权限
- 账单事件存档

## 9.2 推荐表

- `plans`
- `subscriptions`
- `billing_events`

### subscriptions 建议字段

- id
- user_id
- provider
- provider_customer_id
- provider_subscription_id
- plan_code
- status
- current_period_start
- current_period_end
- cancel_at_period_end
- created_at
- updated_at

### billing_events 建议字段

- id
- provider
- event_type
- provider_event_id
- user_id
- payload
- processed_at

## 9.3 付款逻辑

1. 用户点击升级
2. `naviora-app` 服务端创建 Creem checkout
3. metadata 中写入：
   - user_id
   - plan_code
4. 用户完成支付
5. Creem webhook 推送订阅事件
6. 服务端校验签名并更新 `subscriptions`
7. 系统依据 `subscriptions` 打开功能权限

## 9.4 关键原则

不要以“支付成功回跳页”作为最终订阅真相。

正式环境中，必须以 `Creem webhook` 为准更新订阅状态。

---

## 10. 图片、头像与用户资料存储策略

## 10.1 用户资料

以下资料建议存数据库：

- 姓名
- 公司
- 电话
- Email
- 网站
- vCard 文本内容
- 社交媒体链接
- 默认语言
- 当前套餐

## 10.2 图片资产

以下内容建议存对象存储：

- 头像
- 名片图片
- 后续 PDF 文件
- 公共封面图

## 10.3 首发建议

为了后续好扩展，当前就按以下策略实现：

- 数据库存“资产元数据”
- 腾讯云 COS 存“实际文件”
- 页面通过服务端拿文件 URL
- 所有用户上传图片默认视为可控资源，不直接裸公开

---

## 11. 环境变量建议

## 11.1 naviora-web

### Preview / Production 均需要

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_REPLY_TO_EMAIL`
- `BREVO_REPLY_TO_NAME`
- `BREVO_SANDBOX`
- `SENTRY_DSN`

## 11.2 naviora-public

- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TENCENT_COS_PUBLIC_BASE_URL`（如公开页需要）
- `UPSTASH_REDIS_REST_URL`（可选）
- `UPSTASH_REDIS_REST_TOKEN`（可选）
- `SENTRY_DSN`

## 11.3 环境分离要求

Preview 与 Production 必须使用不同值：

- Supabase project
- Creem key
- webhook secret
- base URL
- COS bucket 内容

---

## 12. 上线前测试方案

## 12.1 本地测试

本地先验证：

- 登录 / 注册
- 创建 Link / WhatsApp / vCard
- vCard 图片上传
- `page` 名片页展示
- `go` 入口跳转逻辑
- 状态控制
  - active
  - draft
  - paused
  - expired

## 12.2 Preview 联调

在 Vercel Preview 验证完整链路：

- 官网入口
- 创建智能入口
- 生成 slug
- `go.naviora.link` 命中跳转
- `go.naviora.link/l/*` 展示公开访问结果
- COS 图片访问
- 支付测试
- webhook 是否正确更新订阅

## 12.3 支付测试

Creem 在首发前应完整跑通：

- test mode checkout
- webhook signature 验证
- 支付成功
- 支付失败
- 取消订阅
- 恢复订阅
- webhook 重试幂等

---

## 13. 首发建议范围

## 13.1 建议首发上线

- 官网
- 登录注册
- Dashboard
- Smart Entry 创建
- Web / WhatsApp / vCard
- go 路由
- 公开内容页（vCard / 后续 PDF / 视频 / profile）
- 基础 analytics
- Creem 订阅

## 13.2 建议延后

- PDF 内容载体
- 高级对象权限控制 UI
- 多目标内容类型混合编辑器
- 更复杂的计费策略
- 大规模统计报表系统

---

## 14. 最终建议

第一阶段最合适的落地方案：

- `Vercel`
  - `naviora-web`
  - `naviora-public`
- `Supabase`
  - Auth
  - Postgres
- `腾讯云 COS`
  - Object Storage
- `Brevo`
  - Transactional Email
- `Creem`
  - Checkout
  - Subscription
  - Webhook

并且坚持这几个原则：

- `naviora.link` 与工作台保持在 `web`
- `go.naviora.link` 当前正式公开链接统一承载 `/l/*`
- 不保留旧双域名结构
- 等公开访问层稳定并过了初期，再按流量决定是否继续细拆
- 上线切换时允许直接重刷线上统计数据
- 用户资料进数据库，文件进对象存储
- 上传文件默认 private
- Supabase Auth 邮件统一走 Brevo SMTP
- 业务通知邮件统一走 Brevo API
- 订阅状态以 webhook 为准
- Preview 与 Production 严格隔离

这套方案足够支持当前产品上线，也为后续扩展 PDF、更多内容载体、权限控制与订阅体系预留了空间。
