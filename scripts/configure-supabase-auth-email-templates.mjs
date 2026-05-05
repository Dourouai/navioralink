#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredEnv = ["SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "SUPABASE_SITE_URL"];

const missing = requiredEnv.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((key) => console.error(`- ${key}`));
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRef = process.env.SUPABASE_PROJECT_REF.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN.trim();

async function readTemplate(fileName) {
  const fullPath = path.join(__dirname, "..", "supabase", "email-templates", fileName);
  return fs.readFile(fullPath, "utf8");
}

const payload = {
  mailer_subjects_confirmation: "Verify your Naviora email | 驗證 / 验证邮箱",
  mailer_subjects_magic_link: "Your Naviora verification code | 驗證 / 验证码",
  mailer_subjects_recovery: "Reset your Naviora password | 重設 / 重置密码",
  mailer_subjects_email_change: "Confirm your new email | 確認 / 确认新邮箱",
  mailer_subjects_reauthentication: "Password change verification code | 修改密碼 / 密码验证码",
  mailer_templates_confirmation_content: await readTemplate("confirmation.html"),
  mailer_templates_magic_link_content: await readTemplate("magic-link.html"),
  mailer_templates_recovery_content: await readTemplate("recovery.html"),
  mailer_templates_email_change_content: await readTemplate("email-change.html"),
  mailer_templates_reauthentication_content: await readTemplate("reauthentication.html"),
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const errorBody = await response.text();
  console.error(`Supabase Auth email templates update failed (${response.status}).`);
  console.error(errorBody);
  process.exit(1);
}

const data = await response.json();

console.log("Supabase Auth email templates updated successfully.");
console.log(`Project ref: ${projectRef}`);
console.log(`Confirmation subject: ${data.mailer_subjects_confirmation ?? payload.mailer_subjects_confirmation}`);
console.log(`Magic link subject: ${data.mailer_subjects_magic_link ?? payload.mailer_subjects_magic_link}`);
console.log(`Recovery subject: ${data.mailer_subjects_recovery ?? payload.mailer_subjects_recovery}`);
console.log(`Email change subject: ${data.mailer_subjects_email_change ?? payload.mailer_subjects_email_change}`);
console.log(`Reauthentication subject: ${data.mailer_subjects_reauthentication ?? payload.mailer_subjects_reauthentication}`);
