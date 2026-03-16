# Smart QR 前端需求补充与 UI 风格参考（V1 Addendum）

本文档用于补充《Smart QR 前端需求文档 V1》，目标是让 Codex 能按统一标准稳定开发，减少返工。

## 1. 文档定位

- 主文档：定义业务范围与页面目标。
- 本补充：定义实现边界、交互规则、接口契约、视觉规范、验收标准。

## 2. V1 实现边界（冻结）

- 仅支持 `URL 动态二维码`。
- 规则模式仅有三种：`none | language | region`，且互斥。
- AI 模型为 `Qwen 3.5 Plus`，只负责生成草稿，不直接保存最终二维码。
- 支持两套语言文案：`zh-Hant`、`en`。
- 前端必须先通过 mock 数据跑通完整闭环，再接真实 API。

## 3. 补充业务规则

## 3.1 路由与登录态

- 未登录可访问：`/`、`/login`、`/register`。
- 已登录可访问：`/dashboard`、`/qrs`、`/qrs/new`、`/analytics`。
- 未登录访问后台路由时，统一重定向到 `/login`。
- 登录成功后统一跳转 `/dashboard`。
- 注册成功后 V1 直接进入 `/dashboard`（如后续改为跳 `/login`，在配置层切换）。

## 3.2 二维码草稿规则

- `defaultUrl` 为必填。
- `ruleMode=none` 时，只保留 `defaultUrl` 作为有效跳转。
- `ruleMode=language` 时，只允许编辑 `languageRules`，`regionRules` 在提交时清空。
- `ruleMode=region` 时，只允许编辑 `regionRules`，`languageRules` 在提交时清空。
- 每条规则必须满足：`key 不为空` + `url 为合法 URL`。
- Tracking、Password、Folder、Expiration Date 在 V1 为“结构可填写”，不要求后端真实生效。

## 3.3 新增二维码三步流状态机

- Step1（对话）可反复发送消息。
- 仅当 `defaultUrl` 存在时，Step1 的“进入确认”按钮可高亮可点。
- Step2（确认草稿）可返回 Step1 补充信息。
- Step2 -> Step3 前执行一次草稿校验。
- Step3（设计）点击“生成二维码”触发提交；成功后跳转 `/qrs` 并显示成功提示。
- 任一步骤切换都不能丢失已输入状态（使用 store 持久当前会话）。

## 3.4 管理页规则

- 搜索默认按 `name`、`defaultUrl` 模糊匹配。
- 删除操作必须二次确认。
- 编辑入口先复用 `/qrs/new?id=xxx`。
- 列表为空时必须显示 Empty State 和“新增二维码”按钮。

## 4. 前端状态与错误处理补充

## 4.1 通用状态组件

统一使用四类页面状态：

- `loading`: 骨架屏或占位卡片
- `empty`: 空态插画 + 引导 CTA
- `error`: 错误文案 + 重试按钮
- `success`: 轻量 toast 或页面内提示

## 4.2 错误文案建议（V1）

- 登录失败：`邮箱或密码错误，请重试`
- 注册失败：`注册失败，请稍后再试`
- AI 响应失败：`AI 暂时不可用，请稍后重试`
- 保存失败：`保存失败，请检查必填项`
- 生成失败：`生成失败，请稍后重试`

## 5. Mock API 契约（建议）

为减少联调成本，mock service 统一返回：

```ts
type ApiResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
};
```

建议覆盖接口：

- `login(payload)`
- `register(payload)`
- `getDashboardStats()`
- `getQrList(params)`
- `getAnalyticsOverview()`
- `chatWithAI(messages)`
- `saveQrDraft(payload)`
- `createQr(payload)`
- `updateQr(id, payload)`
- `deleteQr(id)`

## 6. 埋点（前端预留）

V1 可先用 `console` 或 mock tracker 占位，事件名先固定：

- `auth_login_submit`
- `auth_register_submit`
- `dashboard_click_create_qr`
- `qr_create_ai_send`
- `qr_create_enter_review`
- `qr_create_review_continue`
- `qr_create_generate_submit`
- `qr_list_search`
- `qr_list_delete_confirm`
- `analytics_view_loaded`

