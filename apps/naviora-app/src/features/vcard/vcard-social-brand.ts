import { AtSign, Globe, type LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import { FaLinkedinIn, FaSkype } from "react-icons/fa6";
import {
  SiBilibili,
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiLine,
  SiMessenger,
  SiPinterest,
  SiReddit,
  SiSignal,
  SiSinaweibo,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWechat,
  SiWhatsapp,
  SiX,
  SiXiaohongshu,
  SiYoutube,
} from "react-icons/si";

import type { VCardSocialPlatform } from "@/types/qr";

type SocialIconComponent = IconType | LucideIcon;

export interface VCardSocialBrandAppearance {
  badgeBackground: string;
  badgeBorderColor: string;
  badgeColor: string;
  icon: SocialIconComponent;
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createBrandAppearance(icon: SocialIconComponent, color: string): VCardSocialBrandAppearance {
  return {
    badgeBackground: withAlpha(color, 0.12),
    badgeBorderColor: withAlpha(color, 0.18),
    badgeColor: color,
    icon,
  };
}

export function getVCardSocialBrandAppearance(platform: VCardSocialPlatform): VCardSocialBrandAppearance {
  if (platform === "linkedin") return createBrandAppearance(FaLinkedinIn, "#0A66C2");
  if (platform === "instagram") return createBrandAppearance(SiInstagram, "#E4405F");
  if (platform === "facebook") return createBrandAppearance(SiFacebook, "#1877F2");
  if (platform === "x") return createBrandAppearance(SiX, "#0F172A");
  if (platform === "threads") return createBrandAppearance(SiThreads, "#111827");
  if (platform === "youtube") return createBrandAppearance(SiYoutube, "#FF0033");
  if (platform === "tiktok") return createBrandAppearance(SiTiktok, "#111827");
  if (platform === "github") return createBrandAppearance(SiGithub, "#111827");
  if (platform === "pinterest") return createBrandAppearance(SiPinterest, "#E60023");
  if (platform === "reddit") return createBrandAppearance(SiReddit, "#FF4500");
  if (platform === "wechat" || platform === "wechatofficial") return createBrandAppearance(SiWechat, "#07C160");
  if (platform === "whatsapp") return createBrandAppearance(SiWhatsapp, "#25D366");
  if (platform === "telegram") return createBrandAppearance(SiTelegram, "#229ED9");
  if (platform === "line") return createBrandAppearance(SiLine, "#00B900");
  if (platform === "messenger") return createBrandAppearance(SiMessenger, "#0084FF");
  if (platform === "discord") return createBrandAppearance(SiDiscord, "#5865F2");
  if (platform === "skype") return createBrandAppearance(FaSkype, "#00AFF0");
  if (platform === "signal") return createBrandAppearance(SiSignal, "#3A76F0");
  if (platform === "weibo") return createBrandAppearance(SiSinaweibo, "#E6162D");
  if (platform === "xiaohongshu") return createBrandAppearance(SiXiaohongshu, "#FF2442");
  if (platform === "bilibili") return createBrandAppearance(SiBilibili, "#00A1D6");
  if (platform === "douyin") return createBrandAppearance(SiTiktok, "#111827");
  if (platform === "website") return createBrandAppearance(Globe, "#2563EB");
  return createBrandAppearance(AtSign, "#7C3AED");
}
