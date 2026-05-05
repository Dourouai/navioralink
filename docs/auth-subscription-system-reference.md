# Naviora 用户认证与订阅系统复用文档

本文档用于整理 `Naviora` 当前代码中已经落地的两大系统：

- 用户注册 / 登录 / 账号安全
- 订阅 / 套餐 / 激活码 / 升降级

文档目标不是写理想方案，而是记录“当前系统真实实现”，方便后续复用、拆分新项目、补 PRD、做测试用例或交接。

---

## 1. 文档范围

当前文档覆盖以下能力：

- 邮箱登录
- Google 登录
- 邮箱验证码注册
- 登录前验证码风控需求
- 注册发码前验证码风控需求
- 忘记密码 / 重置密码
- 邮箱验证回调
- Supabase Auth 多语言邮件模板
- 登录方式绑定与解绑
- 修改邮箱 / 修改密码 / 时区
- Free / Starter / Plus 套餐体系
- Creem 在线订阅
- 激活码订阅
- 内部降级逻辑
- 会员状态变更记录
- 配额与限制拦截

不在本文重点范围内的内容：

- AI 建码本身的提示词设计
- 公开入口路由细节
- 资产管理的全部实现
- URL 冻结规则的完整业务文档

---

## 2. 当前系统总览

### 2.1 认证基础设施

当前认证依赖：

- `Supabase Auth`
- `Next.js App Router`
- `Supabase profiles`
- locale-aware 的 `/auth/callback` 与 `/auth/confirm`
- Supabase Auth 邮件模板
- 预留接入的 `Tencent Cloud CAPTCHA`

认证成功后的统一收口规则：

- 补建或更新 `profiles`
- 自动确保存在一条默认 `free` 订阅
- 将用户并入前端 `auth-store`
- 跳转到对应语言的工作台

### 2.2 订阅基础设施

当前订阅依赖：

- `subscriptions` 作为统一会员时效真源
- `billing_events` 作为账单事件真源
- `membership_change_logs` 作为会员状态变更审计表
- `Creem` 负责在线支付、升级补差价、客户 Portal、Webhook
- `activation_codes` / `activation_code_redemptions` 负责激活码体系
- `internal_adjustment` 负责内部重算型时效调整，例如降级后重算时长

---

## 3. 用户注册登录与账号安全

### 3.1 已实现能力

当前已实现的认证与账号安全能力包括：

- 邮箱 + 密码登录
- Google OAuth 登录
- 注册页直接使用 Google 登录
- 邮箱验证码三步注册
- 忘记密码
- 邮件链接重置密码
- 邮箱验证回调
- 登录后自动补建资料
- 设置页修改邮箱
- 设置页修改密码
- 设置页绑定 Google
- 设置页解绑 Google
- 设置页更新时区

### 3.2 路由入口

主要页面：

- `/[locale]/login`
- `/[locale]/register`
- `/[locale]/forgot-password`
- `/[locale]/reset-password`
- `/[locale]/verify-email`
- `/[locale]/settings`

主要认证路由：

- `/auth/callback`
- `/auth/confirm`
- `/[locale]/auth/callback`
- `/[locale]/auth/confirm`

说明：

- 带 locale 的 `/[locale]/auth/*` 路由只是桥接入口。
- 它们会把 query 原样透传到无 locale 的 `/auth/*`，再补上 `locale` 参数，返回 `307` 跳转。
- 登录页、注册页、Google 登录回调、激活码继续兑换流程都支持 `next` 回跳参数，并且只接受站内相对路径。

### 3.3 登录流程

### 3.3.1 邮箱密码登录

当前主流程：

1. 用户进入登录页。
2. 可直接使用 Google，或输入邮箱密码。
3. 前端调用 `supabase.auth.signInWithPassword()`。
4. 登录成功后执行 `ensureProfileForCurrentUserBrowser()`。
5. `profiles` 自动 upsert。
6. 同时执行 `ensure_default_free_subscription()`，确保用户至少有一条默认 `free` 订阅。
7. 登录态写入前端 `auth-store`。
8. 跳转到 `next` 或默认 `/[locale]/dashboard`。

当前前端校验：

- 邮箱格式必须合法
- 登录表单密码最小长度为 `6`

### 3.3.2 Google 登录

