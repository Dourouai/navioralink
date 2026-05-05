# 会员中心复用需求文档

本文档基于当前 `Naviora` 已落地实现整理，目标是把“注册登录、验证码、账号安全、订阅升降级、激活码兑换、账单展示”这一套会员中心能力抽象成一份可复用的产品需求文档。

这份文档强调的是：

- 当前系统真实行为
- 复用时必须保留的关键规则
- 用户可见流程与状态
- 后端必须承担的风控、权限和审计职责

如果后续需要看更贴近代码实现的说明，可同时参考：

- [auth-login-register-flow.md](/Users/yancy/vide%20code/Zaps/docs/auth-login-register-flow.md)
- [auth-subscription-system-reference.md](/Users/yancy/vide%20code/Zaps/docs/auth-subscription-system-reference.md)

## 1. 文档目标

为后续新项目或新品牌站复用会员中心时，提供一套可直接沿用的需求基线，包括：

- 用户注册与登录
- 验证码与验证码风控
- 账号安全与登录方式管理
- 免费/付费订阅体系
- 在线支付升级
- 内部降级
- 激活码订阅
- 账单记录与会员变更记录

## 2. 适用范围

当前文档覆盖以下模块：

- 认证中心
- 账号安全中心
- 订阅中心
- 激活码中心
- 账单与会员变更记录

不在本文重点范围内的内容：

- 公开入口 `go/public` 路由细节
- AI 建码流程
- 文件管理与媒体库
- 公开页内容渲染

## 3. 产品目标

会员中心的目标是：

- 让新用户可以低摩擦完成注册并快速进入工作台
- 让老用户可以安全地完成登录、找回密码、换绑邮箱、改密和绑定第三方身份
- 让付费用户可以清楚地完成升级、管理订阅和查看账单
- 让渠道、销售、合作伙伴提供的激活码可以独立完成套餐开通
- 让所有会员变化都可审计、可追踪、可复盘

## 4. 用户角色

### 4.1 游客

可执行：

- 访问登录页
- 访问注册页
- 发起 Google 登录
- 发起忘记密码
- 查看价格页
- 在价格页输入激活码

限制：

- 不能直接兑换激活码
- 不能访问工作台设置、升级、账单等会员页

### 4.2 已登录用户

可执行：

- 访问 Dashboard、Settings、Upgrade
- 查看当前套餐与用量
- 升级套餐
- 在支持的情况下发起降级
- 兑换激活码
- 管理邮箱、密码、Google 登录方式
- 查看账单与会员变更记录

## 5. 页面与路由范围

### 5.1 认证页面

- `/[locale]/login`
- `/[locale]/register`
- `/[locale]/forgot-password`
- `/[locale]/reset-password`
- `/[locale]/verify-email`

### 5.2 认证回调

- `/auth/callback`
- `/auth/confirm`
- `/[locale]/auth/callback`
- `/[locale]/auth/confirm`

### 5.3 会员中心页面

- `/[locale]/settings`
- `/[locale]/upgrade`
- `/[locale]/pricing`

## 6. 认证体系需求

### 6.1 认证能力清单

当前复用基线包括：

- 邮箱 + 密码登录
- Google OAuth 登录
- 邮箱验证码注册
- 忘记密码与重置密码
- 邮箱验证确认
- 修改登录邮箱
- 修改密码
- 绑定 Google
- 解绑 Google

### 6.2 统一认证原则

所有认证成功后的统一动作必须包括：

- 自动补建或更新 `profile`
- 自动确保存在一条默认 `Free` 订阅
- 按当前语言和回跳参数跳转到目标页

### 6.3 邮箱密码登录

#### 用户流程

1. 用户输入邮箱和密码
2. 如果验证码风控已开启，先完成图形验证码
3. 服务端校验登录请求
4. 调用 `Supabase Auth` 完成登录
5. 登录成功后写入 session，并进入工作台或 `next` 页面

#### 前端校验

- 邮箱格式合法
- 密码不为空
- 当前实现中登录页最小密码长度校验为 `6`

#### 服务端规则

- 启用风控时，必须先验证腾讯云验证码
- 登录接口启用基于 `IP + email hash` 的限流
- 登录成功与失败都写登录日志

