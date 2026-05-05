# 会员中心复用需求文档

更新时间：2026-04-13  
适用对象：产品、研发、测试、项目复用方  
文档定位：基于当前 `Naviora` 已实现能力整理的“复用型需求文档”，描述的是当前真实规则，不是理想方案。

## 1. 文档目标

本文件用于沉淀当前会员中心中最适合复用的一组能力：

- 注册、登录、验证码与账号安全流程
- 订阅套餐体系
- 在线升级 / 内部降级
- 激活码兑换与时效处理
- 会员变化记录、账单记录、配额同步

复用时应优先继承这里的业务规则，再决定是否替换 UI、邮件样式、支付渠道或品牌文案。

## 2. 复用范围

本次复用范围包含：

- 邮箱密码登录
- Google 登录
- 三步邮箱验证码注册
- 登录前图形验证码
- 注册发码前图形验证码
- 忘记密码 / 重置密码
- 修改邮箱 / 修改密码二次验证
- 套餐购买、升级、账单入口
- Plus 降级为 Starter
- 激活码兑换、排队、补差升级
- 会员变更日志
- 登录 / 注册安全日志

本次不作为核心复用范围的内容：

- 营销页视觉样式
- 公开页路由分发
- 邮件模板具体 UI
- AI 能力本身
- 资产管理与二维码业务本身

## 3. 会员中心信息架构

### 3.1 页面入口

- `/{locale}/login`
- `/{locale}/register`
- `/{locale}/forgot-password`
- `/{locale}/reset-password`
- `/{locale}/verify-email`
- `/{locale}/settings`
- `/{locale}/upgrade`

### 3.2 服务端入口

- `/auth/callback`
- `/auth/confirm`
- `/api/auth/login`
- `/api/auth/email-exists`
- `/api/auth/register/send-otp`
- `/api/billing/checkout`
- `/api/billing/portal`
- `/api/billing/downgrade`
- `/api/billing/redeem`
- `/api/creem/webhook`

### 3.3 回跳规则

会员中心内涉及登录、注册、Google 登录回调、激活码继续兑换的入口，都支持 `next` 参数。

复用要求：

- 只接受站内相对路径
- 非相对路径一律回退到默认页
- 默认登录后落到 `/{locale}/dashboard`

这是必须保留的安全规则，不能把外部 URL 直接透传为回跳地址。

## 4. 角色与状态定义

### 4.1 用户角色

- 游客：未登录
- 已登录免费用户：有账号，有效套餐为 `Free`
- 已登录付费用户：当前有效套餐为 `Starter` 或 `Plus`
- 已登录过期用户：历史上有付费记录，但当前有效套餐已退回 `Free`

### 4.2 套餐定义

当前套餐统一用 `plan_code` 表示：

- `free`
- `starter`
- `premium`

界面展示中：

- `premium` 对外显示为 `Plus`

### 4.3 当前有效会员判定

`subscriptions` 是会员有效期真源。  
满足以下条件的订阅视为“当前有效”：

- `status` 属于 `active` / `trialing` / `past_due`
- `current_period_start <= now`
- `current_period_end >= now`，或 `current_period_end` 为空

如果没有满足条件的记录，则当前有效套餐视为 `Free`。

## 5. 注册、登录与验证码流程

## 5.1 登录流程

### 5.1.1 邮箱密码登录

用户在登录页输入邮箱和密码，前端调用 `/api/auth/login`，服务端完成：

1. 参数校验
2. 登录限流
3. 图形验证码校验（启用时）
4. `supabase.auth.signInWithPassword`
5. 补建 / 更新 `profile`
6. 自动确保用户存在默认 `free` 订阅
7. 返回 session 与用户信息

成功后跳转到：

- `next`
- 或默认 `/{locale}/dashboard`

### 5.1.2 Google 登录

登录页和注册页都支持 Google 登录，统一走 OAuth 回调：

1. 前端发起 `signInWithOAuth`
2. 回调进入 `/auth/callback`
3. 服务端 `exchangeCodeForSession`
4. 校验用户存在且有邮箱
5. 补建 `profile`
6. 跳回 `next` 或 Dashboard

### 5.1.3 登录图形验证码规则

当前登录已接入“配置驱动”的腾讯验证码：

