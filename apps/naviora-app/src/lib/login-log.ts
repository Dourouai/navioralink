import "server-only";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export type LoginLogType = "login" | "register";
export type LoginLogStatus = "success" | "failed" | "captcha_failed" | "rate_limited";

export interface WriteLoginLogParams {
  type: LoginLogType;
  status: LoginLogStatus;
  email: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function writeLoginLog(params: WriteLoginLogParams): void {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  const admin = createAdminSupabaseClient();

  admin
    .from("login_logs")
    .insert({
      type: params.type,
      status: params.status,
      email: params.email,
      user_id: params.userId ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ? params.userAgent.slice(0, 512) : null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("[login-log] Failed to write log:", error.message);
      }
    });
}
