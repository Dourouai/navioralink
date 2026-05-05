# Supabase Auth 邮件模板说明

这份文档用于说明 `Naviora` 当前 Supabase Auth 邮件模板的维护方式，以及多语言是如何实现的。

## 1. 当前模板文件位置

模板文件放在：

- `supabase/email-templates/confirmation.html`
- `supabase/email-templates/magic-link.html`
- `supabase/email-templates/recovery.html`
- `supabase/email-templates/email-change.html`
- `supabase/email-templates/reauthentication.html`

应用脚本：

- `scripts/configure-supabase-auth-email-templates.mjs`

## 2. 当前覆盖的邮件类型

- `confirmation`
  用于邮箱确认 / signup confirmation
- `magic_link`
  当前主要承接注册验证码邮件
- `recovery`
  用于重置密码邮件
- `email_change`
  用于修改邮箱验证码
- `reauthentication`
  用于修改密码验证码

## 3. 当前多语言策略

当前模板使用 Supabase Auth 模板变量里的：

- `.Data.locale`

模板内根据 `.Data.locale` 分支：

- `zh-Hans`
- `zh-Hant`
- 其他默认走 `en`

### 3.1 哪些流程会带上 locale

当前代码里，以下流程已经显式把 locale 传到 Supabase Auth：

- 注册发送验证码
- 完成注册时写入 `user_metadata.locale`
- 登录后最佳努力同步 `user_metadata.locale`
- 修改邮箱前发送验证码
- 修改密码前发送 reauthentication 验证码

### 3.2 哪些流程主要依赖 redirectTo

以下流程的回跳地址本身已带 locale：

- 重置密码邮件
- resend signup confirmation 邮件

所以即便用户 metadata 里没有语言，回跳页面也仍能回到对应语言页面。

## 4. 应用模板到 Supabase

确保本地 `.env.local` 中至少有：

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SITE_URL`

执行：

```bash
set -a && source .env.local && node scripts/configure-supabase-auth-email-templates.mjs
```

## 5. 当前设计原则

- 邮件保持品牌统一，但不过度花哨
- 验证码类邮件优先突出 `{{ .Token }}`
- 链接类邮件优先突出主按钮和可复制 fallback link
- 所有模板默认支持：
  - 简体中文
  - 繁体中文
  - 英文

## 6. 维护建议

如果后续要继续增强，可以按这两个方向做：

1. 继续沿用 Supabase Dashboard / Management API 模板
   适合当前体量，维护最简单

2. 切到 Send Email Hook
   适合后续要做更复杂的场景，例如：
   - 更细粒度的多语言
   - A/B 文案
   - 更复杂的品牌主题
   - 根据渠道、国家、套餐发送不同版本

当前阶段，第一种已经足够，并且最省维护成本。
