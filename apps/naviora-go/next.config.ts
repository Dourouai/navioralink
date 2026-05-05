import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 配置（Next.js 16+ 默认使用 Turbopack）
  turbopack: {
    // Turbopack 会自动处理缓存和增量编译
  },

  // 禁用 Source Maps 以加快构建（生产环境启用时改为 true）
  productionBrowserSourceMaps: false,

  // 页面路由优化
  pageExtensions: ["ts", "tsx"],

  // 响应式图片懒加载与优化
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 启用静态生成优化
  staticPageGenerationTimeout: 60,
};

export default nextConfig;
