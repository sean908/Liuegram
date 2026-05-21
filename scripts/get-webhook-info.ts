import { ProxyAgent, setGlobalDispatcher } from "undici";

const token = process.env.BOT_TOKEN;
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

if (!token) {
  throw new Error("BOT_TOKEN is required");
}

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const body = await response.text();

if (!response.ok) {
  throw new Error(`getWebhookInfo failed: ${response.status} ${body}`);
}

console.log(body);

export {};
