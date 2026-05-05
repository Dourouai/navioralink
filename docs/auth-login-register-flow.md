# Naviora 认证流程说明

本文档用于梳理 `Naviora` 当前的登录、注册、Google 登录与绑定，以及各类异常分支处理逻辑，便于产品、测试与开发对齐。

## 1. 认证能力总览

当前已支持的认证能力包括：

- 邮箱密码登录
- 邮箱验证码注册
- Google OAuth 登录
- 登录后绑定 Google 账号
- 登录后解除 Google 绑定
- 忘记密码 / 重置密码
- 邮箱验证回调
- 更换登录邮箱
- 修改密码

当前认证系统基于：

- `Supabase Auth`
- `Next.js App Router`
- `locale-aware auth callback / confirm routes`

## 2. 页面入口

认证相关页面入口如下：

- `/[locale]/login`
- `/[locale]/register`
- `/[locale]/forgot-password`
- `/[locale]/reset-password`
- `/[locale]/verify-email`
- `/auth/callback`
- `/auth/confirm`

说明：

- 本地化路径 `/[locale]/auth/callback` 与 `/[locale]/auth/confirm` 仅作为桥接入口，最终会重定向到非 locale 的 `/auth/*` 路由，并附带 `locale` 查询参数。

## 3. 邮箱密码登录流程

### 3.1 主流程

1. 用户进入登录页。
2. 输入邮箱与密码。
3. 前端校验：
   - 邮箱格式合法
   - 密码长度至少 6 位
4. 提交后调用 `supabase.auth.signInWithPassword()`
5. 登录成功后，系统自动检查并补建用户 `profile`
6. 将登录态写入本地 `auth-store`
7. 跳转到对应语言的 `/dashboard`

### 3.2 成功结果

- 获得有效 session
- `profiles` 表中确保存在当前用户资料
- 用户进入工作台

### 3.3 异常分支

- 邮箱格式不合法：前端表单直接阻止提交
- 密码过短：前端表单直接阻止提交
- 邮箱或密码错误：显示 Supabase 返回错误
- 已登录用户访问登录页：服务端直接重定向到 Dashboard

## 4. 邮箱验证码注册流程

### 4.1 主流程

当前注册为三段式流程：

1. 输入邮箱
2. 验证邮箱验证码
3. 设置密码完成注册

### 4.2 详细步骤

#### Step 1：输入邮箱

1. 用户输入邮箱
2. 系统调用 `/api/auth/email-exists`
3. 后端检查当前邮箱是否已在 Supabase Auth 中存在

若邮箱不存在：

- 调用 `supabase.auth.signInWithOtp({ shouldCreateUser: true })`
- 向该邮箱发送验证码
- 页面进入验证码阶段

若邮箱已存在：

- 页面显示“该邮箱已注册”
- 提供“去登录”和“忘记密码”入口

#### Step 2：验证邮箱验证码

1. 用户输入验证码
2. 系统调用 `supabase.auth.verifyOtp({ type: "email" })`
3. 验证成功后补建 `profile`
4. 页面进入设置密码阶段

#### Step 3：设置密码并完成注册

1. 用户输入密码
2. 用户再次确认密码
3. 用户勾选条款
4. 系统调用 `supabase.auth.updateUser({ password, data: { locale } })`
5. 更新 `profile.default_locale`
6. 将 session 写入本地 `auth-store`
7. 跳转到 `/dashboard`

### 4.3 主流程特点

- 当前不是传统的“邮箱 + 密码直接注册后再邮件确认”
- 而是“先验证邮箱，再设置密码”
- 这样可以在注册完成前就确认邮箱可用性，减少脏账号

### 4.4 异常分支

- 邮箱为空：阻止发送验证码
- 邮箱格式不合法：接口层返回错误
- 邮箱已存在：提示用户登录或忘记密码
- 验证码为空：阻止验证
- 验证码错误或过期：显示 Supabase 错误
- 密码为空：阻止创建账号
- 两次密码不一致：阻止创建账号
- 未勾选条款：阻止创建账号
- 若密码复用旧值：显示“请设置一个新的密码”

## 5. Google 登录流程

### 5.1 主流程

Google 登录可从登录页或注册页发起，走的是同一条 OAuth 链路。

1. 用户点击 `Continue with Google`
2. 前端调用 `supabase.auth.signInWithOAuth({ provider: "google" })`
3. 用户跳转到 Google 授权页面
4. 授权完成后回到 `/auth/callback`
5. 回调路由执行 `exchangeCodeForSession(code)`
6. 拉取当前 user
7. 校验 user 与 email 是否存在
8. 自动查询或补建 `profile`
9. 跳转到 `/dashboard`

### 5.2 成功结果

- 获取有效 session
- 当前用户 profile 可用
- 成功进入工作台

### 5.3 异常分支