### 6.4 Google 登录

#### 用户流程

1. 用户点击 `Continue with Google`
2. 跳转 Google OAuth
3. 回到 `/auth/callback`
4. 后端执行 `exchangeCodeForSession`
5. 检查用户与邮箱是否可用
6. 自动补建 `profile`
7. 跳转到 `next` 或 Dashboard

#### 规则

- Google 登录页和注册页共用同一条 OAuth 链路
- 必须支持 `locale`
- 必须支持 `next`
- 如果 Google 没返回有效邮箱，不能放行

### 6.5 邮箱验证码注册

当前注册采用“三步式注册”。

#### Step 1：输入邮箱并发送验证码

1. 用户输入邮箱
2. 前端调用 `/api/auth/email-exists`
3. 如果风控已开启，用户先完成验证码挑战
4. 服务端调用 `signInWithOtp({ shouldCreateUser: true })`
5. 邮件发送验证码

#### Step 2：校验邮箱验证码

1. 用户输入验证码
2. 前端调用 `supabase.auth.verifyOtp({ type: "email" })`
3. 验证成功后补建 `profile`
4. 进入设置密码步骤

#### Step 3：设置密码完成注册

1. 用户输入密码
2. 用户再次确认密码
3. 用户勾选 `Terms` 与 `Privacy`
4. 调用 `supabase.auth.updateUser({ password, data: { locale } })`
5. 更新 `profile.default_locale`
6. 完成注册并进入工作台

#### 注册规则

- 标准流程是“先验证邮箱，再设置密码”
- 不应改回“直接注册后再补验证邮件”的老流程
- 发码前如启用验证码风控，必须由服务端负责最终校验
- 邮箱存在性接口应保持抗枚举策略，不直接暴露用户是否已注册

### 6.6 忘记密码与重置密码

#### 忘记密码

1. 用户输入邮箱
2. 调用 `resetPasswordForEmail`
3. 用户点击邮件里的 recovery link
4. 进入 `/auth/confirm?type=recovery`
5. 验证成功后跳转到 `/reset-password`

#### 重置密码

1. 用户输入新密码和确认密码
2. 密码至少 `8` 位
3. 两次密码必须一致
4. 更新成功后主动退出登录
5. 回到登录页并显示成功提示

### 6.7 `/auth/confirm` 通用确认页

支持的 OTP 类型包括：

- `signup`
- `invite`
- `magiclink`
- `recovery`
- `email`
- `email_change`

统一规则：

- 只接受合法同源回跳地址
- `next` 只接受以 `/` 开头的站内相对路径
- 成功后必须补建 `profile`
- `recovery` 优先跳 `/reset-password`
- `email` / `signup` 成功后跳登录页并显示成功提示

## 7. 验证码体系需求

### 7.1 当前存在的验证码类型

当前会员中心里存在三类“验证码”：

#### A. 图形验证码/人机验证

用于：

- 登录前校验
- 注册发码前校验

当前策略：

- 腾讯云验证码为首选实现
- 仅在环境变量开启时强制启用
- 必须服务端验证，不接受纯前端放行

#### B. 邮箱注册验证码

用于：

- 邮箱注册 Step 2 校验邮箱所有权

当前规则：

- 由 Supabase OTP 发送
- 当前 UI 按固定验证码位数输入
- 验证通过后才能设置密码

#### C. 账号安全验证码

用于：

- 修改邮箱时验证新邮箱
- 修改密码时的 reauthentication 验证码

当前规则：

- 修改邮箱走 `email_change`
- 修改密码走 `reauthenticate + nonce`

### 7.2 验证码复用原则

如果后续把会员中心复用到新项目，必须保留：

- 登录风控验证码与注册发码验证码是两条独立风控链
- 账号安全验证码不能和注册验证码混用
- 所有验证码必须带语言上下文，保证邮件和页面语种一致

## 8. 账号安全中心需求

### 8.1 修改邮箱

采用三步式安全流程：

1. 用户输入当前密码
2. 系统再次验证当前密码
3. 用户输入新邮箱
4. 系统向新邮箱发送验证码
5. 用户输入验证码完成 `email_change`
6. 更新前端用户态

规则：

