# Supabase Auth + Brevo SMTP Setup

这份文档用来把 `Supabase Auth` 的系统邮件切到 `Brevo SMTP`，让这些流程能在真实环境工作：

- 注册验证邮件
- 重新发送验证邮件
- 忘记密码 / 重置密码
- 修改邮箱验证
- 修改密码前重新认证

## 1. 先在 Brevo 控制台准备什么

Brevo 控制台里，先准备这 3 类东西：

1. 发件域名
2. 发件人地址
3. SMTP Relay 凭证

### 1.1 发件域名

在 Brevo 里验证你的发件域名，例如：

- `naviora.link`

至少把域名验证完成，SPF / DKIM 都通过后再继续。

### 1.2 发件人地址

建议先用一个明确的系统发件地址：

- `hello@naviora.link`

后续如果你想把认证邮件和人工回复区分开，也可以换成：

- `no-reply@naviora.link`
- `support@naviora.link`

### 1.3 SMTP Relay 凭证

在 Brevo 里生成 SMTP Relay 用户名和密码。你最终会拿到：

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: `BREVO_SMTP_LOGIN`
- Password: `BREVO_SMTP_PASSWORD`

这组凭证是给 `Supabase Auth` 用的，不是给前端用的。

## 2. 本地和 Vercel 环境变量怎么填

把这些变量同时配置到本地 `.env.local` 和 Vercel 对应环境里：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_SITE_URL=https://naviora.link
SUPABASE_AUTH_URI_ALLOW_LIST=http://localhost:3001/**,https://naviora.link/**,https://*.vercel.app/**

BREVO_SENDER_EMAIL=hello@naviora.link
BREVO_SENDER_NAME=Naviora
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_LOGIN=
BREVO_SMTP_PASSWORD=
```

说明：

- `SUPABASE_PROJECT_REF`
  - 就是 Supabase 项目的 `project ref`
- `SUPABASE_ACCESS_TOKEN`
  - Supabase 个人访问令牌，用来调用 Management API
- `BREVO_SENDER_EMAIL`
  - 认证邮件真正显示给用户的发件邮箱
- `BREVO_SMTP_LOGIN / BREVO_SMTP_PASSWORD`
  - Brevo 里拿到的 SMTP Relay 凭证

## 3. Brevo 控制台逐项核对

你在 Brevo 里重点核对这些值：

### 3.1 Domain / Sender

- Sending domain: `naviora.link`
- Sender email: `hello@naviora.link`
- Sender name: `Naviora`
- Reply-to email:
  - 可以先留空
  - 或填 `support@naviora.link`

### 3.2 SMTP Relay

- SMTP server: `smtp-relay.brevo.com`
- Port: `587`
- Login: 复制到 `BREVO_SMTP_LOGIN`
- Master password / SMTP password: 复制到 `BREVO_SMTP_PASSWORD`

### 3.3 当前阶段建议

- 先不要用营销活动发信流程
- 认证邮件只走 Transactional / SMTP
- 不要把认证邮件模板做成营销样式

## 4. 用脚本把 SMTP 配到 Supabase Auth

在项目根目录运行：

```bash
cd "/Users/yancy/vide code/naviora"
npm run supabase:auth:smtp
```

这个脚本会通过 Supabase Management API 更新：

- `external_email_enabled = true`
- `mailer_secure_email_change_enabled = true`
- `mailer_autoconfirm = false`
- `smtp_admin_email`
- `smtp_sender_name`
- `smtp_host`
- `smtp_port`
- `smtp_user`
- `smtp_pass`
- `site_url`
- `uri_allow_list`

## 5. Supabase 控制台逐项核对

Supabase 控制台里，重点看 3 个区域：

- Auth > Providers / Sign In
- Auth > URL Configuration
- Auth > Email Templates

### 5.1 Auth > Providers / Sign In

把这些状态核对一遍：

- Email provider: `Enabled`
- Confirm email: `Enabled`
- Secure email change: `Enabled`

推荐这样配：

- 注册需要点邮件完成验证
- 改邮箱需要邮件确认
- 重置密码通过 recovery 邮件完成

### 5.2 Auth > URL Configuration

推荐填写：

- Site URL:
  - `https://naviora.link`

- Redirect URLs:
  - `http://localhost:3001/**`
  - `https://naviora.link/**`
  - `https://*.vercel.app/**`

如果你后面要更严格地区分 Preview，也可以把最后一项换成你自己的 Vercel preview 模式，例如：

- `https://*-yancytien-7809s-projects.vercel.app/**`

### 5.3 Auth > Email Templates

这里最容易填错。你当前项目代码不是让邮件直接跳用户页面，而是先统一进：

- `/auth/confirm`

再由应用自己判断：

- 是注册验证
- 还是 recovery
- 最后再跳到对应页面

所以模板链接要这样填。

#### Email OTP / Magic link 模板

当前注册页已经改成：

- 输入邮箱
- 发送验证码
- 输入验证码
- 再设置密码

所以这里最重要的不是确认链接，而是让用户邮件里能看到验证码。

在 `Magic link` 模板里：

- 保留必要品牌文案
- 正文中明确展示 `{{ .Token }}`

推荐正文示例：

```text
Use this verification code to continue creating your account: {{ .Token }}
```

如果你还保留按钮，也可以一起放，但注册页最核心的是让用户看见这组验证码。

#### 注册验证 / Email confirmation 模板链接

按钮或链接地址：

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}
```

#### 密码重置 / Recovery 模板链接

按钮或链接地址：

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}
```

这会配合你项目里的：

- `/reset-password`

### 5.4 修改邮箱 / 修改密码验证码模板

你当前设置页是“输入验证码”的交互，不是只点链接。

所以这两类模板正文里一定要包含 `{{ .Token }}`。

#### Change email 模板正文建议

```text
Use this verification code to confirm your new email: {{ .Token }}
```

#### Reauthentication 模板正文建议

```text
Use this verification code to continue changing your password: {{ .Token }}
```

## 6. 这套配置和你当前代码怎么对应

当前代码里实际使用的是：

- 注册验证入口：
  - `register()` in `/src/lib/services.ts`
- 重发验证：
  - `resendVerificationEmail()` in `/src/lib/services.ts`
- 重置密码：
  - `requestPasswordReset()` in `/src/lib/services.ts`
- 邮件确认回调：
  - `/src/app/auth/confirm/route.ts`

注意：

- 本地开发端口现在是 `3001`
- `confirm` 路由会优先从 `redirect_to` 里推断语言
- 所以即使邮件模板没有单独带 `locale` 参数，也能按你的目标页面语言回跳

## 7. 本地测试流程

1. Start the app locally:

```bash
npm run dev -- --port 3001
```

2. Test sign-up:
- create an account
- open the email
- click the confirmation link

3. Test forgot password:
- go to `/forgot-password`
- request a reset email
- open the link
- set a new password

4. Test settings:
- request email change code
- request password reauthentication code

## 8. 当前邮件相关路由

- confirm route: `/auth/confirm`
- OAuth callback: `/auth/callback`
- verify email page: `/{locale}/verify-email`
- forgot password page: `/{locale}/forgot-password`
- reset password page: `/{locale}/reset-password`
