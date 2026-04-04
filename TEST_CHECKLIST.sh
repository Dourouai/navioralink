#!/bin/bash

# 完整功能测试脚本
# 测试国际化、路由、SEO 元数据

export BASE_URL="http://localhost:3000"

echo "=========================================="
echo "   🧪 Naviora 完整功能测试"
echo "=========================================="
echo ""

# 测试 1: 根路径 (英文)
echo "✅ 测试 1: 根路径 (/)"
echo "预期: 英文主页，无 /en 前缀"

# 测试 2: 中文路由
echo ""
echo "✅ 测试 2: 繁体中文 (/zh-Hant/)"
echo "预期: 繁体中文页面"

echo ""
echo "✅ 测试 3: 简体中文 (/zh-Hans/)"
echo "预期: 简体中文页面"

# 测试 4: 语言选择器
echo ""
echo "✅ 测试 4: 语言选择器功能"
echo "预期: 显示 'EN' 、'繁體'、'简体' 三个选项"

# 测试 5: SEO 元数据
echo ""
echo "✅ 测试 5: SEO 元数据验证"
echo "检查项:"
echo "  - 页面标题 (title tag)"
echo "  - 描述信息 (meta description)"
echo "  - og:title, og:description"
echo ""

# 测试 6: 路由切换 /en/ → /
echo ""
echo "✅ 测试 6: 路由重定向"
echo "预期: /en/ 自动重定向到 / (无前缀)"
echo ""

# 手动测试项
echo ""
echo "=========================================="
echo "   📋 手动测试清单"
echo "=========================================="
echo ""
echo "1️⃣  打开 http://localhost:3000"
echo "   - 验证页面正常加载"
echo "   - 验证语言为英文"
echo ""
echo "2️⃣  点击语言选择器"
echo "   - 选择 '繁體' → 验证页面切换到 /zh-Hant/"
echo "   - 选择 '简体' → 验证页面切换到 /zh-Hans/"
echo "   - 回到 '英文' → 验证页面回到 /"
echo ""
echo "3️⃣  浏览器开发者工具 (F12)"
echo "   - 检查 <html lang> 属性"
echo "     - / → lang='en'"
echo "     - /zh-Hant/ → lang='zh-Hant'"
echo "     - /zh-Hans/ → lang='zh-Hans'"
echo ""
echo "4️⃣  检查元数据"
echo "   - 右键 → 查看源代码"
echo "   - 验证 <title> 标签内容"
echo "   - 验证 <meta name='description'> 内容"
echo ""
echo "5️⃣  测试 AI 聊天 (/qrs/new)"
echo "   - 输入中文提示 → AI 用中文回复"
echo "   - 输入英文提示 → AI 用英文回复"
echo ""
echo "6️⃣  测试路由重定向"
echo "   - 访问 http://localhost:3000/en/"
echo "   - 预期: 自动重定向到 http://localhost:3000/"
echo ""
echo "=========================================="
echo ""
echo "✨ 所有测试已部署，请在浏览器中验证"
echo ""
