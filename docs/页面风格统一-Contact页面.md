# Pricing 和 Contact 页面风格统一

## 目标
统一 Pricing 和 Contact 页面的设计风格，创建一致的品牌体验。

## 修改内容

### 1. 创建 Contact 页面
- 位置：`/apps/naviora-app/src/app/[locale]/(marketing)/contact/page.tsx`
- 设计风格与 Pricing 页面统一：
  - 使用 `max-w-6xl` 容器宽度
  - 添加背景渐变圆形装饰
  - 使用 `Badge` 组件显示标签
  - 卡片使用 `rounded-[30px]` 圆角
  - 卡片阴影：`shadow-[0_20px_40px_rgba(15,23,42,0.09)]`
  - 卡片边框：`ring-1 ring-[rgba(190,206,226,0.55)]`

### 2. 更新元数据配置
- 在 `metadata.ts` 中添加 contact 页面的元数据
- 支持三种语言：繁体中文、简体中文、英文
- 添加页面标题和描述

### 3. 更新导航菜单
- 在 messages 中更新导航链接，添加 "联络我们"/"联系我们"/"Contact"
- 在 MarketingHeader 组件中添加 contact 页面链接
- 导航链接现在包括：为什么 Naviora、核心能力、方案价格、帮助支持、联络我们

### 4. 设计统一要点

#### 容器样式
```tsx
// 统一容器
<div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-24">
  {/* 背景装饰 */}
  <div className="pointer-events-none absolute left-8 top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(120,191,255,0.22),transparent_70%)]" />
  <div className="pointer-events-none absolute bottom-16 right-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(143,124,255,0.16),transparent_70%)]" />
</div>
```

#### 卡片样式
```tsx
// 统一卡片
<article className="rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ring-[rgba(190,206,226,0.55)] bg-white/90">
  {/* 卡片内容 */}
</article>
```

#### 标题区域
```tsx
// 统一标题区域
<section className="mx-auto max-w-4xl text-center">
  <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
    {badgeText}
  </Badge>
  <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
    {title}
  </h1>
  <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
    {description}
  </p>
</section>
```

### 5. Contact 页面功能
- 三种联系方式：Email、微信、X
- 快速话题标签
- 帮助说明区域
- 相关页面链接（关于我们、返回首页）

### 6. 多语言支持
- 繁体中文：完整的本地化内容
- 简体中文：完整的本地化内容
- 英文：完整的本地化内容

## 技术实现

### 文件结构
```
apps/naviora-app/src/app/[locale]/(marketing)/
├── contact/
│   └── page.tsx          # 新的 Contact 页面
├── pricing/
│   └── page.tsx          # 现有的 Pricing 页面
├── support/
│   └── page.tsx          # 现有的 Support 页面
└── layout.tsx            # 营销页面布局
```

### 相关配置更新
1. `src/lib/metadata.ts` - 添加 contact 页面元数据
2. `src/i18n/messages.ts` - 更新导航链接
3. `src/components/layout/marketing-header.tsx` - 添加导航链接

## 测试要点
1. 访问 `/contact` 页面，检查布局和样式
2. 切换不同语言，验证多语言支持
3. 检查导航菜单中的 contact 链接
4. 验证页面元数据（标题和描述）
5. 测试响应式设计

## 设计原则
1. **一致性**：保持与 Pricing 页面相同的设计语言
2. **简洁性**：直接的联系方式，减少不必要的流程
3. **可用性**：清晰的视觉层次和操作指引
4. **品牌感**：统一的渐变、阴影和色彩系统