## 7. UI 风格参考（落地规范）

## 7.1 视觉方向关键词

- Light SaaS
- Blue + Teal 主色，少量 Violet 点缀
- 玻璃感卡片（glass/surface）
- 圆角偏大、层级清晰、信息密度中高
- 不使用暗黑 Web3、不过度霓虹

## 7.2 设计 Token（与当前实现对齐）

```css
--background: #f6f9fe;
--background-soft: #edf5ff;
--surface: rgba(255, 255, 255, 0.86);
--foreground: #152238;
--muted: #6b7b90;
--border: rgba(190, 206, 226, 0.4);
--primary: #14aaf5;
--primary-strong: #3777ff;
--accent: #8a7cff;
--success: #0f9f6e;
--warning: #d29a18;
--danger: #dc4c52;
```

```css
--radius-xl: 28px;
--radius-lg: 22px;
--radius-md: 16px;
--shadow-card: 0 24px 60px rgba(31, 55, 92, 0.08);
--shadow-soft: 0 12px 30px rgba(31, 55, 92, 0.05);
```

字体建议：`Plus Jakarta Sans` + `Noto Sans TC`。

## 7.3 布局规范

- Marketing 页面：顶部简洁导航 + Hero + 模块化内容区。
- App 页面：左侧导航 + 顶部条 + 内容容器。
- 内容最大宽度：`max-w-[1600px]`（App Shell）。
- 卡片优先使用圆角 + 浅边框 + 软阴影，避免硬边框和厚重阴影。

## 7.4 组件样式原则

- Button：主按钮使用蓝青渐变，次按钮使用白底描边。
- Input：默认浅边框，focus 态提升到 `sky` 色。
- Card：优先 `glass-panel` 或 `surface-panel`，保持白底可读性。
- Badge：用于状态和标签，不承载长文本。
- Table/List：行高舒展，操作按钮右侧对齐，hover 有轻背景变化。

## 7.5 动效规范

- 只保留必要动效：`fade-up` 进入、按钮 hover、卡片轻微过渡。
- 时长建议：`180ms ~ 320ms`。
- 避免大范围复杂动画，保证后台页稳定可读。

## 7.6 图表风格

- 趋势线使用主色蓝系，辅助线使用浅灰。
- Tooltip 与卡片风格一致（圆角 + 浅边框）。
- 不使用高饱和多色并列，Top 排行可用 1 主色 + 2 辅色。

## 7.7 响应式规则

- `>=1280px`：双栏完整布局（新建二维码页显示右侧辅助区）。
- `768px ~ 1279px`：部分区域单栏堆叠，保留关键信息顺序。
- `<768px`：表格可转卡片，CTA 固定在可见区域，输入区可完整操作。

## 8. 页面级补充验收（精简版）

- 首页：首屏 5 秒内可理解产品价值，CTA 清晰。
- 登录/注册：校验完整、错误提示明确、提交流程可感知 loading。
- 工作台：统计卡 + 最近二维码 + 快捷入口完整可点。
- 新增二维码：三步切换完整，状态不丢失，可触发生成动作。
- 管理二维码：搜索、删除确认、编辑入口可用，空态完整。
- 分析统计：总览卡、7 天趋势、Top 列表均能展示 mock 数据。

## 9. 给 Codex 的执行约束（建议直接复用）

- 先页面骨架，再交互，再 mock 串联，再真实接口。
- 新增文案必须同步双语字典。
- 重复 UI 优先抽组件，不在页面内复制粘贴结构。
- 不引入 V1 范围外二维码类型和高级配置。
- 每完成一个阶段，必须可访问、可点击、可继续迭代。

## 10. Definition of Done（V1）

- 所有目标路由可访问。
- 登录态与路由守卫可运行。
- 新增二维码三步流完整闭环（含 mock AI）。
- 管理页和统计页可展示并操作 mock 数据。
- 样式符合统一视觉规范，不出现明显风格漂移。