- 当前端存在 `NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID` 时，登录页显示验证码组件
- 当服务端具备腾讯验证码环境变量时，`/api/auth/login` 会强制验证 `ticket + randstr`
- 验证不通过则禁止继续登录

这意味着：

- 验证码不是纯前端装饰
- 必须以服务端校验结果为准

### 5.1.4 登录限流规则

登录接口按 `IP + email hash` 做内存限流：

- 60 秒内最多 10 次

超限返回 `429`，并附带 `Retry-After`。

## 5.2 注册流程

### 5.2.1 当前标准注册模式

当前注册不是“邮箱 + 密码提交后再发确认邮件”的模式，而是“三步邮箱验证码注册”：

1. 输入邮箱
2. 输入邮箱验证码
3. 设置密码并完成账号创建

这套模式是复用时必须保留的核心交互规则。

### 5.2.2 第一步：输入邮箱并发送验证码

前端动作：

1. 用户输入邮箱
2. 调用 `/api/auth/email-exists`
3. 调用 `/api/auth/register/send-otp`

服务端要求：

- 对邮箱做格式校验
- 对发码行为限流
- 启用图形验证码时先校验验证码
- 再调用 `supabase.auth.signInWithOtp({ shouldCreateUser: true })`

### 5.2.3 注册邮箱预检规则

`/api/auth/email-exists` 当前只做：

- 邮箱格式校验
- 频率限制
- 抗枚举占位响应

当前真实规则是：

- 该接口不明确向前端暴露“邮箱是否已存在”
- 前端不应依赖这个接口做强提示

复用要求：

- 必须保留“抗邮箱枚举”策略
- 不能把真实存在性直接暴露给匿名用户

当前接口限流规则：

- 60 秒内最多 12 次

### 5.2.4 注册发码图形验证码规则

当腾讯验证码环境开启时：

- 用户必须先完成图形验证码
- 前端拿到 `ticket + randstr`
- `/api/auth/register/send-otp` 服务端校验通过后，才能真正发邮箱验证码

### 5.2.5 注册发码限流规则

注册发码接口按 `IP + email hash` 做内存限流：

- 60 秒内最多 8 次

### 5.2.6 第二步：验证邮箱验证码

用户输入 8 位邮箱验证码后，前端调用：

- `supabase.auth.verifyOtp({ type: "email" })`

验证成功后：

- 补建 `profile`
- 进入“设置密码”阶段

### 5.2.7 第三步：设置密码并完成注册

用户需要：

- 输入密码
- 再次确认密码
- 勾选 `Terms` 与 `Privacy`

前端再调用：

- `supabase.auth.updateUser({ password, data: { locale } })`

成功后：

- 更新 `profile.default_locale`
- 保存 session
- 自动进入 Dashboard

### 5.2.8 注册异常处理规则

需要明确处理以下场景：

- 邮箱为空
- 邮箱格式不合法
- 图形验证码未完成
- 图形验证码校验失败
- 发码过于频繁
- 邮箱验证码为空
- 邮箱验证码错误或过期
- 密码为空
- 两次密码不一致
- 未勾选条款
- 新密码与旧密码重复

## 5.3 忘记密码 / 重置密码

当前流程：

1. 用户在忘记密码页输入邮箱
2. 调用 `supabase.auth.resetPasswordForEmail`
3. 用户点击邮件链接进入 `/auth/confirm`
4. `type = recovery` 验证成功后跳到 `/{locale}/reset-password`
5. 用户输入新密码
6. 调用 `supabase.auth.updateUser({ password })`

复用要求：

- 找回密码继续使用邮件链接确认模式
- 不和注册三步验证码混用

## 5.4 修改邮箱流程

当前设置中心的修改邮箱流程是“两段式安全校验”：

1. 用户先输入当前密码
2. 用当前邮箱 + 当前密码重新登录校验身份
3. 校验通过后，输入新邮箱
4. 调用 `supabase.auth.updateUser({ email: newEmail })`
5. Supabase 向新邮箱发送 `email_change` 验证码
6. 用户输入验证码
7. 调用 `supabase.auth.verifyOtp({ type: "email_change" })`
8. 修改成功

复用要求：

- 修改邮箱前必须再次验证当前密码
- 新邮箱必须通过验证码确认后才正式替换

## 5.5 修改密码流程

当前设置中心的修改密码流程为：

