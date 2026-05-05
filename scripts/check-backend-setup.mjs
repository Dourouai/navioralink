import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SMTP_LOGIN",
  "BREVO_SMTP_PASSWORD",
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missingKeys) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

async function runSql(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  const text = await response.text();
  const data = text ? JSON.parse(text) : [];

  if (!response.ok) {
    throw new Error(
      data?.message || `Supabase query failed with status ${response.status}.`,
    );
  }

  return data;
}

async function main() {
  console.log("Backend self-check");
  console.log(`- env.local loaded: ${existsSync(envPath) ? "yes" : "no"}`);
  console.log("- local env keys present: yes");

  const tables = await runSql(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'ai_conversation_events',
        'profiles',
        'entries',
        'entry_targets',
        'entry_rules',
        'entry_visits',
        'subscriptions',
        'billing_events'
      )
    order by table_name;
  `);

  const functions = await runSql(`
    select proname
    from pg_proc
    join pg_namespace n on n.oid = pg_proc.pronamespace
    where n.nspname = 'public'
      and proname in (
        'normalize_plan_code',
        'has_active_subscription_access',
        'get_effective_plan_code',
        'get_plan_entry_limit',
        'get_plan_monthly_visit_limit',
        'pause_entries_over_plan_limit',
        'enforce_entry_plan_limit',
        'sync_subscription_plan_constraints'
      )
    order by proname;
  `);

  const triggers = await runSql(`
    select tgname
    from pg_trigger
    where tgname in (
      'entries_enforce_plan_limit',
      'subscriptions_sync_plan_constraints'
    )
    order by tgname;
  `);

  const expectedTables = [
    "ai_conversation_events",
    "billing_events",
    "entries",
    "entry_rules",
    "entry_targets",
    "entry_visits",
    "profiles",
    "subscriptions",
  ];

  const expectedFunctions = [
    "enforce_entry_plan_limit",
    "get_effective_plan_code",
    "get_plan_entry_limit",
    "get_plan_monthly_visit_limit",
    "has_active_subscription_access",
    "normalize_plan_code",
    "pause_entries_over_plan_limit",
    "sync_subscription_plan_constraints",
  ];

  const expectedTriggers = [
    "entries_enforce_plan_limit",
    "subscriptions_sync_plan_constraints",
  ];

  const tableNames = tables.map((row) => row.table_name);
  const functionNames = functions.map((row) => row.proname);
  const triggerNames = triggers.map((row) => row.tgname);

  const missingTables = expectedTables.filter((name) => !tableNames.includes(name));
  const missingFunctions = expectedFunctions.filter(
    (name) => !functionNames.includes(name),
  );
  const missingTriggers = expectedTriggers.filter(
    (name) => !triggerNames.includes(name),
  );

  console.log(`- public tables: ${tableNames.join(", ")}`);
  console.log(`- plan functions: ${functionNames.join(", ")}`);
  console.log(`- plan triggers: ${triggerNames.join(", ")}`);

  if (missingTables.length || missingFunctions.length || missingTriggers.length) {
    if (missingTables.length) {
      console.error(`Missing tables: ${missingTables.join(", ")}`);
    }
    if (missingFunctions.length) {
      console.error(`Missing functions: ${missingFunctions.join(", ")}`);
    }
    if (missingTriggers.length) {
      console.error(`Missing triggers: ${missingTriggers.join(", ")}`);
    }

    process.exit(1);
  }

  const localUrl = process.env.LOCAL_DEV_URL || "http://localhost:3001/zh-Hans/register";
  const localResponse = await fetch(localUrl, { redirect: "manual" }).catch(
    () => null,
  );

  if (localResponse) {
    console.log(`- local route ${localUrl}: ${localResponse.status}`);
  } else {
    console.warn(`- local route ${localUrl}: unreachable`);
  }

  console.log("Self-check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
