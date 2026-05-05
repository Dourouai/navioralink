import type { Locale } from "@/i18n/config";

export interface FreeToolsCopy {
  navLabel: string;
  footerLabel: string;
  metadata: {
    description: string;
    title: string;
  };
  page: {
    badge: string;
    entranceAction: string;
    entranceBody: string;
    entranceEyebrow: string;
    entranceTitle: string;
    localFirst: string;
    noSignup: string;
    steps: string[];
    stepsBody: string;
    stepsEyebrow: string;
    stepsTitle: string;
    subtitle: string;
    title: string;
  };
  generator: {
    accentHint: string;
    accentLabel: string;
    autoAccent: string;
    backgroundHint: string;
    dotScaleHint: string;
    dotScaleLabel: string;
    downloadAction: string;
    downloadHint: string;
    fileTooLarge: string;
    formatHint: string;
    generateAction: string;
    helper: string;
    idleBody: string;
    idleTitle: string;
    imageHint: string;
    imageLabel: string;
    invalidUrl: string;
    localOnlyNote: string;
    missingImage: string;
    previewLabel: string;
    processing: string;
    regenerateAction: string;
    removeImage: string;
    renderFailed: string;
    replaceImage: string;
    overlayScaleHint: string;
    overlayScaleLabel: string;
    sectionBadge: string;
    sectionBody: string;
    sectionTitle: string;
    unsupportedFile: string;
    uploadAction: string;
    urlHint: string;
    urlLabel: string;
    urlPlaceholder: string;
  };
}