当前主流程：

1. 登录页和注册页都提供 `Continue with Google`。
2. 前端调用 `supabase.auth.signInWithOAuth({ provider: "google" })`。
3. OAuth 回到 `/auth/callback`。
4. `/auth/callback` 调用 `exchangeCodeForSession(code)`。
5. 拉取当前用户，要求必须有可用邮箱。
6. 服务端补建 `profiles`。
7. 跳回 `next` 或默认 Dashboard。

当前边界：

- 如果 Google 没有返回邮箱，会直接回登录页并提示改用邮箱登录。
- 如果是设置页里的“绑定 Google”，回调失败会回到设置页，而不是登录页。

### 3.3.3 登录前验证码风控

这部分需求已经确认，当前目标是：

1. 用户在登录页输入邮箱和密码。
2. 提交前先完成腾讯云验证码挑战。
3. 前端拿到 `ticket` 与 `randstr`。
4. 服务端调用 `DescribeCaptchaResult` 验证。
5. 只有验证码通过后，才继续登录。

当前接入约束：

- 建议前端使用腾讯云 `TJCaptcha.js`
- 建议服务端使用签名请求调用 `captcha.intl.tencentcloudapi.com`
- 当前服务端校验以 `CaptchaType = 9` 为准
- 返回值以 `CaptchaCode === 1` 作为通过标准

当前仓库状态：

- 已预留 `apps/naviora-app/src/lib/tencent-captcha.ts`
- 已整理环境变量约定：
  - `NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID`
  - `TENCENT_CAPTCHA_SECRET_ID`
  - `TENCENT_CAPTCHA_SECRET_KEY`
  - `TENCENT_CAPTCHA_APP_SECRET_KEY`
  - `TENCENT_CAPTCHA_ENDPOINT`
  - `TENCENT_CAPTCHA_REGION`
- 但登录页目前线上主链路仍然是前端直接调用 `supabase.auth.signInWithPassword()`
- 也就是说，这个风控需求已经进入代码准备阶段，但还不应在复用文档里误记为“已完整上线”

### 3.4 注册流程

### 3.4.1 当前标准注册是“三步验证码注册”

当前不是“邮箱 + 密码直接注册再收确认邮件”的老式流程，而是：

1. 输入邮箱
2. 输入邮箱验证码
3. 设置密码并同意条款

### 3.4.2 详细流程

#### 第一步：输入邮箱并发送验证码

前端流程：

1. 用户输入邮箱。
2. 前端先调 `/api/auth/email-exists`。
3. 之后调用 `supabase.auth.signInWithOtp({ shouldCreateUser: true })` 发送验证码。
4. 进入验证码阶段。

重要现状说明：

- `/api/auth/email-exists` 当前真实实现主要是“格式校验 + 简单限流 + 抗枚举占位”。
- 这个接口当前不会明确返回“邮箱是否已存在”。
- 前端保留了 `exists` 分支，但当前后端并不暴露该信息。
- 如果后续复用这套系统，建议明确保留“抗邮箱枚举”策略，不要轻易把邮箱存在性直接暴露给前端。

#### 第一步补充：注册发码前验证码风控

这部分需求也已经确认，目标是：

1. 用户输入邮箱后，不直接发送注册验证码。
2. 先完成一次腾讯云验证码挑战。
3. 服务端验证 `ticket + randstr`。
4. 只有通过后，才允许调用 `signInWithOtp({ shouldCreateUser: true })`。

当前建议接法：

- 发码动作不要只放在浏览器里做前置判断
- 应改成浏览器拿验证码结果，再请求我们自己的 `/api/auth/register/send-otp`
- 服务端完成验证码校验后，再代用户调用 Supabase Auth

当前仓库状态：

- 需求与接入方式已经明确
- 现在线上注册发码主链路仍然是前端直接调用 `supabase.auth.signInWithOtp()`
- 所以如果后续复用，必须把“前端挑战 + 服务端校验 + 再发码”一起搬走，不能只复用表单 UI

#### 第二步：验证验证码

当前流程：

1. 用户输入 8 位数字验证码。
2. 前端调用 `supabase.auth.verifyOtp({ type: "email" })`。
3. 验证成功后补建 `profiles`。
4. 进入设置密码阶段。

