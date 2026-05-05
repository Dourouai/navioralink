import "server-only";

type BrevoRecipient = {
  email: string;
  name?: string;
};

type BrevoTransactionalEmailPayload = {
  to: BrevoRecipient[];
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  replyTo?: BrevoRecipient;
  cc?: BrevoRecipient[];
  bcc?: BrevoRecipient[];
  templateId?: number;
  params?: Record<string, string | number | boolean | null>;
  headers?: Record<string, string>;
};

type BrevoSendResponse = {
  messageId?: string;
};

const brevoApiKey = process.env.BREVO_API_KEY?.trim();
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
const brevoSenderName = process.env.BREVO_SENDER_NAME?.trim() || "Naviora";
const brevoReplyToEmail = process.env.BREVO_REPLY_TO_EMAIL?.trim();
const brevoReplyToName = process.env.BREVO_REPLY_TO_NAME?.trim() || "Naviora";
const brevoSandbox = /^(1|true|yes)$/i.test(process.env.BREVO_SANDBOX?.trim() ?? "");

export function hasBrevoEnv() {
  return Boolean(brevoApiKey && brevoSenderEmail);
}

function getBrevoConfig() {
  if (!brevoApiKey || !brevoSenderEmail) {
    throw new Error("Brevo environment variables are missing. Add BREVO_API_KEY and BREVO_SENDER_EMAIL first.");
  }

  return {
    apiKey: brevoApiKey,
    sender: {
      email: brevoSenderEmail,
      name: brevoSenderName,
    },
    replyTo: brevoReplyToEmail
      ? {
          email: brevoReplyToEmail,
          name: brevoReplyToName,
        }
      : undefined,
    sandbox: brevoSandbox,
  };
}

function normalizeRecipients(recipients: BrevoRecipient[]) {
  return recipients
    .map((recipient) => ({
      email: recipient.email.trim(),
      ...(recipient.name?.trim() ? { name: recipient.name.trim() } : {}),
    }))
    .filter((recipient) => Boolean(recipient.email));
}

export async function sendBrevoTransactionalEmail(payload: BrevoTransactionalEmailPayload) {
  const config = getBrevoConfig();
  const to = normalizeRecipients(payload.to);

  if (!to.length) {
    throw new Error("Brevo requires at least one recipient.");
  }

  if (!payload.templateId && !payload.subject?.trim()) {
    throw new Error("Brevo requires a subject when templateId is not provided.");
  }

  if (!payload.templateId && !payload.htmlContent?.trim() && !payload.textContent?.trim()) {
    throw new Error("Brevo requires htmlContent or textContent when templateId is not provided.");
  }

  const headers = {
    ...(payload.headers ?? {}),
    ...(config.sandbox ? { "X-Sib-Sandbox": "drop" } : {}),
  };

  const body = {
    sender: config.sender,
    to,
    ...(payload.cc?.length ? { cc: normalizeRecipients(payload.cc) } : {}),
    ...(payload.bcc?.length ? { bcc: normalizeRecipients(payload.bcc) } : {}),
    ...(payload.subject?.trim() ? { subject: payload.subject.trim() } : {}),
    ...(payload.htmlContent?.trim() ? { htmlContent: payload.htmlContent } : {}),
    ...(payload.textContent?.trim() ? { textContent: payload.textContent } : {}),
    ...(payload.templateId ? { templateId: payload.templateId } : {}),
    ...(payload.params ? { params: payload.params } : {}),
    ...(payload.replyTo
      ? { replyTo: payload.replyTo }
      : config.replyTo
        ? { replyTo: config.replyTo }
        : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${errorBody || response.statusText}`);
  }

  return (await response.json()) as BrevoSendResponse;
}