1. 用户在已登录状态下发起修改密码
2. 调用 `supabase.auth.reauthenticate()`
3. 当前邮箱收到验证码
4. 用户输入验证码 + 新密码
5. 调用 `supabase.auth.updateUser({ password, nonce })`

复用要求：

- 修改密码必须使用二次验证码
- 不允许无验证直接改密码

## 5.6 登录方式绑定与解绑

当前设置中心支持：

- 绑定 Google
- 解绑 Google

业务规则：

- 已登录用户可把 Google 绑定到当前账号
- 解绑 Google 前，账号至少还要保留另一种登录方式
- 如果只有一种登录方式，不允许解绑

## 5.7 安全日志

当前系统会把登录与注册关键动作写入 `login_logs`：

- `type`: `login` / `register`
- `status`: `success` / `failed` / `captcha_failed` / `rate_limited`

复用建议：

- 新项目继续保留该日志表
- 至少记录邮箱、IP、UA、结果和时间

## 6. 套餐与订阅模型

## 6.1 套餐价格

当前价格规则如下：

| 套餐 | 月付 | 年付 |
| --- | --- | --- |
| Free | 0 USD | 0 USD |
| Starter | 6 USD | 59 USD |
| Plus | 16 USD | 159 USD |

说明：

- 数据库存储仍以 `premium` 表示 `Plus`
- 年付在系统内部会换算成月均价格，用于补差、降级和激活码价值折算

## 6.2 套餐配额

### Free

- 条目数：10
- AI 对话数：20 / 月
- 月访问量：500
- 存储：10 MB

### Starter

- 条目数：100
- AI 对话数：300 / 月
- 月访问量：100,000
- 存储：1024 MB

### Plus

- 条目数：1000
- AI 对话数：2000 / 月
- 月访问量：300,000
- 存储：5120 MB

## 6.3 默认 Free 订阅规则

用户成功登录或完成注册后，系统会自动确保至少存在一条默认 `free` 订阅：

- `provider = system`
- `plan_code = free`
- `status = active`

复用要求：

- 必须保留这条默认兜底逻辑
- 不要让用户处于“无订阅记录”的裸状态

## 6.4 会员时效真源

下列表是会员体系复用时必须保留的核心表：

- `subscriptions`：会员有效期真源
- `billing_events`：账单事件真源
- `membership_change_logs`：会员变化审计
- `activation_codes`：激活码主表
- `activation_code_redemptions`：激活码兑换记录

## 7. 在线订阅、升级与账单入口

## 7.1 购买入口

当前购买统一走 `/api/billing/checkout`。

购买参数：

- `plan`
- `billing`
- `locale`

## 7.2 在线购买规则

### 7.2.1 免费用户购买付费套餐

如果当前是 `Free`，或没有有效的 Creem 付费订阅：

- 创建新的 Creem checkout
- 支付成功后回到 `/{locale}/settings?billingNotice=checkout-complete`

### 7.2.2 已有付费订阅时的升级

如果当前已有有效付费订阅，且存在 `provider_subscription_id`：

- 不再创建新的 checkout
- 直接调用 `creem.subscriptions.upgrade`
- `updateBehavior = proration-charge`

这意味着当前系统支持：

- Starter 升级到 Plus
- 付费套餐间切换账期
- 在原订阅上直接补差

### 7.2.3 重复购买拦截

如果用户请求的套餐和当前有效套餐完全一致：

- 不发起支付
- 直接提示“当前方案”

## 7.3 Billing Portal 规则

当前账单中心入口走 `/api/billing/portal`。

只有当用户存在以下条件时，才显示或可跳转：

- 存在 `provider = creem` 的订阅记录
- 且 `provider_customer_id` 不为空

如果没有外部账单客户号：

- Portal 不可用

## 7.4 升级审计规则

当在线升级成功时，系统会分两段完成审计：

- 升级接口即时更新 `subscriptions`
- 升级接口即时写入 `membership_change_logs`
- `billing_events` 由后续 `Creem webhook` 补齐

其中 `membership_change_logs.action = upgrade`。

## 8. 降级规则

## 8.1 当前支持的降级能力

当前只支持：

- `Plus -> Starter`

当前不支持：

- `Starter -> Free` 的内部即时降级
- 任意套餐直接内部退款