#### 第三步：设置密码完成注册

当前流程：

1. 用户输入密码与确认密码。
2. 用户必须勾选 `Terms` 与 `Privacy`。
3. 前端调用 `supabase.auth.updateUser({ password, data: { locale } })`。
4. 更新 `profile.default_locale`。
5. 将 session 写入前端状态。
6. 跳转到 Dashboard。

当前边界：

- 注册流程前端会校验两次密码一致。
- 注册流程要求勾选条款。
- 当前注册阶段没有单独的本地“8 位以上”密码校验，更多依赖 Supabase 返回结果。
- 如果 Supabase 返回“新密码不能与旧密码相同”，前端会映射成友好提示。

### 3.5 邮箱验证与认证回调

### 3.5.1 `/auth/callback`

适用场景：

- Google 登录
- Google 绑定

当前行为：

- 读取 `locale`、`next`、`authMode`
- `exchangeCodeForSession`
- 验证 user 是否存在、是否带 email
- 自动确保 `profiles` 存在
- 成功跳到 `next`
- 失败带 `authError` 返回登录页或设置页

### 3.5.2 `/auth/confirm`

适用场景：

- `signup`
- `email`
- `recovery`
- `email_change`
- 其他 Supabase OTP link 类型

当前行为：

- 读取 `token_hash` 与 `type`
- 调用 `supabase.auth.verifyOtp`
- 如果用户存在则补建 `profiles`
- `recovery` 默认跳到 `/reset-password`
- `email` / `signup` 成功后通常跳登录页并带成功提示

### 3.6 忘记密码与重置密码

### 3.6.1 忘记密码

当前流程：

1. 用户在 `/forgot-password` 输入邮箱。
2. 前端调用 `supabase.auth.resetPasswordForEmail()`。
3. 邮件中的链接回到 `/auth/confirm?type=recovery`。
4. 成功后进入 `/reset-password`。

### 3.6.2 重置密码

当前流程：

1. 用户在 `/reset-password` 输入两次新密码。
2. 前端调用 `supabase.auth.updateUser({ password })`。
3. 成功后主动登出。
4. 跳回登录页并带成功提示。

当前规则：

- 重置密码要求至少 `8` 位
- 两次密码必须一致

### 3.7 设置页里的账号安全能力

### 3.7.1 修改邮箱

当前流程分 3 步：

1. 先校验当前密码
2. 再向新邮箱发送变更验证码
3. 用验证码完成 `email_change`

具体实现：

1. 调用 `verifyCurrentPasswordForEmailChange()`，本质是再次 `signInWithPassword`
2. 调用 `requestEmailChangeCode()`，本质是 `supabase.auth.updateUser({ email })`
3. Supabase 向新邮箱发验证码
4. 调用 `updateAccountEmail()`，本质是 `verifyOtp({ type: "email_change" })`
5. 成功后刷新本地用户态

### 3.7.2 修改密码

当前流程：

1. 调用 `supabase.auth.reauthenticate()` 请求验证码
2. 用户输入验证码与新密码
3. 调用 `supabase.auth.updateUser({ password, nonce })`

当前规则：

- 新密码最少 `8` 位
- 必须输入验证码
- 两次密码必须一致

### 3.7.3 时区设置

当前设置页支持更新：

- `profiles.timezone`

当前用途：

- 影响工作台和账单信息中的时间展示基线

### 3.8 登录方式管理

### 3.8.1 已支持的登录方式

当前系统支持：

- `email`
- `google`

### 3.8.2 绑定 Google

当前流程：

1. 设置页点击绑定 Google
2. 调用 `supabase.auth.linkIdentity({ provider: "google" })`
3. OAuth 回到 `/auth/callback?authMode=link-google`
4. 成功后回设置页，显示绑定成功提示

### 3.8.3 解绑 Google

当前规则：

- 只有当账号还保留另一种登录方式时才允许解绑
- 当前实现判断条件是 `identities.length >= 2`

也就是说：

- 如果账号只有 Google 一种身份，不能解绑
- 如果账号同时有邮箱身份和 Google 身份，可以解绑 Google

### 3.9 受保护页面

`/[locale]/(dashboard)/layout.tsx` 当前负责工作台鉴权。

规则：

