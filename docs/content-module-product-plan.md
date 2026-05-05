# Naviora 内容模块产品需求计划

本文档用于规划 `Naviora` 在统一公开域名 `go.naviora.link` 下的后续内容模块扩展路线，作为产品设计、技术实现、路径命名、数据建模和模板系统演进的基础文档。

---

## 1. 文档定位

- 文档类型：`产品需求计划 / 内容模块路线图`
- 文档目标：
  - 明确后续内容模块的产品边界与优先级
  - 统一公开路径前缀规则
  - 让 `web / public` 技术架构与内容类型扩展保持一致
  - 为后续模板系统、媒体能力、分析能力和商业化能力提供规划基线

说明：

- 本文档描述的是 `后续规划`，不代表当前版本已经全部上线。
- 当前已经上线的内容模块只有 `电子名片 / vCard`。
- 本文档中的路径统一按最终公开域名规划描述：`https://go.naviora.link/{prefix}/{slug}`。

---

## 2. 内容模块总体规划

### 2.1 产品目标

Naviora 不应只停留在“二维码跳转工具”，而应逐步发展成一个统一的 `Smart Entry + Public Content` 平台。

用户最终可以通过同一套入口创建流程，承载不同的公开内容形式，例如：

- Web / Link 页面
- WhatsApp / IM 导流
- 电子名片
- 邀请函
- PDF 落地页
- 视频内容页
- Bio / Profile 页面

### 2.2 架构原则

- 入口层与内容层继续统一放在 `naviora-public`
- 公开访问统一挂在 `go.naviora.link`
- 内容类型通过路径前缀区分，而不是通过多域名区分
- 内容模块扩展时，优先复用：
  - 现有 Entry 模型
  - 现有 preview 流程
  - 现有密码访问能力
  - 现有访问统计能力
  - 现有媒体库能力

### 2.3 路径前缀规划

当前已经确定：

- `/l/:slug`
  - Web / Link
- `/s/:slug`
  - WhatsApp / social handoff
- `/c/:slug`
  - Contact card / 电子名片

后续规划中，优先新增：

- `/v/:slug`
  - Invitation / 邀请函

说明：

- 这里的 `V` 指产品模块代号，实际公开 URL 建议继续使用小写：`/v/:slug`
- 这样可以保持与现有 `/l /s /c` 统一的 URL 习惯
- `video` 不再占用 `v`，后续如果要支持视频，建议重新分配独立前缀，例如：
  - `/m/:slug` = media / video
  - 或 `/video/:slug` = 可读性优先

---

## 3. 模块路线优先级

建议后续内容模块优先级如下：

1. `Invitation / 邀请函`
2. `PDF / 下载内容页`
3. `Bio / Profile`
4. `Video / Media`
5. `更多电子名片模板`

原因：

- 邀请函是非常适合二维码传播的内容形态，天然适合婚礼、活动、发布会、品牌快闪等场景
- 邀请函对视觉模板、媒体素材、时间地点和 RSVP 的需求明确，容易做出差异化
- 它可以直接复用现有 `public content renderer` 思路
- 与 vCard 一样，邀请函更偏“展示型落地页”，不会破坏当前入口模型

---

## 4. 邀请函模块产品定义

### 4.1 模块名称

- 中文：`邀请函`
- 英文：`Invitation`
- 路径代号：`V`
- URL 前缀：`/v/:slug`

### 4.2 模块定位

邀请函模块用于承载“一个可公开访问、适合分享、可扫码打开的活动邀请页面”，强调：

- 信息清晰
- 视觉氛围
- 传播便利
- 可选互动

目标不是做“复杂活动系统”，而是先做一个轻量、可模板化、可分享的 `Invitation Landing Page`。

### 4.3 核心使用场景

第一阶段重点场景：

- 婚礼邀请函
- 活动邀请函
- 品牌活动 / 展会邀请函
- 发布会 / 沙龙邀请函
- 私人聚会 / 生日派对邀请函

第二阶段可扩展：

- 企业会议签到邀请
- VIP 客户活动邀约
- 发布会报名页
- 课程 / workshop 邀请页

---

## 5. 邀请函 MVP 范围

### 5.1 页面核心结构

邀请函 MVP 建议至少支持以下模块：