如果用户想回到免费方案，当前主路径是：

- 去外部 Billing Portal 管理续费
- 订阅到期后自然回落为 `Free`

## 8.2 降级触发方式

当前设置中心提供“降级成 Starter”按钮，调用：

- `/api/billing/downgrade`

## 8.3 降级核心规则

当用户从 `Plus` 降为 `Starter` 时：

1. 立即生效
2. 当前 `Plus` 不继续跑到原到期日
3. 先计算当前剩余价值
4. 再把剩余价值折算为 `Starter` 可用月数
5. 新建一条 `Starter` 订阅作为新的有效订阅

## 8.4 降级价值换算规则

换算公式基于“剩余价值”而不是“剩余天数原样平移”。

当前实现口径：

1. 先算原订阅总价值
2. 按剩余时间比例换算剩余价值
3. 用 `Starter` 月价去折算新的可用月数
4. 月数向上取整，最少 1 个月

当前 `Starter` 月价为：

- 6 USD

## 8.5 降级后的订阅处理

原 `Plus` 订阅会被标记为：

- `status = replaced`
- `current_period_end = now`
- `cancel_at_period_end = true`

新建订阅：

- `provider = internal_adjustment`
- `plan_code = starter`
- `status = active`

## 8.6 降级后的账务与记录

降级后必须同步写入：

- `billing_events`，事件类型为 `subscription.downgraded`
- `membership_change_logs`，动作类型为 `downgrade`

## 8.7 降级后的配额处理

降级完成后需要立即执行配额同步。

当前实现会：

- 重新计算用户当前可用套餐
- 检查非归档条目数量
- 超出新套餐条目上限的条目自动改为 `paused`

当前不会自动删除内容，只会暂停超额内容。

## 8.8 降级退款规则

当前内部降级规则明确为：

- 不退款
- 只做剩余价值换算

复用时如果想引入退款逻辑，需要新增独立账务流程，不能直接改写当前降级逻辑。

## 9. 激活码规则

## 9.1 激活码定位

激活码用于发放 `Starter` 或 `Plus` 会员时长，不用于 `Free`。

当前已支持：

- Starter 激活码
- Plus 激活码
- 月卡、季卡、年卡
- 单次或多次兑换上限

说明：

- 季卡不是单独的 `billing_cycle`
- 当前以 `duration_months = 3` 表达季度时长

## 9.2 激活码格式

当前标准格式：

- `NAV-XXXX-XXXX-XXXX`

输入时会做标准化：

- 自动转大写
- 去掉非字母数字字符
- 兼容用户直接输入无连接符的版本

## 9.3 激活码校验规则

兑换前必须校验：

- 激活码非空
- 激活码存在
- 当前账号未兑换过该码
- 未过期
- 状态为 `active` 或 `issued`
- `redeemed_count < max_redemptions`

任一条件不满足，都不能进入正式兑换。

## 9.4 未登录用户兑换规则

游客输入激活码后，不直接丢失上下文。

当前规则：

1. 把激活码放进 `next` 回跳链路
2. 引导去登录或注册
3. 登录 / 注册成功后自动回到原页面
4. 自动触发一次兑换预览 / 兑换流程

复用要求：

- 必须保留“未登录继续兑换”的体验
- 不能让用户登录后重新手输一次激活码

## 9.5 激活码兑换前必须先预览

当前正式接口虽然支持直接兑换，但前端标准流程是：

1. 先调用预览
2. 如果无需用户选择，则直接按推荐策略兑换
3. 如果涉及等级变化，则先展示选项，再由用户确认

## 9.6 激活码生效策略

当前支持以下四种策略：

- `activate_now`
- `queue_after_current`
- `upgrade_difference`
- `start_now`

### 9.6.1 activate_now

适用场景：

- 当前没有有效订阅
- 当前有效套餐为 `Free`

规则：

- 激活码立即生效
- 结束时间 = 当前时间 + 激活码时长

### 9.6.2 queue_after_current

适用场景：

- 当前已有有效付费订阅
- 且不属于“Starter + Plus 激活码”的特殊升级场景

规则：

- 当前订阅继续到原到期日
- 新激活码对应订阅排队到当前订阅结束后生效

这是大多数“已有付费会员再次兑换”的默认策略。

### 9.6.3 upgrade_difference

适用场景：