- 如果 Supabase 环境开启，且用户未登录，则重定向到 `/[locale]/login`
- 登录后才允许进入 Dashboard / Settings / Upgrade 等页面

### 3.10 Auth 邮件模板与多语言

### 3.10.1 当前已覆盖的邮件类型

当前 Supabase Auth 模板已覆盖：

- `confirmation`
  邮箱确认 / signup confirmation
- `magic_link`
  当前主要承接注册验证码邮件
- `recovery`
  忘记密码 / 重置密码
- `email_change`
  修改邮箱验证码
- `reauthentication`
  修改密码前的二次验证码

### 3.10.2 当前多语言策略

当前模板根据 Supabase 模板变量 `.Data.locale` 分支：

- `zh-Hans`
- `zh-Hant`
- 其他默认回退 `en`

当前设计目标：

- 邮件视觉比 Supabase 默认模板更品牌化
- 验证码邮件优先突出 `{{ .Token }}`
- 链接类邮件优先突出主按钮和 fallback link
- 所有模板保持中英文一致的产品口径

### 3.10.3 当前 locale 传递策略

当前代码里，以下流程会显式写入或同步 locale：

- 注册发送验证码时附带 `locale`
- 完成注册时写入 `user_metadata.locale`
- 登录成功后最佳努力同步 `user_metadata.locale`
- 修改邮箱前发送验证码时附带 `locale`
- 修改密码前发送 reauthentication 验证码时附带 `locale`

此外：

- 忘记密码
- resend signup confirmation

这两类流程主要依赖 `redirectTo` 回跳地址本身带 `locale`。

### 3.10.4 当前维护方式

模板文件位置：

- `supabase/email-templates/confirmation.html`
- `supabase/email-templates/magic-link.html`
- `supabase/email-templates/recovery.html`
- `supabase/email-templates/email-change.html`
- `supabase/email-templates/reauthentication.html`

模板应用脚本：

- `scripts/configure-supabase-auth-email-templates.mjs`

补充说明文档：

- `docs/supabase-auth-email-templates.md`

### 3.10.5 当前状态说明

- Supabase 侧的邮件模板内容已经完成品牌化和多语言改造
- 如果后续复用整套认证系统，除了搬模板文件，也要保留前端 / 服务端对 locale 的传递逻辑
- 如果只迁模板、不迁 locale 透传逻辑，用户仍可能在部分场景回退到英文邮件

---

## 4. 订阅与套餐系统

### 4.1 当前套餐模型

当前系统统一使用三个套餐编码：

- `free`
- `starter`
- `premium`

展示名称为：

- `Free`
- `Starter`
- `Plus`

说明：

- 数据层仍使用 `premium`
- UI 层统一显示为 `Plus`

### 4.2 当前价格体系

当前价格定义：

| 套餐 | 月付 | 年付 |
| --- | ---: | ---: |
| Free | $0 | $0 |
| Starter | $6 | $59 |
| Plus | $16 | $159 |

当前实现位置：

- `apps/naviora-app/src/lib/pricing.ts`

### 4.3 当前配额体系

### 4.3.1 Free

- Entries: `10`
- AI conversations / month: `20`
- Monthly visits: `500`
- Storage: `10 MB`

### 4.3.2 Starter

- Entries: `100`
- AI conversations / month: `300`
- Monthly visits: `100000`
- Storage: `1024 MB`

### 4.3.3 Plus

- Entries: `1000`
- AI conversations / month: `2000`
- Monthly visits: `300000`
- Storage: `5120 MB`

说明：

- `free` 的 entry limit 已经更新到 `10`
- 这个值在前端与数据库函数中都应保持一致

### 4.4 当前订阅来源

当前 `subscriptions.provider` 有以下几类来源：

- `system`
  默认 Free 订阅
- `creem`
  在线付费订阅
- `activation_code`
  激活码生成的订阅
- `internal_adjustment`
  系统内部重算时效时生成的订阅，例如降级、顺延

### 4.5 默认 Free 订阅

当前规则：

- 任何用户在成功认证并补建 profile 后，都会调用 `ensure_default_free_subscription()`
- 如果用户没有任何订阅记录，就补一条 `provider = system`、`plan_code = free` 的有效订阅

这意味着：

