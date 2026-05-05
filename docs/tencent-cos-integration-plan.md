# 腾讯云 COS 对接方案

## 1. 目标

给 Naviora 增加正式的对象存储能力，用于承接：

- vCard 头像与图片库
- QR 自定义 Logo
- 后续博客图片、Payload 媒体库
- 后续 PDF / 下载文件/电子邀请函
目标不是单纯“能上传文件”，而是建立一条可持续的资产链路：

- 文件存 COS
- 元数据存 Supabase `public.assets`
- 页面按权限读取公开地址或签名地址
- 计入当前套餐里的存储额度

---

## 2. 当前项目现状

### 2.1 已经有的基础

- 数据库已经有 [`public.assets`](/Users/yancy/vide%20code/Zaps/supabase/migrations/20260405143000_initial_app_schema.sql) 表，且 `provider` 默认就是 `cos`
- 套餐页和设置页已经有“存储空间”额度展示，且现在会直接汇总 `assets.size_bytes`，见 [`billing-server.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/supabase/billing-server.ts)
- vCard 和 QR 创建流程都已经有“上传图片 / Logo”的 UI

### 2.2 当前缺口

- vCard 图片现在只是存在浏览器 `localStorage`，见 [`vcard.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/vcard.ts)
- vCard 图片资产结构仍是 `dataUrl`，不是正式文件地址，见 [`qr.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/types/qr.ts)
- QR 自定义 Logo 现在也是前端读文件后直接塞进 `design.logoUrl`
- `assets` 表目前只被“存储空间统计”读取，还没有进入真实上传链路

这意味着：

- 当前上传内容刷新浏览器、换设备、换账号后不可持续
- 无法支撑 Payload 博客、媒体库、后台运营查看文件
- 无法真正吃到现在套餐里的“存储空间”限制

---

## 3. 推荐架构

结论先说：**采用“服务端签发上传凭证 + 浏览器直传 COS + Supabase 记录元数据”的模式。**

不要走下面这两种：

- 不要把 COS `SecretId / SecretKey` 直接放前端
- 不要让 Vercel Function 代传大文件到 COS

原因：

- 前者不安全
- 后者会把 Vercel 变成上传中转站，增加带宽、时延和函数负担

腾讯云 COS 官方文档本身也更偏向：

- 使用临时密钥 / STS
- 前端通过 SDK 直传 COS
- Bucket 配置跨域规则

---

## 4. 建议的分层

### 4.1 存储真相源

- **文件真相源**：腾讯云 COS
- **业务真相源**：Supabase `public.assets`

Supabase 负责：

- 文件属于谁
- 文件属于什么业务场景
- 文件大小、类型、路径、可见性
- 当前是否被 entry / vCard / blog 引用

COS 负责：

- 真正存储文件二进制
- 返回对象地址
- 处理上传、下载、删除

### 4.2 读写模型

建议采用“双权限模型”：

- `public`：公开内容页会直接使用的资产
  - vCard 头像
  - vCard 图片
  - QR 自定义 Logo
  - 博客图片
- `private`：仅后台或受保护下载使用
  - 后续 PDF
  - 用户私有文件
  - 内部素材

和旧文档里“默认全 private”相比，这里做一个性能优先调整：

- **公开页面要展示的图片，直接走公开读地址**
- **私有文件继续走签名读地址**

这样能避免：

- 每次打开 `page.naviora.link` 都先服务端签名一遍图片
- 公共名片页加载慢
- 缓存命中率低

---

## 5. Bucket 与路径建议

首发阶段我建议先用 **1 个 Bucket + 规范前缀**，而不是一上来拆 3 个 Bucket。

推荐：

- Bucket：`naviora-assets-<appId>`

对象路径建议：

- `public/vcard/<userId>/<assetId>-<fileName>`
- `public/qr-logo/<userId>/<assetId>-<fileName>`
- `public/blog/<userId>/<assetId>-<fileName>`
- `private/documents/<userId>/<assetId>-<fileName>`
- `private/internal/<userId>/<assetId>-<fileName>`

这样做的好处：

- 配置最少
- 迁移最简单
- 未来如果要拆 Bucket，也可以按前缀平滑迁出

如果后期文件量显著增长，再升级成：

- `naviora-public-assets`
- `naviora-private-assets`

---

## 6. 域名建议

建议额外准备一个资源域名：

- `assets.naviora.link`

用途：

- 承接公开图片资源
- 后续接 CDN 更自然
- 避免未来把 COS 默认域名直接暴露到产品里

建议关系：

- `page.naviora.link`：公开内容页
- `go.naviora.link`：短链跳转
- `assets.naviora.link`：公开静态资源

---

## 7. 数据模型建议

### 7.1 现有 `assets` 表继续保留

当前表已经够做第一阶段，但我建议补这些字段：

- `scope text`
  - `vcard_avatar`
  - `vcard_image`
  - `qr_logo`
  - `blog_media`
  - `document`
- `status text`
  - `pending`
  - `ready`
  - `deleted`
  - `failed`
- `public_url text`
- `etag text`
- `metadata jsonb`

### 7.2 vCard 结构建议

现在的 `VCardImageAsset` 以 `dataUrl` 为主，这个要改成“资产引用”模型。

建议过渡成：

```ts
type VCardImageAsset = {
  id: string
  name: string
  mimeType: string
  size: number
  visibility: "public"
  createdAt: string
  assetId: string
  url: string
}
```

兼容迁移期建议：

- `dataUrl` 暂时保留为可选字段
- 渲染时优先 `url`
- 老草稿仍可回退 `dataUrl`

### 7.3 QR Logo 建议

当前 `design.logoUrl` 已经是字符串，这反而很适合平滑过渡：

- 预设 Logo：继续是本地 `/assets/...`
- 自定义 Logo：改成 COS 公共地址

如果后面要做文件管理器，再补一个 `design.logoAssetId`

---

## 8. 推荐接口设计

### 8.1 上传票据接口

`POST /api/assets/upload-ticket`

入参：

- `fileName`
- `mimeType`
- `size`
- `scope`
- `visibility`

服务端职责：

- 校验用户登录
- 校验套餐存储额度是否超限
- 校验文件类型和大小
- 生成 `assetId`
- 生成对象路径
- 使用 COS 临时密钥 / STS 生成短期上传凭证
- 先写一条 `assets(status=pending)` 记录

返回给前端：

- `assetId`
- `bucket`
- `region`
- `objectPath`
- `visibility`
- `tempSecretId`
- `tempSecretKey`
- `sessionToken`
- `expiredTime`
- `publicUrl` 或资源基地址

### 8.2 上传完成接口

`POST /api/assets/complete`

入参：

- `assetId`
- `etag`
- `size`
- `mimeType`

服务端职责：

- 校验对象已上传成功
- 把 `assets.status` 改为 `ready`
- 更新 `etag / public_url / metadata`

### 8.3 删除接口

`POST /api/assets/delete`

入参：

- `assetId`

服务端职责：

- 校验归属
- 校验该资产是否仍被 entry / blog / vCard 引用
- 可删则删除 COS 对象
- 把 `assets.status` 改为 `deleted`

### 8.4 私有读地址接口

`POST /api/assets/read-url`

用途：

- 后续私有 PDF / 受保护文件读取
- 返回短期 signed URL

公开图片不建议走这个接口，直接走公开资源域名更快。

---

## 9. 前端上传流程

推荐链路：

1. 用户在创建页选择图片
2. 前端先本地校验类型和大小
3. 前端请求 `/api/assets/upload-ticket`
4. 前端拿到短期凭证后，直接用 COS SDK 上传
5. 上传成功后，请求 `/api/assets/complete`
6. 前端把返回的 `assetId + url` 写进当前草稿
7. 用户保存 entry 时，只保存资产引用，不再保存 `dataUrl`

这条链路适用于：

- vCard 头像
- vCard 图片库
- QR 自定义 Logo
- 后续 Payload 媒体库

---

## 10. 首发实施顺序

### Phase 1：先把 Naviora 自己的上传链路跑通

优先接这三个场景：

1. vCard 头像
2. vCard 图片库
3. QR 自定义 Logo

这一阶段要完成：

- 增加 COS 环境变量
- 接入前端直传
- `assets` 元数据落库
- 创建页改存 `assetId/url`
- 公开页面改读 COS 地址

### Phase 2：把后台和内容系统接上

后续接：

1. Payload 媒体库
2. 博客图
3. 营销页素材

### Phase 3：做私有文件能力

后续接：

1. PDF 下载
2. 付费文件
3. 私有签名访问

---

## 11. 环境变量建议

建议后续补这些：

```env
TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_REGION=
TENCENT_COS_BUCKET=
TENCENT_COS_PUBLIC_BASE_URL=https://assets.naviora.link
TENCENT_COS_STS_DURATION_SECONDS=900
```

说明：

- `SecretId / SecretKey` 只放服务端
- 前端只拿临时凭证
- `TENCENT_COS_PUBLIC_BASE_URL` 用于拼公开地址

---

## 12. COS Bucket 配置建议

至少要配置：

- CORS
- 公开读策略（仅 `public/` 前缀对应的对象）
- 生命周期策略

### 12.1 CORS 建议允许来源

- `https://naviora.link`
- `https://www.naviora.link`
- `https://page.naviora.link`
- `https://*.vercel.app`
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`

如果你会用局域网地址调试，例如 `http://192.168.x.x:3002`，也需要把当前实际访问的 origin 单独加入 COS 的 CORS 白名单。

### 12.2 方法建议

- `GET`
- `HEAD`
- `PUT`
- `POST`
- `DELETE`

### 12.3 生命周期建议

- `pending` 但未完成的上传对象，定期清理
- 软删除对象，保留一段时间后再彻底删除

---

## 13. 安全边界

必须坚持这几个边界：

- 前端绝不持有长期密钥
- 对象路径必须服务端生成
- 用户不能自己指定 bucket / prefix
- 不同业务场景有不同大小和 MIME 白名单
- 上传前先做套餐额度校验
- 删除前先检查是否被业务引用

---

## 14. 与当前代码的衔接点

第一阶段实际要改的地方主要是：

- [`qr-create-flow.tsx`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/features/qr-create/qr-create-flow.tsx)
  - 把 vCard 图片和 QR Logo 上传从 `dataUrl` 改成 COS 上传
- [`vcard.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/vcard.ts)
  - 移除 `localStorage` 作为正式内容来源
- [`public-vcard-server.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/lib/supabase/public-vcard-server.ts)
  - 公开名片页读取资产 URL
- [`qr.ts`](/Users/yancy/vide%20code/Zaps/apps/naviora-app/src/types/qr.ts)
  - 资产类型从 `dataUrl` 过渡到 `assetId/url`

---

## 15. 我对这个项目的最终建议

如果按“性能优先、现在还没正式上线”的标准，我建议你直接选这条路线：

- **浏览器直传 COS**
- **Supabase 记元数据**
- **公开内容资产直接公开读**
- **私有资产签名读**
- **先做 1 个 Bucket + 前缀分层**

这是当前最稳、最快、也最不容易返工的做法。

---

## 16. 官方参考

- 腾讯云 COS JavaScript SDK 快速入门：<https://cloud.tencent.com/document/product/436/11459>
- 腾讯云 COS 临时密钥 / STS 实践：<https://cloud.tencent.com/document/product/436/14048>
- 腾讯云 COS 上传实践教程：<https://cloud.tencent.com/document/product/436/109161>
- 腾讯云 COS 跨域访问配置：<https://cloud.tencent.com/document/product/436/13318>
- 腾讯云 COS 自定义域名：<https://cloud.tencent.com/document/product/436/36638>
