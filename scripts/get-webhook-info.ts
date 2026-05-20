const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is required");
}

const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const body = await response.text();

if (!response.ok) {
  throw new Error(`getWebhookInfo failed: ${response.status} ${body}`);
}

console.log(body);

export {};
