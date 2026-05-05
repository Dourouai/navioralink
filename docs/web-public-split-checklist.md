# Naviora Web / Public 拆分实施清单

## 1. 目标架构

当前开始执行的目标结构只有 2 个发布面：

- `naviora-web`
  - 域名：`naviora.link`、`www.naviora.link`
  - 职责：官网、登录注册、工作台、设置、支付、文件、分析 UI
- `naviora-public`
  - 域名：`go.naviora.link`
  - 职责：公开入口、公开内容、preview、密码门、visit 写入

不再保留 `page.naviora.link`。

## 2. 统一公开路径

`go.naviora.link` 统一承载以下路径：

- `/l/:slug`
  - Web / landing page 入口
- `/s/:slug`
  - WhatsApp / social handoff 入口
- `/c/:slug`
  - Contact card / content 入口
- `/preview/:token`
  - 草稿 preview

后续可继续扩展：

- `/p/:slug`
  - PDF 内容
- `/v/:slug`
  - 邀请函内容
- `/b/:slug`
  - bio / profile 内容
- `/m/:slug`
  - 视频 / media 内容

## 3. 拆分原则

- 不做兼容层
- 不保留旧双域名公开结构
- 生产数据允许直接刷新
- 优先保证后续性能优化和长期维护成本

## 4. 代码归属

### 4.1 `naviora-web`

保留在 `web` 的内容：

- marketing 页面
- auth 页面
- dashboard 页面
- analytics UI
- settings
- files
- billing / pricing / refund / terms / privacy
- `/api/billing/*`
- `/api/creem/webhook`
- `/api/assets/*`
- `/api/auth/*`
- `/api/entries/save`

### 4.2 `naviora-public`

进入 `public` 的内容：

- `/l/[slug]`
- `/s/[slug]`
- `/c/[slug]`
- `/preview/[token]`
- 公开密码页 / 公开状态页
- 公开内容查询
- 公开语言切换
- 公开页用到的只读 Supabase 查询
- visit 写入与套餐访问限制

## 5. public 内部模块建议

`public` 从一开始就按长期内容平台组织：

- `entry`
  - slug 解析
  - rule matching
  - password gate
  - preview gate
  - visit logging
- `content`
  - 内容查询
  - 内容状态判断
  - preview 内容解析
- `renderers`
  - `vcard`
  - `pdf`
  - `invitation`
  - `video`
  - `profile`
- `templates`
  - 电子名片模板
  - 邀请函模板
  - 后续 PDF / 视频模板

## 6. 执行顺序

### Phase 1

- 将当前 `go` 代码面正式命名为 `naviora-public`
- 根 workspace 脚本改为 `web / public`
- 统一公开 URL 规则为 `/l / s / c`
- 移除 `page.naviora.link` 假设

### Phase 2

- 在 `public` 内补齐 `/s/[slug]`
- 在 `public` 内迁入 `/c/[slug]`
- 将 vCard 公开渲染迁入 `public`

### Phase 3

- 将 preview、密码页、状态页全部统一到 `public`
- 从 `web` 删除旧公开内容路由

### Phase 4

- 扩展 邀请函 / PDF / 视频 / bio / 多模板内容模式
- 按流量和复杂度决定是否把 `public` 再拆成 `page / go`

## 7. 环境变量边界

### `naviora-web`

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CREEM_*`
- `BREVO_*`
- `QWEN_*`
- `TENCENT_COS_*`

### `naviora-public`

- `NEXT_PUBLIC_GO_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TENCENT_COS_PUBLIC_BASE_URL`
- 公开访问所需的只读 / 安全变量

原则：

- `public` 不带支付、邮件、AI 配置
- `web` 不承接公开访问写链路

## 8. Smoke Test

每次发版至少验证：

- `www.naviora.link` 正常打开
- `go.naviora.link/l/*` 正常跳转
- `go.naviora.link/s/*` 正常 handoff
- `go.naviora.link/c/*` 正常展示内容
- `go.naviora.link/preview/*` 正常工作
- `entry_visits` 正常写入
- 聚合统计仍然增长

## 9. 当前仓库映射

当前仓库仍然保留：

- `apps/naviora-app`
  - 对应 `naviora-web`
- `apps/naviora-go`
  - 代码层正在收敛为 `naviora-public`

后续如需要，再把目录名从 `apps/naviora-go` 物理改成 `apps/naviora-public`。