- 当前系统把“Free”也当作正式订阅记录管理
- 后续统计、权限和 UI 不需要单独判断“完全无订阅用户”

### 4.6 有效套餐判定

当前系统不是简单取“最后一条订阅”，而是优先取“当前时刻仍有效的订阅窗口”。

有效订阅判断条件：

- `status` 属于 `active / trialing / past_due`
- `current_period_start <= now`
- `current_period_end >= now`，或结束时间为空

当前有效套餐来源：

- 数据库函数 `get_effective_plan_code`
- 服务端 `pickCurrentSubscription()`

这套规则对以下场景都成立：

- Creem 在线订阅
- 激活码立即生效
- 激活码顺延排队
- Plus 降 Starter 后的新有效期

---

## 5. 在线订阅：Creem

### 5.1 当前能力

当前 Creem 负责：

- Starter / Plus 在线购买
- 当前周期内升级补差价
- 客户 Portal
- Webhook 生命周期同步
- 账单事件落库

### 5.2 Checkout 行为

入口：

- `/api/billing/checkout`

当前支持：

- 未登录时先跳登录
- `plan=starter|premium`
- `billing=monthly|yearly`

当前行为分支：

### 5.2.1 Free -> 付费

- 创建 Creem checkout
- 支付成功后回 `/settings?billingNotice=checkout-complete`

### 5.2.2 当前已是付费用户，再升级

当前代码会直接调用：

- `creem.subscriptions.upgrade({ updateBehavior: "proration-charge" })`

这表示：

- 升级按当前周期做补差价
- 不会额外新建一条外部 checkout
- 升级完成后会写会员变更日志

### 5.2.3 当前就是同套餐同周期

- 不发起支付
- 直接回设置页提示当前已在该方案

### 5.3 Billing Portal

入口：

- `/api/billing/portal`

当前逻辑：

- 仅当用户存在 `provider = creem` 且有 `provider_customer_id` 时可用
- 设置页按钮 `Manage billing` 只有在 `billingPortalAvailable = true` 时显示

### 5.4 Webhook

入口：

- `/api/creem/webhook`

当前已处理：

- checkout completed
- subscription active / trialing / canceled / paid / expired / unpaid / past_due / paused / updated / scheduled_cancel
- refund created
- dispute created

当前写入动作：

- 更新或新增 `subscriptions`
- 写入 `billing_events`

---

## 6. 套餐升降级规则

### 6.1 当前 UI 入口

### 设置页

当前设置页 `Current plan` 卡片中已支持：

- `Free` 显示 `Upgrade now`
- `Starter` 显示 `Upgrade to Plus`
- `Plus` 显示 `Downgrade to Starter`
- 如有 Creem 客户记录，同时显示 `Manage billing`

### 升级页

升级页支持：

- 月付 / 年付切换
- 查看当前套餐
- 选择目标套餐
- 激活码兑换

### 6.2 当前支持的升降级

### 已支持

- `Free -> Starter`
- `Free -> Plus`
- `Starter -> Plus`
- `Plus -> Starter`

### 当前不支持

- 直接在设置页做 `Starter -> Free`
- 直接在设置页做 `Plus -> Free`

### 6.3 Starter 升级到 Plus

当前实现：

- 在线订阅场景走 Creem `proration-charge`
- 激活码场景支持“补差价升级”或“立即生效 Plus”

### 6.4 Plus 降级到 Starter

当前实现：

- 不走 Creem 降级逻辑
- 完全走我们自己的内部时效重算逻辑
- 不退款
- 立刻改成 Starter 权益
- 用当前剩余价值折算新的 Starter 有效期

具体逻辑：

1. 读取当前有效 Plus 订阅
2. 计算剩余价值 `remainingValue`
3. 按 Starter 月价折算 `durationMonths`
4. 向上取整
5. 把原 Plus 订阅标记为 `replaced`
6. 新插入一条 `provider = internal_adjustment` 的 Starter 订阅
7. 写 `billing_events`
8. 写 `membership_change_logs`

---

## 7. 激活码系统

### 7.1 当前能力

当前激活码系统已支持：

- Starter / Plus 激活码
- 月 / 季 / 年时长
- 先预览、再兑换
- Free 用户直接激活
- 未登录用户先输入激活码，登录或注册后自动回到原页继续兑换
- 已有会员继续叠加
- Starter 期间激活 Plus 时给出两种生效策略
- 激活码会员也能继续升降级

