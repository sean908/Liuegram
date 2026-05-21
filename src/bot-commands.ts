import type { BotCommand } from "@grammyjs/types/manage";

export const ADMIN_BOT_COMMANDS: readonly BotCommand[] = [
  { command: "status", description: "查看当前会话状态" },
  { command: "mute", description: "禁言用户：/mute full 或 /mute partial" },
  { command: "unmute", description: "解除当前用户禁言" },
  { command: "delete_intercept", description: "撤回保留副本：on 或 off" },
  { command: "close", description: "标记当前会话关闭" },
];

export function adminCommandScope(adminGroupId: number) {
  return {
    type: "chat_administrators" as const,
    chat_id: adminGroupId,
  };
}
