import type { Env } from "./types";

export function parseAdminGroupId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new Error("ADMIN_GROUP_ID must be a Telegram chat id integer");
  }
  return id;
}

export function assertEnv(env: Env): void {
  const missing = ["BOT_TOKEN", "WEBHOOK_SECRET", "ADMIN_GROUP_ID"].filter(
    (key) => !env[key as keyof Env],
  );

  if (!env.DB) {
    missing.push("DB");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  parseAdminGroupId(env.ADMIN_GROUP_ID);
}