1. 封面主视觉
2. 标题 / 副标题
3. 活动时间
4. 活动地点
5. 活动说明
6. CTA 按钮
7. 底部品牌标识与语言切换

### 5.2 字段建议

基础字段：

- `title`
- `subtitle`
- `event_type`
- `start_at`
- `end_at`
- `timezone`
- `venue_name`
- `venue_address`
- `description`
- `cover_asset_id`
- `poster_asset_id`
- `theme_id`

可选字段：

- `cta_label`
- `cta_url`
- `map_url`
- `contact_name`
- `contact_phone`
- `contact_email`
- `notes`

### 5.3 页面能力

MVP 建议支持：

- 公开访问
- 多语言文案
- 主题模板切换
- 背景图 / 封面图
- 一键复制或分享邀请链接
- 支持密码访问
- 支持草稿 preview

---

## 6. 邀请函第二阶段能力

MVP 上线稳定后，再考虑增加：

- RSVP / 报名按钮
- 访客人数选择
- 简单表单收集
- 日历导入
- 地图嵌入
- 图集 / 相册
- 倒计时组件
- 着装要求 / 活动须知模块
- 多模板主题市场

这里建议明确边界：

- MVP 先做“展示型邀请函”
- 第二阶段再做“互动型邀请函”

---

## 7. 技术建模建议

### 7.1 Entry 层

邀请函仍然应被建模为一个普通 Entry，而不是独立产品系统。

建议：

- `entries.target_type = invitation`
- 对外公开路径：
  - `https://go.naviora.link/v/:slug`

### 7.2 内容层

建议单独增加邀请函内容表，例如：

- `invitation_pages`
  - `entry_id`
  - `title`
  - `subtitle`
  - `event_type`
  - `start_at`
  - `end_at`
  - `timezone`
  - `venue_name`
  - `venue_address`
  - `description`
  - `cover_asset_id`
  - `poster_asset_id`
  - `theme_id`
  - `cta_label`
  - `cta_url`
  - `map_url`

如果后续模板复杂度增加，可以继续拆：

- `invitation_sections`
- `invitation_theme_settings`
- `invitation_rsvp_records`

### 7.3 Renderer 层

建议在 `naviora-public` 内新增：

- `src/features/invitation/`
- `src/app/v/[slug]/page.tsx`

内部结构建议：

- `invitation-public-page-server.tsx`
- `invitation-theme-registry.ts`
- `invitation-section-renderers.tsx`
- `invitation-public-language-switcher.tsx`

---

## 8. 媒体与模板能力

邀请函会显著依赖媒体能力，因此建议直接复用当前媒体库：

- 封面图从媒体库选择
- 海报图从媒体库选择
- 后续支持更多展示图

模板系统建议一开始就预留：

- `Classic`
- `Elegant`
- `Playful`
- `Minimal`

但第一版不需要开放太多模板数量，重点是：

- 模板结构稳定
- 设计视觉足够精致
- 移动端展示优先

---

## 9. 统计与访问能力

邀请函模块建议沿用当前的统一统计原则：

- 入口访问仍记录到 `entry_visits`
- 邀请函页面访问可后续增加内容层行为埋点
- MVP 对外先不单独做复杂漏斗

第一阶段建议只展示：

- 总访问量
- 最近访问趋势
- 关键动作点击量

如果第二阶段加入 RSVP，再扩展：

- RSVP 提交量
- CTA 点击量
- 地图点击量

---

## 10. 商业化建议

邀请函模块天然适合作为付费能力的强化点。

建议：

- Free：
  - 基础邀请函模板
  - 基础公开访问
- Starter：
  - 更多模板
  - 密码访问
  - 更高访问上限
- Plus：
  - 品牌化页脚控制
  - 自定义域名
  - 高级 RSVP / 表单能力

---

## 11. 当前结论

邀请函模块非常适合作为 `Naviora public content` 的下一个重点扩展模块。

明确结论如下：

- 该模块应纳入 `内容模块路线图`
- 路径代号确定为 `V`
- 实际 URL 前缀采用：
  - `https://go.naviora.link/v/:slug`
- 它属于 `naviora-public` 的内容承载能力，不应回到 `web`
- MVP 先做展示型邀请函，再逐步扩展互动能力

这条路线可以让 Naviora 从 `Smart QR / Smart Entry` 更自然地扩展成一个更丰富的公开内容平台。
