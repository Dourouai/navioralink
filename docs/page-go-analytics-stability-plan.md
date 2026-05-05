# Naviora Public / Analytics 稳定方案

## 1. 当前决策

Naviora 不再继续维护：

- `go.naviora.link`
- `page.naviora.link`

这套双公开域名结构。

新的目标结构是：

- `naviora-web`
  - `naviora.link`
  - `www.naviora.link`
- `naviora-public`
  - `go.naviora.link`
  - 承载 `/l / s / c / preview`

## 2. 为什么这样更稳

### 2.1 网站更新不再碰公开访问层

官网、工作台、支付、设置、文件、分析 UI 都留在 `web`。

公开访问全部进入 `public`：

- 入口跳转
- 内容展示
- 密码保护
- preview
- visit 写入

这样主站更新不会再影响公开入口和公开内容。

### 2.2 统计链路更简单

公开访问统一在一个域名和一个项目里：

- 不再有 `go -> page` 跨域
- 不再有 `page` 独立投放造成的归因混乱
- preview、密码门、访问记录、内容互动都可统一在 `public` 内处理

### 2.3 后续内容扩展更自然

后面新增：

- 邀请函
- PDF
- 视频
- bio / profile
- 电子名片多模板

都只需要继续扩 `public` 的 renderer 和 template，不需要再改项目边界。

## 3. 数据与统计原则

### 3.1 原始访问明细仍然是唯一真源

继续保留原始访问表：

- `entry_visits`

### 3.2 聚合表用于限额和分析

继续使用：

- `user_monthly_usage`
- `entry_visit_daily_totals`
- `entry_visit_daily_dimensions`

原则：

- `public` 写原始 visit
- dashboard 读聚合结果
- 原始明细只用于明细页和重建

### 3.2.1 模块归属建议

统计模块不建议整体迁移到 `public`。

建议边界如下：

- `public`
  - 负责采集：入口访问、内容访问、公开页互动事件
- `database`
  - 负责聚合：原始明细、日聚合、唯一访客、月用量
- `web`
  - 负责展示：Dashboard 分析页、访问明细、图表和导出

一句话口径：

- `public = collect`
- `database = aggregate`
- `web = render`

### 3.3 先保证写入不断，再做展示升级

性能与稳定优先级：

1. `public` 正常写 `entry_visits`
2. 套餐访问限制正常
3. 聚合表正常累加
4. dashboard 正常展示

## 4. 公开路径规范

- `/l/:slug`
  - web / landing page
- `/s/:slug`
  - WhatsApp / social handoff
- `/c/:slug`
  - contact card / content
- `/v/:slug`
  - invitation
- `/preview/:token`
  - 草稿 preview

## 5. 数据迁移原则

这次迁移不做兼容层。

执行规则：

- 不保留旧 `page.naviora.link`
- 不保留旧双域名统计口径
- 旧生产数据允许刷新
- 新口径从 `go.naviora.link` 统一开始累计

## 6. 维护建议

### 6.1 `web` 发版检查

只检查：

- 官网
- 登录注册
- dashboard
- billing
- analytics UI

### 6.2 `public` 发版检查

必须检查：

- `/l/*`
- `/s/*`
- `/c/*`
- `/preview/*`
- visit 写入
- 套餐限制
- 密码访问

### 6.3 数据健康检查

至少保留 2 组对账：

- `entry_visits` vs 日聚合总量
- `entry_visits` vs `user_monthly_usage.visit_count`

## 7. 后续再拆分的条件

只有在下面条件同时出现时，才考虑把 `public` 再拆成独立 `page / go`：

- `go` 流量已经明显高于内容页渲染流量
- `go` 需要更激进的缓存 / 限流 / 区域优化
- `content` 模板更新频率与 `entry` 跳转逻辑完全不同

在那之前，`web + public` 是性能和维护的最优平衡点。

## 8. 当前数据库优化优先级

在统一公开域名之后，数据库不需要推倒重来，但 `visit` 热路径和分析链路应按以下优先级持续优化：

### P0

- 唯一访客从“读取时扫原始 `entry_visits`”改为“写入时预聚合”
- 日志页总数与最近访问时间优先读取日聚合表，不再对原始 visit 做 `count exact`
- 合并 `visit` 写入后的多段 trigger，减少单次访问的同步数据库负担

### P1

- 为 `entry_visits` 增加 `visitor_fingerprint`
- 为 `entry_visits` 增加 `user_id` 冗余字段，减少 trigger 和权限查询中的 join 成本

### P2

- 后续邀请函、PDF、视频等内容模式不要继续全部塞进 `entry_targets` 的 `jsonb`
- 随着内容模式逐步上线，按类型拆成独立内容表与 renderer 查询链
