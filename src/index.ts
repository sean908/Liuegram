import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { assertEnv } from "./env";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, _executionCtx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    console.log("Incoming request", {
      method: request.method,
      path: url.pathname,
      hasTelegramSecret: request.headers.has("X-Telegram-Bot-Api-Secret-Token"),
    });

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    assertEnv(env);

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const bot = createBot(env);
    return webhookCallback(bot, "cloudflare-mod")(request);
  },
};
