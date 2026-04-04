# 路由问题排查指南 (Troubleshooting Guide)

## 如果仍然看到 `/en` 前缀

### 第一步：确保旧进程已完全停止

1. **查看所有占用端口的进程**
   ```bash
   lsof -i :3000 2>/dev/null | grep -i node
   ```
   记下所有 node 进程的 PID

2. **杀死所有旧的 node 进程**
   ```bash
   # 替换 <PID> 为实际的 PID（可能有多个）
   kill -9 <PID>
   
   # 或者一次性杀死所有 node 进程
   killall -9 node
   ```

3. **清理 Next.js 缓存**
   ```bash
   cd "/Users/yancy/vide code/naviora"
   rm -rf .next
   rm -rf .next/dev/lock
   ```

4. **重新启动开发服务器**
   ```bash
   npm run dev
   ```

### 第二步：验证代码改动是否存在

检查以下文件是否包含最新的改动：

**1. middleware.ts 中是否有这一行？**
```typescript
if (pathname === "/") {
  return NextResponse.next();
}
```

**2. src/app/page.tsx 是否不是返回 null？**
应该包含实际的首页内容，不是：
```typescript
export default function RootPage() {
  return null;  // ❌ 错误！应该有实际内容
}
```

应该是：
```typescript
export default function RootPage() {
  const locale = "en" as const;
  const t = getMessages(locale);
  return ( /* 实际内容 */ )  // ✅ 正确
}
```

### 第三步：强制刷新浏览器

即使服务器重启了，浏览器可能仍有缓存：

- **Chrome/Edge**：按 `Ctrl+Shift+Delete` 打开清除浏览数据，清除"所有时间"的缓存
- **Safari**：按 `Cmd+Option+E` 打开清除缓存，选择所有历史记录
- **Firefox**：按 `Ctrl+Shift+Delete`

或者使用**硬刷新**：
- **Mac Chrome/Safari**：`Cmd+Shift+R`
- **Mac Firefox**：`Cmd+Shift+R`

### 第四步：检查 TypeScript 编译错误

```bash
cd "/Users/yancy/vide code/naviora"
npm run build 2>&1 | grep -E "(error|Error|✓|⨯)"
```

如果有任何错误，请告诉我错误信息。

## 预期行为

### ✅ 正确的情况
- 访问 `http://localhost:3000` → 地址栏显示 `/`，页面显示英文首页
- 访问 `http://localhost:3000/about` → 地址栏显示 `/about`，页面显示英文 about
- 访问 `http://localhost:3000/zh-Hant` → 地址栏显示 `/zh-Hant`，页面显示繁体首页
- 点击 CTA 按钮 → 跳转到 `/register` 或 `/login`（不是 `/en/register`）

### ❌ 错误的情况
- 访问 `/` 重定向到 `/en/` → **中间件有问题**
- 访问 `/` 显示白屏或 404 → **根页面有问题**
- 所有 `withLocale` 链接都显示 `/en/...` → **config.ts 中 `localePrefixless` 未设置正确**

## 代码验证清单

### config.ts 应该有这些行
```typescript
export const locales = ["zh-Hant", "zh-Hans", "en"] as const;
export const localePrefixless: Locale = "en";  // ← 这一行很关键！
```

### middleware.ts 应该有这段逻辑
```typescript
// Skip root path - it's served by src/app/page.tsx directly
if (pathname === "/") {
  return NextResponse.next();
}

// For other paths without locale prefix (/about, /pricing, /login, etc.)
// Rewrite internally to /en/... so they're served by [locale] routes
if (!pathname.startsWith("/.")) {
  const newPathname = `/en${pathname}`;
  return NextResponse.rewrite(new URL(newPathname, request.url));
}
```

### src/app/page.tsx 应该有这段代码
```typescript
export default function RootPage() {
  const locale = "en" as const;
  const t = getMessages(locale);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 md:pb-28">
      {/* 实际首页内容 */}
    </div>
  );
}
```

## 常见问题

**Q: 为什么还是显示 `/en` 前缀？**  
A: 通常是因为旧的 node 进程还在运行。需要 `kill -9 <PID>` 杀死后重启。

**Q: 清理缓存后仍然有问题？**  
A: 检查 `src/app/page.tsx` 是否真的有实际内容（不是返回 null）。

**Q: 为什么根页面显示白屏？**  
A: 检查是否有 TypeScript 编译错误。运行 `npm run build` 查看详细错误。

**Q: 为什么语言切换链接显示 `/en/...`？**  
A: 检查 `i18n/config.ts` 中的 `localePrefixless` 是否正确设置为 `"en"`。

## 获取帮助

如果仍有问题，请检查：
1. 终端的完整构建输出
2. 浏览器的开发者控制台是否有错误
3. 中间件是否真的被执行（可以通过添加 console.log 来调试）

最后的手段：删除所有 node_modules 并重新安装
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```