- 未通过当前密码验证前，不允许发送邮箱变更验证码
- 新邮箱验证码由 `Supabase Auth` 负责发送

### 8.2 修改密码

采用“先发安全验证码，再提交新密码”的流程：

1. 用户点击发送验证码
2. 系统调用 `supabase.auth.reauthenticate()`
3. 用户收到验证码
4. 用户输入验证码、新密码、确认密码
5. 调用 `updateUser({ password, nonce })`

规则：

- 新密码最少 `8` 位
- 两次密码必须一致
- 必须带验证码

### 8.3 绑定 Google

流程：

1. 已登录用户在设置页点击绑定 Google
2. 发起 `linkIdentity({ provider: "google" })`
3. 回到 `/auth/callback?authMode=link-google`
4. 保留当前登录态
5. 回设置页显示成功提示

### 8.4 解绑 Google

规则：

- 必须至少保留另一种可用登录方式
- 当前实现判断是 `identities.length >= 2`

意味着：

- 只有 Google 一种身份时，不能解绑
- 邮箱 + Google 共存时，可以解绑 Google

## 9. 套餐与价格需求

### 9.1 套餐编码

数据编码：

- `free`
- `starter`
- `premium`

用户展示名：

- `Free`
- `Starter`
- `Plus`

### 9.2 当前价格

| 套餐 | 月付 | 年付 |
| --- | ---: | ---: |
| Free | $0 | $0 |
| Starter | $6 | $59 |
| Plus | $16 | $159 |

### 9.3 当前配额

#### Free

- Links/Entries：`10`
- AI 对话：`20 / 月`
- 月访问量：`500`
- 存储：`10 MB`

#### Starter

- Links/Entries：`100`
- AI 对话：`300 / 月`
- 月访问量：`100,000`
- 存储：`1 GB`

#### Plus

- Links/Entries：`1,000`
- AI 对话：`2,000 / 月`
- 月访问量：`300,000`
- 存储：`5 GB`

### 9.4 默认 Free 订阅

认证成功后，系统必须确保用户至少拥有一条默认 `Free` 订阅。

这条规则的意义是：

- 前后端统一把 `Free` 也视为订阅态
- 权限、价格页、设置页和账单逻辑都可以基于统一订阅模型工作

## 10. 订阅体系需求

### 10.1 订阅来源

当前订阅来源包含：

- `system`
- `creem`
- `activation_code`
- `internal_adjustment`

### 10.2 当前有效套餐判定

有效套餐必须按“当前有效窗口”计算，而不是简单读取最后一条记录。

判定条件：

- `status` 属于 `active / trialing / past_due`
- `current_period_start <= now`
- `current_period_end >= now`，或结束时间为空

### 10.3 套餐升级

#### Free -> Starter / Plus

行为：

- 通过在线支付创建新 checkout
- 支付成功后回设置页

#### Starter -> Plus

行为分两种：

- 正常在线支付升级：直接调用 Creem 的 `upgrade(proration-charge)`
- 激活码升级：走“补差价升级”或“立即生效 Plus”策略

### 10.4 套餐降级

当前系统支持：

- `Plus -> Starter`

当前系统不支持直接在设置页做：

- `Starter -> Free`
- `Plus -> Free`

#### Plus -> Starter 规则

这是内部重算逻辑，不走第三方支付平台降级接口。

流程：

1. 读取当前有效 Plus 订阅
2. 计算剩余价值
3. 按 Starter 月价折算为新的有效月数
4. 立即将当前 Plus 订阅标记为 `replaced`
5. 新建一条 `internal_adjustment` 的 Starter 订阅
6. 写账单事件与会员变更日志

产品规则：

- 立刻生效 Starter 权益
- 不自动退款
- 保留完整审计记录

## 11. 在线支付需求

### 11.1 支付厂商定位

当前已支持/规划的支付模式包括：

- Creem
- Paddle（文案兼容）
- 激活码兑换
- 后续其他支付厂商

### 11.2 Checkout 行为

当前行为：

- 未登录用户访问付费计划时，先进入登录流程
- 登录后通过 `next` 回到 checkout
- 免费计划对未登录用户默认引导注册

### 11.3 Billing Portal