- 当前有效套餐是 `Starter`
- 激活码对应套餐是 `Plus`

规则：

- 当前 `Starter` 剩余价值与激活码价值相加
- 折算为新的 `Plus` 可用时长
- `Plus` 立即生效
- 原 `Starter` 不再单独保留

这是该场景下的推荐策略。

### 9.6.4 start_now

适用场景：

- 当前有效套餐是 `Starter`
- 激活码对应套餐是 `Plus`
- 用户不想做差价折算，只想让 `Plus` 立即先用

规则：

- 先立即创建一段 `Plus` 有效期
- 原 `Starter` 剩余价值换算为剩余月数
- 再把这段 `Starter` 顺延到 `Plus` 之后

## 9.7 激活码价值换算规则

激活码在“补差升级”场景下，价值按如下方式计算：

- 先取激活码所属套餐的月均价格
- 乘以激活码时长（月）
- 得到激活码价值

例如：

- `Starter` 年卡会先折算为月均价格再参与运算

## 9.8 激活码兑换落库规则

正式兑换后，系统必须写入：

- `subscriptions`
- `activation_code_redemptions`
- `activation_codes.redeemed_count`
- `billing_events`
- `membership_change_logs`

### 9.8.1 可能写入一条或两条订阅

根据策略不同：

- `activate_now`：写 1 条
- `queue_after_current`：写 1 条排队订阅
- `upgrade_difference`：写 1 条新 `Plus`
- `start_now`：写 2 条，分别是立即生效的 `Plus` 和顺延的 `Starter`

### 9.8.2 旧订阅替换规则

当策略为 `start_now` 或 `upgrade_difference` 时：

- 原有效订阅会被标记为 `replaced`
- 到期时间截断到当前时间

### 9.8.3 会员变更动作规则

当前 `membership_change_logs.action` 规则为：

- 普通兑换：`activation_code_redeemed`
- 补差升级：`upgrade`
- 立即 Plus + 顺延 Starter：`upgrade`

## 9.9 激活码兑换后的配额同步

激活码正式兑换成功后，必须执行配额同步，确保：

- 当前有效套餐
- 内容条目状态
- 前台权益展示

与最新会员状态一致。

## 10. 会员中心展示要求

## 10.1 当前方案卡片

设置中心需展示：

- 当前方案名称
- 当前账期
- 当前价格
- 到期时间 / 续费时间
- 支付方式 / 提供方

## 10.2 使用量展示

设置中心需展示：

- 条目数使用量
- AI 对话使用量
- 月访问量使用量
- 存储使用量

## 10.3 会员变更记录

设置中心需展示最近的会员变化记录，包括：

- 操作类型：激活码生效 / 升级 / 降级
- 上一个方案
- 上一个到期时间
- 当前方案
- 当前到期时间
- 变更时间

## 10.4 账单记录

设置中心需展示最近账单事件中可映射为发票的数据，包括：

- 发票号 / 交易号
- 时间
- 金额
- 币种
- 状态：`paid` / `refunded`

## 11. 数据模型复用建议

## 11.1 必备表

建议复用以下表结构或等价模型：

- `profiles`
- `subscriptions`
- `billing_events`
- `membership_change_logs`
- `activation_codes`
- `activation_code_redemptions`
- `login_logs`

## 11.2 关键字段建议

### subscriptions

至少保留：

- `user_id`
- `provider`
- `provider_customer_id`
- `provider_subscription_id`
- `plan_code`
- `status`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `billing_cycle`
- `duration_months`
- `monthly_price`

### membership_change_logs

至少保留：

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

### activation_codes

至少保留：

- `code_hash`
- `code_prefix`
- `plan_code`
- `billing_cycle`
- `duration_months`
- `max_redemptions`
- `redeemed_count`
- `status`
- `expires_at`

## 12. 接口复用清单

## 12.1 认证接口

- `POST /api/auth/login`
- `POST /api/auth/email-exists`
- `POST /api/auth/register/send-otp`

## 12.2 订阅接口

- `GET /api/billing/checkout`
- `GET /api/billing/portal`
- `POST /api/billing/downgrade`
- `POST /api/billing/redeem`
- `POST /api/creem/webhook`

## 12.3 认证回调

- `GET /auth/callback`
- `GET /auth/confirm`

## 13. 验收标准