### 7.2 激活码格式

当前标准格式：

- `NAV-XXXX-XXXX-XXXX`

规则：

- `NAV` 为固定前缀
- 后面主体为 `12` 位字母数字
- 前端支持自动格式化
- 前端也允许输入无分隔符的主体，系统会自动补成标准格式
- 当前默认是一组码兑换一次，但数据结构支持通过 `max_redemptions` 配置多次兑换

当前实现细节：

- 规范化后内部比对使用 `normalizeActivationCode()`
- `code_prefix` 现在存完整可复制的可见码，而不是部分前缀

### 7.3 激活码表结构

核心表：

- `activation_codes`
- `activation_code_redemptions`

当前重要字段：

### activation_codes

- `code_hash`
- `code_prefix`
- `plan_code`
- `billing_cycle`
- `duration_months`
- `max_redemptions`
- `redeemed_count`
- `status`
- `expires_at`

### activation_code_redemptions

- `activation_code_id`
- `user_id`
- `subscription_id`
- `code_prefix`
- `plan_code`
- `billing_cycle`
- `duration_months`
- `redeemed_at`

### 7.4 时长表达规则

当前激活码时长依赖：

- `billing_cycle`
- `duration_months`

说明：

- 月卡通常是 `billing_cycle = monthly` + `duration_months = 1`
- 季卡通常是 `billing_cycle = monthly` + `duration_months = 3`
- 年卡通常是 `billing_cycle = yearly` 或 `duration_months = 12`

也就是说：

- “季度”不是单独的 billing cycle 类型
- 当前是用 `duration_months = 3` 来表达

### 7.5 兑换前校验

兑换前会校验：

- 是否登录
- 激活码是否为空
- hash 是否存在
- 当前用户是否已经兑换过这组码
- 是否过期
- 状态是否是 `active / issued`
- 是否超出最大兑换次数

### 7.6 当前激活码生效策略

当前系统支持 4 种策略：

- `activate_now`
- `queue_after_current`
- `upgrade_difference`
- `start_now`

### 7.6.1 activate_now

适用：

- 当前无付费订阅
- 或当前是 Free

效果：

- 立即生效激活码对应套餐

### 7.6.2 queue_after_current

适用：

- 当前已有同级或不需要立即覆盖的订阅

效果：

- 保留当前订阅不变
- 新激活码从当前结束时间后开始

### 7.6.3 upgrade_difference

适用：

- 当前是 Starter
- 激活的是 Plus 码

效果：

- 把当前剩余价值和新码价值一起折算成一段新的 Plus 有效期
- 当前实现会立刻替换当前订阅窗口

### 7.6.4 start_now

适用：

- 当前是 Starter
- 激活的是 Plus 码
- 用户希望新 Plus 立即生效

效果：

- Plus 先立即开始
- 剩余 Starter 时效会顺延到后面
- 顺延部分通过 `internal_adjustment` 订阅保存

### 7.7 激活码与会员记录

当前兑换完成后会同时做这些事：

1. 写一条或两条 `subscriptions`
2. 写 `activation_code_redemptions`
3. 更新 `activation_codes.redeemed_count`
4. 写 `billing_events`
5. 写 `membership_change_logs`

---

## 8. 会员状态变更记录

### 8.1 记录目标

当前已经落地会员状态变更记录，用于审计：

- 激活码生效
- 升级
- 降级

### 8.2 数据表

表名：

- `membership_change_logs`

当前核心字段：

- `user_id`
- `action`
- `source`
- `provider`
- `reference_id`
- `previous_plan_code`
- `previous_period_end`
- `current_plan_code`
- `current_period_end`
- `details`
- `created_at`

### 8.3 当前 action 类型

- `activation_code_redeemed`
- `upgrade`
- `downgrade`

### 8.4 当前展示位置

设置页已提供 `Membership changes / 会员状态变更` 区块，展示：

- 操作类型
- 上一个套餐和结束时间
- 当前套餐和结束时间
- 变更时间

---

## 9. 配额与限制的真实执行点

### 9.1 Entry 数量限制

当前为强约束。

执行位置：

