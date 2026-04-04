# Naviora 技术架构与上线方案

## 1. 文档目的

这份文档用于明确 Naviora 第一阶段上线时的技术选型、域名拆分、环境规划、数据存储方式、支付接入方式，以及测试与发布流程。

目标是支持以下三类线上服务同时上线：

- `naviora.link`
  官网、登录注册、工作台、价格页、设置页、分析页
- `page.naviora.link`
  公开内容页，例如名片页、后续 PDF 页面、公开 profile 页面
- `go.naviora.link`
  智能入口与短链解析服务，负责规则命中与最终跳转

---

## 2. 首发技术栈

### 2.1 核心组合

- `Vercel`
  部署 Next.js 应用与短链解析服务
- `Supabase`
  负责 Auth、Postgres、Storage、Row Level Security
- `Creem`
  负责订阅收款、结算、客户 Portal、Webhook 生命周期通知

### 2.2 补充基础设施

- `Resend` 或 `Postmark`
  用于验证码、密码重置、邮箱变更通知、账单邮件
- `Sentry`
  用于线上错误监控
- `Upstash Redis`（可选但推荐）
  用于短链命中缓存、限流、AI 对话额度控制

---

## 3. 域名与项目拆分

## 3.1 推荐拆分

建议首发使用 `2 个 Vercel 项目`：

### 项目 A：`naviora-app`

承载以下域名：

- `naviora.link`
- `www.naviora.link`
- `page.naviora.link`

职责：

- 官网与营销页面
- 登录注册
- Dashboard / Settings / Analytics / Pricing / Upgrade
- 公开内容页
  - `/c/[id]` 名片页
  - 后续 `/c/[id]` 对应 PDF、profile、其他内容载体
- 支付回调 UI
- Creem webhook 处理入口

### 项目 B：`naviora-go`

承载以下域名：

- `go.naviora.link`

职责：

- 根据 slug 查找 entry
- 执行规则命中
- 记录访问日志
- 重定向到最终目标

## 3.2 为什么不拆成 3 个项目

当前阶段不建议把 `page.naviora.link` 再单拆一个项目，原因是：

- `page` 内容页与主应用共用用户、内容、模板、权限和后台编辑逻辑
- 过早拆成 3 个项目，会增加部署、环境变量与联调复杂度
- `go` 服务与主应用隔离即可满足大部分首发稳定性需求

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
- `文件资产放 Storage`

不要把用户资料整体存进对象存储。

## 5.3 Storage

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

Bucket 默认以 `private` 为主。

第一阶段建议：

- 上传资产默认 private
- 需要公开展示的图片，通过服务端生成 signed URL
- 后续再根据业务增加 public derivative 或缓存策略

这样更适合未来“图片权限控制”能力，不会因为首发方便而把所有文件永久公开。

## 5.4 Row Level Security

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

## 7.1 智能入口

公开入口建议保持：

- `https://go.naviora.link/l/{slug}`

说明：

- `l` 表示 smart link 入口
- slug 建议使用 10 位随机字母数字

## 7.2 内容页

公开内容页建议保持：

- `https://page.naviora.link/c/{id}`

说明：

- `c` 表示 content
- 当前 vCard 已采用该结构
- 未来 PDF、public profile 也建议统一挂到 `c` 空间

---

## 8. go.naviora.link 解析流程

## 8.1 命中流程

1. 用户访问 `go.naviora.link/l/{slug}`
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
6. 写入访问日志
7. 跳转到最终目标

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
- Storage 存“实际文件”
- 页面通过服务端拿文件 URL
- 所有用户上传图片默认视为可控资源，不直接裸公开

---

## 11. 环境变量建议

## 11.1 naviora-app

### Preview / Production 均需要

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PAGE_URL`
- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `RESEND_API_KEY` 或 `POSTMARK_SERVER_TOKEN`
- `SENTRY_DSN`

## 11.2 naviora-go

- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PAGE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`（可选）
- `UPSTASH_REDIS_REST_TOKEN`（可选）
- `SENTRY_DSN`

## 11.3 环境分离要求

Preview 与 Production 必须使用不同值：

- Supabase project
- Creem key
- webhook secret
- base URL
- Storage bucket 内容

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
- `page.naviora.link` 展示公开内容
- Storage 图片访问
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
- page 公开名片页
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
  - `naviora-app`
  - `naviora-go`
- `Supabase`
  - Auth
  - Postgres
  - Storage
- `Creem`
  - Checkout
  - Subscription
  - Webhook

并且坚持这几个原则：

- `naviora.link` 与 `page.naviora.link` 保持同一主应用
- `go.naviora.link` 独立成单独项目
- 用户资料进数据库，文件进对象存储
- 上传文件默认 private
- 订阅状态以 webhook 为准
- Preview 与 Production 严格隔离

这套方案足够支持当前产品上线，也为后续扩展 PDF、更多内容载体、权限控制与订阅体系预留了空间。