- Google 发起失败：页面显示错误
- 回调缺少 `code`：重定向回登录页并附带错误
- OAuth 返回 `error` / `error_description`：重定向回登录页并附带错误
- `exchangeCodeForSession` 失败：重定向回登录页
- Google 未返回可用邮箱：重定向回登录页并提示改用邮箱登录或更换账号
- `profile` 查询 / upsert 失败：重定向回登录页

## 6. Google 绑定流程

### 6.1 使用场景

用户已通过邮箱注册或邮箱登录后，可在设置中心将当前账号绑定到 Google，后续即可直接用 Google 登录同一账号。

### 6.2 主流程

1. 已登录用户进入设置中心
2. 在“登录方式 / Sign-in methods”区域点击 `绑定 Google`
3. 前端调用 `supabase.auth.linkIdentity({ provider: "google" })`
4. 用户跳转到 Google 授权页
5. 授权完成后回到 `/auth/callback`
6. 回调继续执行 `exchangeCodeForSession(code)`
7. 保持当前用户 session，并刷新 identity 列表
8. 设置中心显示 Google 已绑定

### 6.3 当前显示逻辑

- 系统通过 `supabase.auth.getUserIdentities()` 读取当前用户已绑定的身份提供商
- 当前会展示：
  - `email`
  - `google`

### 6.4 异常分支

- 用户未登录：无法读取或绑定 identities
- Supabase 未启用手动绑定能力：会返回 Supabase 错误
- 该 Google 已绑定当前账号或其他账号：会返回 Supabase 错误
- OAuth 回调失败：回登录页或回设置页并附带错误

说明：

- 当前版本已支持在设置中心绑定和解绑 Google
- 解除绑定前，账号至少还需要保留另一种可用登录方式

## 7. 忘记密码与重置密码流程

### 7.1 主流程

1. 用户在忘记密码页输入邮箱
2. 系统调用 `supabase.auth.resetPasswordForEmail()`
3. 用户收到 recovery 邮件
4. 点击邮件链接后进入 `/auth/confirm`
5. `confirm` 路由执行 `verifyOtp({ type: "recovery" })`
6. 验证成功后跳转到 `/reset-password`
7. 用户输入两次新密码
8. 调用 `supabase.auth.updateUser({ password })`
9. 成功后主动登出
10. 跳回登录页并显示成功提示

### 7.2 异常分支

- 邮箱格式不合法：前端阻止提交
- 邮件发送失败：页面直接报错
- recovery 链接失效：回登录页报错
- 新密码长度不足：前端阻止提交
- 两次密码不一致：前端阻止提交
- 更新密码失败：停留在重置密码页显示错误

## 8. 邮箱验证与通用确认回调

### 8.1 支持类型

`/auth/confirm` 当前支持以下 OTP 类型：

- `signup`
- `invite`
- `magiclink`
- `recovery`
- `email`
- `email_change`

### 8.2 通用逻辑

1. 校验 `token_hash` 与 `type`
2. 调用 `supabase.auth.verifyOtp`
3. 成功后补建 `profile`
4. 根据 `type` 决定最终跳转路径：
   - `recovery` -> `/reset-password`
   - 其他默认 -> `/dashboard`

### 8.3 安全规则

- `redirect_to` 仅接受同源地址
- `next` 仅接受以 `/` 开头的相对路径
- 避免开放重定向问题

## 9. 设置中心安全流程

### 9.1 更换登录邮箱

流程：

1. 输入当前密码
2. 验证当前密码
3. 输入新邮箱
4. 向新邮箱发送验证码
5. 输入验证码
6. 调用 `verifyOtp({ type: "email_change" })`
7. 更新当前账号邮箱

异常分支：

- 当前密码为空
- 当前密码错误
- 新邮箱格式非法
- 新邮箱与当前邮箱相同
- 验证码为空
- 验证码错误或失效

### 9.2 修改密码

流程：

1. 向当前邮箱发送验证码
2. 输入验证码
3. 输入两次新密码
4. 调用 `updateUser({ password, nonce })`

异常分支：

- 验证码为空
- 验证码发送失败
- 新密码长度不足
- 两次密码不一致
- 更新密码失败

## 10. 页面访问与已登录跳转规则

以下页面在用户已登录时会直接重定向到 Dashboard：

- `/login`
- `/register`
- `/forgot-password`
- `/verify-email`

说明：

- `/reset-password` 是例外，因为它需要承接 recovery 场景

## 11. 当前实现边界

当前认证模块已经形成完整可用闭环，但仍有一些边界：

- Google 绑定已支持，但前端暂未开放解绑入口
- 邮件体验依赖 Supabase + SMTP 配置正确
- 错误文案仍以 Supabase 返回信息为主，后续可继续做统一归类与本地化优化
- 多身份管理目前以 Google 为主，后续可再扩展更多 provider

## 12. 测试建议

建议优先验证以下路径：

1. 邮箱注册完整闭环
2. 注册时邮箱已存在分支
3. 验证码错误 / 过期分支
4. 邮箱密码登录
5. Google 登录
6. 登录后绑定 Google
7. 忘记密码 / 重置密码
8. 更换邮箱
9. 修改密码
10. 各类回调异常重定向
