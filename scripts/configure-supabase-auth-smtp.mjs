#!/usr/bin/env node

const requiredEnv = [
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "BREVO_SMTP_LOGIN",
  "BREVO_SMTP_PASSWORD",
];

const missing = requiredEnv.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((key) => console.error(`- ${key}`));
  process.exit(1);
}

const projectRef = process.env.SUPABASE_PROJECT_REF.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN.trim();
const smtpHost = process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com";
const smtpPort = process.env.BREVO_SMTP_PORT?.trim() || "587";
const siteUrl = process.env.SUPABASE_SITE_URL?.trim();
const uriAllowList = process.env.SUPABASE_AUTH_URI_ALLOW_LIST?.trim();

const payload = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: process.env.BREVO_SENDER_EMAIL.trim(),
  smtp_sender_name: process.env.BREVO_SENDER_NAME.trim(),
  smtp_host: smtpHost,
  smtp_port: smtpPort,
  smtp_user: process.env.BREVO_SMTP_LOGIN.trim(),
  smtp_pass: process.env.BREVO_SMTP_PASSWORD.trim(),
};

if (siteUrl) {
  payload.site_url = siteUrl;
}

if (uriAllowList) {
  payload.uri_allow_list = uriAllowList;
}

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
  console.error(`Supabase Auth SMTP update failed (${response.status}).`);
  console.error(errorBody);
  process.exit(1);
}

const data = await response.json();

console.log("Supabase Auth SMTP updated successfully.");
console.log(`Project ref: ${projectRef}`);
console.log(`SMTP host: ${data.smtp_host ?? smtpHost}`);
console.log(`SMTP port: ${data.smtp_port ?? smtpPort}`);
console.log(`Sender email: ${data.smtp_admin_email ?? process.env.BREVO_SENDER_EMAIL.trim()}`);
if (siteUrl) {
  console.log(`Site URL: ${data.site_url ?? siteUrl}`);
}
if (uriAllowList) {
  console.log(`URI allow list: ${data.uri_allow_list ?? uriAllowList}`);
}