## 13.1 注册

- 用户必须先输入邮箱，再收验证码，再设密码
- 启用图形验证码时，不通过则不能发注册验证码
- 注册完成前必须勾选条款
- 注册完成后自动有默认 `Free` 订阅

## 13.2 登录

- 启用图形验证码时，不通过则不能登录
- 登录后自动补建资料与会员基线
- `next` 只能跳站内路径

## 13.3 升级

- 当前套餐与目标套餐相同，不应重复发起购买
- 已有付费订阅时应优先原地升级，不重复新开 checkout
- 升级后必须写入会员变更日志

## 13.4 降级

- 当前只允许 `Plus -> Starter`
- 降级后必须立刻生效
- 新到期日必须根据剩余价值重算
- 不退款
- 超限条目自动暂停

## 13.5 激活码

- 游客输入激活码后，登录 / 注册后可继续兑换
- 同一用户不能重复兑换同一激活码
- 已过期、已用尽、无效码必须明确失败
- `Starter -> Plus` 激活码场景必须先预览策略
- 兑换后必须更新订阅、日志与配额

## 14. 复用时的关键注意事项

### 14.1 不要把 `/verify-email` 误当作主注册页

当前真正的主注册流程是：

- 页内三步邮箱验证码注册

`/verify-email` 更多是辅助页，而不是主链路中心页。

### 14.2 不要把邮箱存在性直接暴露出去

当前系统已经按抗枚举方向设计。  
复用时如果为了“体验更好”而直接暴露邮箱是否注册，安全口径会倒退。

### 14.3 图形验证码必须服务端校验

如果只在前端挂组件、不在服务端校验，复用将失去风控价值。

### 14.4 默认 Free 订阅必须保留

很多后续权益判断、配额计算、设置页展示都默认用户至少有一条订阅记录。  
如果移除默认 `Free` 逻辑，后续代码和产品判断会变复杂。

### 14.5 激活码必须保留“预览再确认”能力

尤其是 `Starter -> Plus` 场景，若直接兑换，会丢失用户选择权，也会让业务口径不清晰。

## 15. 当前实现参考

以下文件是本需求文档对应的实现来源：

- [docs/auth-subscription-system-reference.md](/Users/yancy/vide code/naviora/docs/auth-subscription-system-reference.md)
- [apps/naviora-app/src/features/auth/auth-form.tsx](/Users/yancy/vide code/naviora/apps/naviora-app/src/features/auth/auth-form.tsx)
- [apps/naviora-app/src/app/api/auth/login/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/auth/login/route.ts)
- [apps/naviora-app/src/app/api/auth/register/send-otp/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/auth/register/send-otp/route.ts)
- [apps/naviora-app/src/app/api/auth/email-exists/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/auth/email-exists/route.ts)
- [apps/naviora-app/src/lib/services.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/lib/services.ts)
- [apps/naviora-app/src/app/api/billing/checkout/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/billing/checkout/route.ts)
- [apps/naviora-app/src/app/api/billing/downgrade/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/billing/downgrade/route.ts)
- [apps/naviora-app/src/app/api/billing/redeem/route.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/app/api/billing/redeem/route.ts)
- [apps/naviora-app/src/lib/billing/membership-server.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/lib/billing/membership-server.ts)
- [apps/naviora-app/src/lib/supabase/billing-shared.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/lib/supabase/billing-shared.ts)
- [apps/naviora-app/src/lib/supabase/subscription-controls.ts](/Users/yancy/vide code/naviora/apps/naviora-app/src/lib/supabase/subscription-controls.ts)
- [supabase/migrations/20260409001000_default_free_subscriptions.sql](/Users/yancy/vide code/naviora/supabase/migrations/20260409001000_default_free_subscriptions.sql)
- [supabase/migrations/20260410223000_activation_code_billing.sql](/Users/yancy/vide code/naviora/supabase/migrations/20260410223000_activation_code_billing.sql)
- [supabase/migrations/20260411160000_membership_changes_and_frozen_target_url.sql](/Users/yancy/vide code/naviora/supabase/migrations/20260411160000_membership_changes_and_frozen_target_url.sql)
- [supabase/migrations/20260412120000_login_logs.sql](/Users/yancy/vide code/naviora/supabase/migrations/20260412120000_login_logs.sql)