仅当用户有真实 Creem 客户记录时，才显示和开放 `Manage billing`。

### 11.4 升级行为

当前支持：

- 付费用户周期内升级使用差额计费
- 不重复新建外部订单
- 升级完成后直接刷新当前套餐状态

## 12. 激活码系统需求

### 12.1 激活码定位

激活码用于支持：

- 线下销售
- 渠道合作
- 商务赠送
- 非在线支付场景的开通

### 12.2 用户入口

当前激活码入口应出现在：

- 价格页
- 升级页
- 设置页

### 12.3 交互原则

- 不需要先选套餐
- 用户只需直接输入激活码
- 系统先预览，再决定是否需要用户选择生效策略

### 12.4 游客兑换行为

游客在价格页输入激活码后：

1. 系统保留 `returnPath`
2. 跳转注册或登录
3. 登录成功后，自动回到原页继续兑换

### 12.5 激活码格式

标准格式：

- `NAV-XXXX-XXXX-XXXX`

规则：

- `NAV` 固定前缀
- 主体 `12` 位字母数字
- 前端支持自动格式化
- 输入无分隔符时，系统自动纠正展示格式

### 12.6 激活码前置校验

兑换前必须校验：

- 用户已登录
- 激活码不为空
- 激活码存在
- 当前用户未兑换过同一组码
- 激活码未过期
- 激活码状态可用
- 未超出最大兑换次数

### 12.7 激活码支持的订阅策略

当前支持四种策略：

- `activate_now`
- `queue_after_current`
- `upgrade_difference`
- `start_now`

#### activate_now

适用：

- 当前无付费订阅
- 或当前是 Free

效果：

- 激活码对应套餐立即生效

#### queue_after_current

适用：

- 当前已有有效订阅，且不需要立刻覆盖

效果：

- 当前订阅保持不变
- 激活码在当前订阅结束后接续生效

#### upgrade_difference

适用：

- 当前是 Starter
- 激活的是 Plus 码

效果：

- 把当前 Starter 剩余价值 + 新码价值，一起折算成一段新的 Plus 有效期

#### start_now

适用：

- 当前是 Starter
- 用户希望 Plus 立刻生效

效果：

- Plus 立即生效
- 剩余 Starter 时长顺延到后面
- 顺延部分通过 `internal_adjustment` 订阅保存

### 12.8 激活码兑换后的落库动作

成功兑换后必须同时完成：

- 写入 `subscriptions`
- 写入 `activation_code_redemptions`
- 更新 `activation_codes.redeemed_count`
- 写入 `billing_events`
- 写入 `membership_change_logs`

## 13. 账单中心需求

### 13.1 用户可见账单

前台账单列表只展示用户真正需要理解的支付结果：

- 已付款记录
- 已退款记录

不展示给用户的事件：

- 内部同步事件
- 激活码兑换事件
- 订阅状态同步事件
- 处理中但没有真实支付结果的技术事件

### 13.2 退款展示

如果发生退款：

- 数据库继续保留原始账单事件
- 用户前台账单列表必须显示 `Refunded / 已退款`

### 13.3 会员变更记录

会员变更记录与账单记录分开：

- 账单记录：看支付结果
- 会员变更记录：看套餐变化

当前会员变更记录包括：

- 升级
- 降级
- 激活码生效

## 14. 会员中心内的“验证码”清单

为了方便复用，下面列出当前系统所有“验证码相关动作”：

| 场景 | 类型 | 触发方式 | 作用 |
| --- | --- | --- | --- |
| 登录前 | 图形验证码 | 腾讯云验证码 | 防刷、防撞库 |
| 注册发码前 | 图形验证码 | 腾讯云验证码 | 防刷、防批量注册 |
| 注册 Step 2 | 邮箱 OTP | Supabase | 验证邮箱所有权 |
| 忘记密码 | 邮件链接 | Supabase | 恢复账号 |
| 修改邮箱 | 新邮箱 OTP | Supabase | 确认新邮箱可用 |
| 修改密码 | reauthentication 验证码 | Supabase | 确认高风险操作本人发起 |

## 15. 异常分支与失败处理

### 15.1 登录

- 验证码未完成：禁止登录
- 登录限流：返回稍后重试
- 邮箱密码错误：返回错误

