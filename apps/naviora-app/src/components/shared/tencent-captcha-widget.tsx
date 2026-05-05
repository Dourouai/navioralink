"use client";

import { useEffect, useRef } from "react";
import type { TencentCaptchaChallengePayload } from "@/types/tencent-captcha";
// Window.TencentCaptcha global type is declared in tencent-captcha-client.ts
import "@/lib/tencent-captcha-client";

interface TencentCaptchaWidgetProps {
  appId: string;
  action: "login" | "register_send_code";
  onVerified: (result: TencentCaptchaChallengePayload) => void;
  className?: string;
}

// Injected once globally to override SDK's fixed-width styles
let styleInjected = false;
function ensureStyles() {
  if (styleInjected || typeof document === "undefined") return;
  styleInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .tencent-captcha-dy__robot-box {
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .tencent-captcha-dy__robot-left-wrapper {
      flex: 1 1 0% !important;
      min-width: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Renders the Tencent "I am human" checkbox inline in the form.
 * The SDK script must be pre-loaded by layout.tsx.
 * Use `key` prop to force re-initialization (e.g. after a failed login).
 */
export function TencentCaptchaWidget({ appId, action, onVerified, className }: TencentCaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onVerifiedRef = useRef(onVerified);
  useEffect(() => { onVerifiedRef.current = onVerified; }, [onVerified]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureStyles();

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let instance: { show(): void; destroy?: () => void } | null = null;

    function init() {
      if (cancelled || !container || !window.TencentCaptcha) return;
      container.innerHTML = "";
      try {
        instance = new window.TencentCaptcha(
          container,
          appId,
          (payload) => {
            if (cancelled) return;
            if (payload.ret === 0 && payload.ticket?.trim() && payload.randstr?.trim()) {
              onVerifiedRef.current({ ticket: payload.ticket.trim(), randstr: payload.randstr.trim() });
            }
          },
          { bizState: action },
        );
        instance.show();
      } catch (err) {
        console.error("[captcha] inline init failed:", err);
      }
    }

    if (window.TencentCaptcha) {
      init();
    } else {
      const deadline = Date.now() + 10000;
      const timer = setInterval(() => {
        if (cancelled) { clearInterval(timer); return; }
        if (window.TencentCaptcha) {
          clearInterval(timer);
          init();
        } else if (Date.now() >= deadline) {
          clearInterval(timer);
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(timer);
        try { instance?.destroy?.(); } catch { /* ignore */ }
      };
    }

    return () => {
      cancelled = true;
      try { instance?.destroy?.(); } catch { /* ignore */ }
    };
  }, [appId, action]);

  return (
    <div className={className ?? "w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white"}>
      <div ref={containerRef} />
    </div>
  );
}