- 数据库函数 `get_plan_entry_limit`
- 触发器 `enforce_entry_plan_limit`
- 保存入口接口的错误映射

规则：

- 只统计 `status <> archived` 的入口
- 超限直接抛 `PLAN_ENTRY_LIMIT_EXCEEDED`

补充行为：

- 当订阅变化后，`syncUserPlanConstraints()` 会把超限入口自动改成 `paused`

### 9.2 月访问量限制

当前为强约束。

执行位置：

- `entry-routing.ts`
- `assertMonthlyVisitAllowanceSnapshot()`

规则：

- 公开入口命中时检查当前月访问量
- 超限则阻止继续承接流量

### 9.3 AI 对话次数限制

当前为强约束。

执行位置：

- `src/pages/api/qwen.ts`
- `assertAiConversationAllowanceForUser()`

规则：

- 请求 AI 前先检查当月额度
- 超限时返回套餐限制提示，不继续调用模型

### 9.4 存储空间限制

当前为强约束。

执行位置：

- `/api/assets/upload-ticket`

规则：

- 上传前会统计当前已用大小
- `usedBytes + fileSize > storageLimit` 时直接拒绝

### 9.5 当前计划快照

设置页和升级页看到的当前套餐，统一来自：

- `getCurrentPlanSnapshotServer()`

这个快照包含：

- 当前有效套餐
- 价格
- 周期
- 到期时间
- 支付方式
- 是否可打开 Creem Portal
- entries / AI / visits / storage 的已用与限额

---

## 10. 关键数据表

认证与用户侧：

- `profiles`

订阅与账单侧：

- `subscriptions`
- `billing_events`
- `membership_change_logs`
- `activation_codes`
- `activation_code_redemptions`
- `user_monthly_usage`
- `ai_conversation_events`

和订阅限制联动的业务表：

- `entries`
- `assets`

---

## 11. 关键页面与接口清单

### 11.1 页面

- `apps/naviora-app/src/app/[locale]/(auth)/login/page.tsx`
- `apps/naviora-app/src/app/[locale]/(auth)/register/page.tsx`
- `apps/naviora-app/src/app/[locale]/(auth)/forgot-password/page.tsx`
- `apps/naviora-app/src/app/[locale]/(auth)/reset-password/page.tsx`
- `apps/naviora-app/src/app/[locale]/(auth)/verify-email/page.tsx`
- `apps/naviora-app/src/app/[locale]/(dashboard)/settings/page.tsx`
- `apps/naviora-app/src/app/[locale]/(dashboard)/upgrade/page.tsx`

### 11.2 认证接口与回调

- `apps/naviora-app/src/app/api/auth/email-exists/route.ts`
- `apps/naviora-app/src/app/auth/callback/route.ts`
- `apps/naviora-app/src/app/auth/confirm/route.ts`
- `apps/naviora-app/src/app/[locale]/auth/callback/route.ts`
- `apps/naviora-app/src/app/[locale]/auth/confirm/route.ts`

### 11.3 订阅接口

- `apps/naviora-app/src/app/api/billing/checkout/route.ts`
- `apps/naviora-app/src/app/api/billing/portal/route.ts`
- `apps/naviora-app/src/app/api/billing/redeem/route.ts`
- `apps/naviora-app/src/app/api/billing/downgrade/route.ts`
- `apps/naviora-app/src/app/api/creem/webhook/route.ts`

### 11.4 关键服务层

- `apps/naviora-app/src/lib/services.ts`
- `apps/naviora-app/src/lib/tencent-captcha.ts`
- `apps/naviora-app/src/lib/billing/creem.ts`
- `apps/naviora-app/src/lib/billing/membership.ts`
- `apps/naviora-app/src/lib/billing/membership-server.ts`
- `apps/naviora-app/src/lib/billing/activation-codes.ts`
- `apps/naviora-app/src/lib/billing/plan-entitlements.ts`
- `apps/naviora-app/src/lib/supabase/billing-server.ts`
- `apps/naviora-app/src/lib/supabase/billing-shared.ts`
- `apps/naviora-app/src/lib/supabase/subscription-controls.ts`
- `apps/naviora-app/src/lib/supabase/profiles-server.ts`
- `apps/naviora-app/src/lib/supabase/profiles-browser.ts`
- `apps/naviora-app/src/lib/supabase/subscriptions-shared.ts`

