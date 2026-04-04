# 解决 404 问题 - 完整指南

## 问题
访问 `/pricing` 等页面显示 404 错误

## 原因分析
这通常是因为：
1. **开发服务器缓存**：中间件改动没有被重新加载
2. **Next.js lockfile**：`.next/dev/lock` 阻止新的 dev 进程启动
3. **浏览器缓存**：旧的 404 响应被缓存

## 完整解决步骤

### 第一步：强制关闭所有旧进程
```bash
# 查找所有占用 3000-3010 端口的进程
lsof -i :3000,:3001,:3002,:3003,:3004,:3005 2>/dev/null | grep node

# 逐个杀死（替换对应的 PID）
kill -9 <PID1>
kill -9 <PID2>

# 或者一次性杀死所有 node 进程
killall -9 node 2>/dev/null || true
```

### 第二步：完全清理 Next.js 缓存
```bash
cd "/Users/yancy/vide code/naviora"

# 删除所有构建和开发缓存
rm -rf .next .next/dev .next/dev/lock

# 删除 node_modules 中的缓存（可选，但推荐）
# rm -rf node_modules/.cache
```

### 第三步：重新启动开发服务器
```bash
npm run dev
```

**重要**：等待看到这些输出：
```
✓ Starting...
✓ Ready in Xs
Get /pricing 2XXms
```

### 第四步：清理浏览器缓存
在浏览器中清除所有缓存：

**Chrome/Edge:**
- 按 `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
- 选择"所有时间"
- 勾选"Cookie"和"缓存的图片和文件"
- 点击清除

**Safari:**
- 按 `Cmd+Option+E`
- 选择时间范围和要清除的项目
- 点击清除历史记录

**Firefox:**
- 按 `Ctrl+Shift+Delete`
- 选择要清除的时间范围

### 第五步：验证
访问以下 URL，应该都能正常显示（不是 404）：

```
http://localhost:3000               ✅ 英文首页
http://localhost:3000/about         ✅ 关于页面
http://localhost:3000/pricing       ✅ 定价页面
http://localhost:3000/login         ✅ 登录页面
http://localhost:3000/register      ✅ 注册页面
http://localhost:3000/zh-Hant       ✅ 繁体首页
http://localhost:3000/zh-Hant/about ✅ 繁体关于
```

## 如果仍然有问题

### 问题 1：仍然显示 404
**可能原因**：中间件没有加载或 rewrite 不工作

**解决方案**：
```bash
# 检查中间件是否被正确编译
cat "/Users/yancy/vide code/naviora/.next/server/middleware.js" | head -20

# 查看构建输出中是否有 Proxy (Middleware) 标记
cd "/Users/yancy/vide code/naviora" && npm run build 2>&1 | grep -i "proxy\|middleware"
```

### 问题 2：dev 进程仍然无法启动
**可能原因**：还有其他 node 进程占用端口或有锁文件

**解决方案**：
```bash
# 用不同的端口启动
cd "/Users/yancy/vide code/naviora"
npm run dev -- -p 3005

# 访问 http://localhost:3005/pricing
```

### 问题 3：显示空白页或其他错误
**可能原因**：页面文件损坏或导入错误

**解决方案**：
```bash
# 检查页面文件是否存在
find "/Users/yancy/vide code/naviora/src/app" -path "*pricing*" -type f

# 验证没有 TypeScript 错误
cd "/Users/yancy/vide code/naviora"
npm run build 2>&1 | grep -i "error"
```

## 中间件工作原理图

```
用户访问 /pricing
    ↓
中间件检查 pathname === "/pricing"
    ↓
不是根路径，继续
    ↓
检查是否有 locale 前缀（/en, /zh-Hant, /zh-Hans）
    ↓
没有前缀，检查 firstSegment === "en"
    ↓
否，检查 hasLocalePrefix
    ↓
否，进入最后的条件
    ↓
!pathname.startsWith("/.") → true
    ↓
rewrite 到 /en/pricing
    ↓
Next.js 匹配 [locale]/(marketing)/pricing/page.tsx （locale="en"）
    ↓
显示定价页面 ✅
    ↓
浏览器地址栏显示 /pricing
```

## 验证部署成功

如果上述所有步骤完成后仍有问题，可以运行生产构建来验证：

```bash
cd "/Users/yancy/vide code/naviora"

# 生产构建
npm run build

# 启动生产服务器
npm run start
```

生产服务器通常更稳定，如果在生产环境中能正常工作，说明代码是对的，开发环境只是需要清理。

## 最后的核对清单

- [ ] 所有 node 进程已杀死
- [ ] `.next` 目录已删除
- [ ] `.next/dev/lock` 文件已删除
- [ ] `npm run dev` 已启动并显示 "Ready"
- [ ] 浏览器缓存已清除
- [ ] 浏览器已硬刷新（Cmd+Shift+R）
- [ ] `/pricing` 能正常访问
- [ ] 地址栏显示 `/pricing` 而不是 `/en/pricing`