### 15.2 注册

- 邮箱格式错误：禁止继续
- 发码限流：返回稍后重试
- 邮箱验证码错误或过期：不能进入设置密码步骤
- 未勾选条款：不能完成注册

### 15.3 激活码

- 未登录：先去登录/注册
- 激活码不存在：提示无效
- 已过期：提示过期
- 已被本人兑换：提示已兑换
- 已达兑换上限：提示不可用
- 当前场景需要策略选择但未选择：不能直接执行兑换

### 15.4 升降级

- 非法套餐参数：回设置页并提示错误
- 当前已在该方案：提示当前方案
- 不支持当前降级条件：提示不能降级
- 无可用 Portal：隐藏或禁用 Portal 入口

## 16. 复用时必须保留的关键规则

### 16.1 认证成功后必须补全用户资料和默认 Free 订阅

这是整个会员中心的基础真源规则。

### 16.2 不能把邮箱存在性明文暴露给前端

复用时必须保留抗枚举思路。

### 16.3 当前有效套餐必须按订阅窗口判断

不能只看最新一条记录。

### 16.4 升级、降级、激活码都必须写审计日志

必须保留：

- `billing_events`
- `membership_change_logs`

### 16.5 激活码涉及等级变化时必须先预览再确认

尤其是 `Starter -> Plus` 场景。

### 16.6 账单记录和会员变更记录不能混成一个列表

支付事实与权益变化是两套不同信息。

### 16.7 认证邮件必须跟语言路由保持一致

如果复用时保留多语言站点，必须同时保留：

- locale 透传
- 邮件模板多语言
- 回跳地址语言一致

## 17. 当前实现边界

### 17.1 密码策略当前存在轻微不一致

当前实现里：

- 登录页前端最小密码长度校验为 `6`
- 重置密码/修改密码为 `8`
- 注册最终设密更多依赖 Supabase 返回

如果后续复用并重做会员中心，建议统一成一套密码策略。

### 17.2 价格页与升级页都支持激活码

这是一条明确的产品规则，不建议删掉其中之一。

### 17.3 当前降级只支持 Plus -> Starter

如果未来支持更多降级路径，需要单独补策略和价值折算规则。

## 18. 建议复用方式

如果后续复用到新项目，建议拆成四层理解：

### A. UI 层

- 登录页
- 注册页
- 忘记密码页
- 设置页
- 升级页
- 价格页

### B. Auth 层

- Supabase Auth
- OAuth 回调
- OTP 确认
- 邮件模板

### C. Membership 层

- `subscriptions`
- `billing_events`
- `membership_change_logs`
- `activation_codes`
- `activation_code_redemptions`

### D. Risk Control 层

- 登录限流
- 注册发码限流
- 腾讯云验证码
- 登录日志

这样复用时可以按模块拆，而不是把整个会员中心硬拷贝。

## 19. 对应实现文件

主要代码入口如下：

- [apps/naviora-app/src/features/auth/auth-form.tsx](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/features/auth/auth-form.tsx)
- [apps/naviora-app/src/app/api/auth/login/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/auth/login/route.ts)
- [apps/naviora-app/src/app/api/auth/register/send-otp/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/auth/register/send-otp/route.ts)
- [apps/naviora-app/src/app/auth/callback/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/auth/callback/route.ts)
- [apps/naviora-app/src/app/auth/confirm/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/auth/confirm/route.ts)
- [apps/naviora-app/src/lib/services.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/services.ts)
- [apps/naviora-app/src/lib/billing/membership-server.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/billing/membership-server.ts)
- [apps/naviora-app/src/lib/supabase/billing-server.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/supabase/billing-server.ts)
- [apps/naviora-app/src/lib/supabase/billing-shared.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/supabase/billing-shared.ts)
- [apps/naviora-app/src/app/api/billing/checkout/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/billing/checkout/route.ts)
- [apps/naviora-app/src/app/api/billing/downgrade/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/billing/downgrade/route.ts)
- [apps/naviora-app/src/app/api/billing/redeem/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/billing/redeem/route.ts)
- [apps/naviora-app/src/app/api/billing/portal/route.ts](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/app/api/billing/portal/route.ts)

