const token = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
const webhookUrl = process.env.WEBHOOK_URL;
const dropPendingUpdates = process.env.DROP_PENDING_UPDATES === "true";

if (!token || !secret || !webhookUrl) {
  throw new Error("BOT_TOKEN, WEBHOOK_SECRET and WEBHOOK_URL are required");
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "message_reaction", "message_reaction_count"],
    drop_pending_updates: dropPendingUpdates,
  }),
});

const body = await response.text();
if (!response.ok) {
  throw new Error(`setWebhook failed: ${response.status} ${body}`);
}

console.log(body);

export {};
