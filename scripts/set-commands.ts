import { ProxyAgent, setGlobalDispatcher } from "undici";
import { ADMIN_BOT_COMMANDS, adminCommandScope } from "../src/bot-commands";
import { parseAdminGroupId } from "../src/env";

const token = process.env.BOT_TOKEN;
const adminGroupId = process.env.ADMIN_GROUP_ID;
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

if (!token || !adminGroupId) {
  throw new Error("BOT_TOKEN and ADMIN_GROUP_ID are required");
}

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    commands: ADMIN_BOT_COMMANDS,
    scope: adminCommandScope(parseAdminGroupId(adminGroupId)),
  }),
});

const body = await response.text();
if (!response.ok) {
  throw new Error(`setMyCommands failed: ${response.status} ${body}`);
}

console.log(body);

export {};