const copyMap: Record<Locale, FreeToolsCopy> = {
  "zh-Hant": {
    navLabel: "Free Tools",
    footerLabel: "免費工具",
    metadata: {
      title: "Free Tools | Naviora",
      description: "免費上傳 Logo 或圖片，將圖像像素化映射到 QR 模組上，快速生成可下載的 Logo QR Code。",
    },
    page: {
      badge: "Free Tools",
      entranceAction: "打開 Logo QR Code 工具",
      entranceBody:
        "上傳你的 Logo、吉祥物或品牌圖片，系統會在瀏覽器裡直接取樣顏色，生成一張帶圖像像素感的可下載 QR Code。",
      entranceEyebrow: "第一個免費工具",
      entranceTitle: "Logo QR Code",
      localFirst: "本地瀏覽器處理",
      noSignup: "免登入即可使用",
      steps: ["上傳 Logo 或圖片", "輸入網址", "生成並下載 PNG"],
      stepsBody: "這個版本先專注在一件事：讓使用者不需要進後台，也能快速做出一張帶品牌視覺的 QR Code。",
      stepsEyebrow: "怎麼用",
      stepsTitle: "三步完成免費 Logo QR",
      subtitle:
        "先把免費工具區獨立出來。這一頁會作為公開入口，先上線 Logo QR Code，後續再慢慢加更多可直接使用的小工具。",
      title: "給品牌和創作者的免費 QR 工具箱",
    },
    generator: {
      accentHint: "預設會從你上傳的圖片自動抓一個主色，也可以自己改。",
      accentLabel: "主色",
      autoAccent: "自動從圖片取色",
      backgroundHint: "目前固定白底，確保大部分掃碼器更容易辨識。",
      dotScaleHint: "調整圓點大小，做出更緊密或更輕盈的 QR 視覺。",
      dotScaleLabel: "圓點密度",
      downloadAction: "下載 PNG",
      downloadHint: "輸出為高解析 PNG，適合貼到海報、包裝或社群素材。",
      fileTooLarge: "圖片太大了，請上傳 4MB 以內的檔案。",
      formatHint: "支援 PNG、JPG、WEBP、SVG。建議使用透明背景 Logo，效果會更乾淨。",
      generateAction: "生成 Logo QR",
      helper: "圖片不會上傳到伺服器，所有像素取樣和 QR 繪製都在目前這個瀏覽器裡完成。",
      idleBody: "先上傳一張圖片，再輸入你要導向的網址。生成後可以直接下載 PNG。",
      idleTitle: "等待生成",
      imageHint: "想要更像範例圖，建議使用主體清楚、背景簡單的 Logo 或插圖。",
      imageLabel: "Logo / 圖片",
      invalidUrl: "請輸入有效網址，例如 https://example.com",
      localOnlyNote: "Local only",
      missingImage: "請先上傳一張 Logo 或圖片。",
      previewLabel: "預覽",
      processing: "生成中...",
      regenerateAction: "重新生成",
      removeImage: "移除圖片",
      renderFailed: "生成失敗了，請換一張圖片或稍後再試。",
      replaceImage: "更換圖片",
      overlayScaleHint: "控制中心圖像覆蓋比例，建議先維持在 30% 到 40% 之間。",
      overlayScaleLabel: "Logo 比例",
      sectionBadge: "Logo QR Builder",
      sectionBody: "這個版本會把圖片像素感映射到 QR 模組上，外圍維持乾淨可掃，中心區域保留更明顯的品牌辨識度。",
      sectionTitle: "上傳圖片，生成品牌感 QR Code",
      unsupportedFile: "目前只支援 PNG、JPG、WEBP、SVG 圖片。",
      uploadAction: "選擇圖片",
      urlHint: "可直接貼完整網址，也可以輸入 example.com，系統會自動補上 https://",
      urlLabel: "網址",
      urlPlaceholder: "https://your-site.com",
    },
  },
  "zh-Hans": {
    navLabel: "Free Tools",
    footerLabel: "免费工具",
    metadata: {
      title: "Free Tools | Naviora",
      description: "免费上传 Logo 或图片，把图像像素映射到二维码模块上，快速生成可下载的 Logo QR Code。",
    },
    page: {
      badge: "Free Tools",
      entranceAction: "打开 Logo QR Code 工具",
      entranceBody:
        "上传你的 Logo、吉祥物或品牌图片，系统会直接在浏览器里取样颜色，生成一张带图像像素感的可下载 QR Code。",
      entranceEyebrow: "第一个免费工具",
      entranceTitle: "Logo QR Code",
      localFirst: "本地浏览器处理",
      noSignup: "免登录即可使用",
      steps: ["上传 Logo 或图片", "输入网址", "生成并下载 PNG"],
      stepsBody: "这个版本先专注一件事：让用户不进后台，也能快速做出一张带品牌视觉的 QR Code。",
      stepsEyebrow: "怎么用",
      stepsTitle: "三步完成免费 Logo QR",
      subtitle:
        "先把免费工具区独立出来。这一页会作为公开入口，先上线 Logo QR Code，后续再慢慢补更多可直接使用的小工具。",
      title: "给品牌和创作者的免费 QR 工具箱",
    },
    generator: {
      accentHint: "默认会从你上传的图片自动抓一个主色，也可以手动调整。",
      accentLabel: "主色",
      autoAccent: "自动从图片取色",
      backgroundHint: "当前固定白底，保证大多数扫码器更容易识别。",
      dotScaleHint: "调整圆点大小，做出更紧密或更轻盈的 QR 视觉。",
      dotScaleLabel: "圆点密度",
      downloadAction: "下载 PNG",
      downloadHint: "输出为高分辨率 PNG，适合放到海报、包装或社交素材中。",
      fileTooLarge: "图片太大了，请上传 4MB 以内的文件。",
      formatHint: "支持 PNG、JPG、WEBP、SVG。建议使用透明背景 Logo，效果会更干净。",
      generateAction: "生成 Logo QR",
      helper: "图片不会上传到服务器，所有像素取样和二维码绘制都在当前浏览器里完成。",
      idleBody: "先上传一张图片，再输入你要跳转的网址。生成后可以直接下载 PNG。",
      idleTitle: "等待生成",
      imageHint: "如果你想更接近示例效果，建议使用主体清晰、背景简单的 Logo 或插图。",
      imageLabel: "Logo / 图片",
      invalidUrl: "请输入有效网址，例如 https://example.com",
      localOnlyNote: "Local only",
      missingImage: "请先上传一张 Logo 或图片。",
      previewLabel: "预览",
      processing: "生成中...",
      regenerateAction: "重新生成",
      removeImage: "移除图片",
      renderFailed: "生成失败了，请换一张图片或稍后再试。",
      replaceImage: "更换图片",
      overlayScaleHint: "控制中心图像覆盖比例，建议先保持在 30% 到 40% 之间。",
      overlayScaleLabel: "Logo 比例",
      sectionBadge: "Logo QR Builder",
      sectionBody: "这个版本会把图片像素感映射到二维码模块上，外围保持干净可扫，中心区域保留更明显的品牌识别度。",
      sectionTitle: "上传图片，生成品牌感二维码",
      unsupportedFile: "当前只支持 PNG、JPG、WEBP、SVG 图片。",
      uploadAction: "选择图片",
      urlHint: "可以直接贴完整网址，也可以输入 example.com，系统会自动补上 https://",
      urlLabel: "网址",
      urlPlaceholder: "https://your-site.com",
    },
  },
  en: {
    navLabel: "Free Tools",
    footerLabel: "Free Tools",
    metadata: {
      title: "Free Tools | Naviora",
      description: "Upload a logo or image for free, map its pixels into QR modules, and generate a downloadable logo QR code in the browser.",
    },
    page: {
      badge: "Free Tools",
      entranceAction: "Open the Logo QR Code tool",
      entranceBody:
        "Upload your logo, mascot, or brand image. The browser samples the colors locally and turns them into a downloadable QR code with a pixel-mapped center.",
      entranceEyebrow: "First free tool",
      entranceTitle: "Logo QR Code",
      localFirst: "Processed in your browser",
      noSignup: "No signup required",
      steps: ["Upload your logo or image", "Enter a website", "Generate and download PNG"],
      stepsBody:
        "This first release stays focused: let people make a branded QR code quickly, without entering the dashboard at all.",
      stepsEyebrow: "How it works",
      stepsTitle: "Three steps to a free logo QR",
      subtitle:
        "This page becomes the public home for lightweight utilities. Logo QR Code ships first, and more direct-use free tools can be added here later.",
      title: "A free QR toolkit for brands and creators",
    },
    generator: {
      accentHint: "By default the tool samples a dominant accent from your image, but you can override it.",
      accentLabel: "Accent color",
      autoAccent: "Auto-pick color from image",
      backgroundHint: "This version keeps a white background to stay easier to scan across common QR readers.",
      dotScaleHint: "Tune the dot size for a tighter or more airy QR feel.",
      dotScaleLabel: "Dot density",
      downloadAction: "Download PNG",
      downloadHint: "The output is a high-resolution PNG that works well for posters, packaging, and social assets.",
      fileTooLarge: "That image is too large. Please use a file smaller than 4MB.",
      formatHint: "Supports PNG, JPG, WEBP, and SVG. Transparent logos usually give the cleanest result.",
      generateAction: "Generate logo QR",
      helper: "Nothing is uploaded to the server. Image sampling and QR rendering both happen locally in this browser.",
      idleBody: "Upload an image first, then enter the website you want the QR code to open. After that you can download PNG instantly.",
      idleTitle: "Waiting for input",
      imageHint: "If you want a result closer to the examples, use a logo or illustration with a clear subject and a simple background.",
      imageLabel: "Logo / image",
      invalidUrl: "Enter a valid URL such as https://example.com",
      localOnlyNote: "Local only",
      missingImage: "Upload a logo or image first.",
      previewLabel: "Preview",
      processing: "Generating...",
      regenerateAction: "Regenerate",
      removeImage: "Remove image",
      renderFailed: "Generation failed. Try another image or try again in a moment.",
      replaceImage: "Replace image",
      overlayScaleHint: "Controls how much of the center image is mapped into the QR. Staying around 30% to 40% is a good default.",
      overlayScaleLabel: "Logo scale",
      sectionBadge: "Logo QR Builder",
      sectionBody:
        "This version maps image pixels into QR modules while keeping the outer structure clean enough to scan and the center area more recognizably branded.",
      sectionTitle: "Upload an image and turn it into a branded QR code",
      unsupportedFile: "Only PNG, JPG, WEBP, and SVG images are supported right now.",
      uploadAction: "Choose image",
      urlHint: "Paste a full URL, or enter something like example.com and the tool will add https:// automatically.",
      urlLabel: "Website URL",
      urlPlaceholder: "https://your-site.com",
    },
  },
};

export function getFreeToolsCopy(locale: Locale) {
  return copyMap[locale] ?? copyMap.en;
}
