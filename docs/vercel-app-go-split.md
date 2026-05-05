# Naviora Vercel 项目拆分决策

## 最终决策

当前阶段只拆成 2 个 Vercel 项目：

- `naviora-web`
- `naviora-public`

## 域名分配

- `naviora.link`
- `www.naviora.link`
  - 归 `naviora-web`

- `go.naviora.link`
  - 归 `naviora-public`

## 公开路径

- `/l/:slug`
  - Web / landing page
- `/s/:slug`
  - WhatsApp / social handoff
- `/c/:slug`
  - Contact card / content
- `/v/:slug`
  - Invitation
- `/preview/:token`
  - 草稿 preview

## 不再保留

- `page.naviora.link`
- 旧双域名公开结构
- 兼容迁移层

## 为什么不是 3 个项目

当前阶段最重要的是：

- 主站更新不影响公开访问
- 统计写链路稳定
- 维护成本可控

直接拆成 `web / page / go` 3 个项目，当前收益不如复杂度增加明显。

所以第一阶段统一为：

- `web`
- `public`

后续再根据流量和内容复杂度，决定是否把 `public` 继续拆成 `page / go`。

后续内容模块继续统一挂在 `public`：

- `/v/:slug`
  - 邀请函
- `/p/:slug`
  - PDF 内容
- `/m/:slug`
  - 视频 / media 内容
- `/b/:slug`
  - bio / profile

## 参考文档

- `/Users/yancy/vide code/Zaps/docs/technical-architecture-deployment.md`
- `/Users/yancy/vide code/Zaps/docs/web-public-split-checklist.md`
- `/Users/yancy/vide code/Zaps/docs/page-go-analytics-stability-plan.md`