### 11.5 邮件模板与配置

- `supabase/email-templates/confirmation.html`
- `supabase/email-templates/magic-link.html`
- `supabase/email-templates/recovery.html`
- `supabase/email-templates/email-change.html`
- `supabase/email-templates/reauthentication.html`
- `scripts/configure-supabase-auth-email-templates.mjs`
- `docs/supabase-auth-email-templates.md`

---

## 12. 复用时必须保留的关键规则

如果后续把这套系统复用到别的项目，建议至少保留以下原则：

### 12.1 认证成功后必须统一补资料

- 登录 / 注册 / OAuth / 邮件确认成功后，都要补建 `profiles`
- 同时确保默认 `free` 订阅存在

### 12.2 不要把邮箱存在性直接暴露给前端

- 当前 `/api/auth/email-exists` 已经朝抗枚举方向设计
- 复用时应继续避免“这个邮箱是否已注册”的直接探测接口

### 12.3 有效套餐必须按“当前有效窗口”判断

- 不要只拿最后一条订阅
- 必须按 `status + start + end` 决定当前套餐

### 12.4 入口限制应同时有“创建拦截 + 订阅变更自动收缩”

- 创建新入口时阻止超限
- 套餐降级后自动把超出的入口改成 `paused`

### 12.5 激活码涉及等级变化时，必须先预览再确认

- 尤其是 Starter -> Plus
- 用户必须能看见“补差价升级”和“立即生效 Plus”的差异

### 12.6 降级应保留审计记录

- 即便不走外部支付平台，也要保留变更前后套餐和有效期

### 12.7 账单记录和会员变更记录应分层

- `billing_events` 记录支付与账务事件
- `membership_change_logs` 记录会员状态变化

### 12.8 注册发码和登录都应有独立风控校验

- 不要只靠前端表单校验
- 最好把验证码挑战结果提交到我们自己的服务端接口
- 服务端校验通过后，再继续 `signInWithOtp` 或 `signInWithPassword` 主动作

### 12.9 Auth 邮件模板必须与语言路由保持一致

- 模板本身要支持多语言
- 触发邮件时要尽量传 `locale`
- 回跳链接也应保留 `locale`
- 否则会出现页面是中文、邮件却回退英文的体验割裂

---

## 13. 当前系统边界与注意事项

### 13.1 密码规则当前不完全统一

当前实现中：

- 登录页前端最小长度为 `6`
- 重置密码与修改密码要求 `8`
- 注册最终设密主要依赖 Supabase 错误反馈

如果后续复用，建议统一成一套密码策略。

### 13.2 `verify-email` 页面不是当前主注册流程核心页

当前标准注册是“页内验证码三步流”。

`/verify-email` 现在更像：

- 通知页
- 重发验证邮件页
- 历史兼容页

### 13.3 季度激活码是通过月份时长表达的

如果后续接别的支付系统或 CRM，不要误以为当前有独立 `quarterly` 周期枚举。

### 13.4 UI 名称和数据编码不同

- 数据层：`premium`
- 展示层：`Plus`

复用时请统一做映射，不要把 `premium` 直接暴露给最终用户。

### 13.5 腾讯云验证码风控目前仍属“接入中”

当前代码里已经有服务端校验封装，但登录和注册发码主链路还没有全部切到“先校验验证码、再调用认证动作”的服务端模式。

这意味着：

- 当前需求已经明确
- 当前接入方式已经收敛
- 但复用时不能把它视为完全收口的现成模块

### 13.6 邮件多语言仍依赖 locale 透传完整性

虽然模板已经支持 `zh-Hans / zh-Hant / en`，但如果某些认证动作没有正确附带 locale，或者用户历史 metadata 里没有语言信息，个别邮件仍可能回退英文。

如果后续要做更彻底的语言控制，最稳的方向是改成自定义邮件发送 Hook。

---

## 14. 推荐的后续文档拆分

如果后续要继续扩展，建议把本文拆成 4 份：

1. `认证系统 PRD`
2. `订阅与计费 PRD`
3. `激活码系统设计`
4. `会员限制与审计模型`

当前这份文档更适合作为总览与复用基线。
