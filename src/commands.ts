import type { MuteMode, Session } from "./types";

export const MUTED_USER_NOTICE = "你已被禁言。";

export type AdminCommand =
  | { kind: "mute"; mode: Exclude<MuteMode, "none"> }
  | { kind: "unmute" }
  | { kind: "status" }
  | { kind: "delete_intercept"; enabled: boolean }
  | { kind: "close" };

export function parseAdminCommand(text: string): AdminCommand | null {
  const [rawCommand, rawArg] = text.trim().split(/\s+/, 2);
  const command = rawCommand.split("@", 1)[0];

  if (command === "/mute" && rawArg === "full") {
    return { kind: "mute", mode: "full" };
  }
  if (command === "/mute" && rawArg === "partial") {
    return { kind: "mute", mode: "partial" };
  }
  if (command === "/unmute") {
    return { kind: "unmute" };
  }
  if (command === "/status") {
    return { kind: "status" };
  }
  if (command === "/delete_intercept" && rawArg === "on") {
    return { kind: "delete_intercept", enabled: true };
  }
  if (command === "/delete_intercept" && rawArg === "off") {
    return { kind: "delete_intercept", enabled: false };
  }
  if (command === "/close") {
    return { kind: "close" };
  }

  return null;
}

export function formatStatus(session: Session): string {
  return [
    "会话状态",
    `用户 ID: ${session.userId}`,
    `用户名: ${session.username ? `@${session.username}` : "-"}`,
    `姓名: ${[session.firstName, session.lastName].filter(Boolean).join(" ") || "-"}`,
    `Topic ID: ${session.topicId}`,
    `禁言: ${session.muteMode}`,
    `撤回拦截: ${session.deleteInterceptEnabled ? "on (保留副本)" : "off"}`,
  ].join("\n");
}

export function mutedAdminPrefix(mode: MuteMode): string {
  if (mode === "partial") {
    return "[部分禁言用户的消息，仍已转发]";
  }
  return "";
}

export function shouldNotifyMutedUser(mode: MuteMode): boolean {
  return mode === "full" || mode === "partial";
}

export function shouldForwardMutedUserMessage(mode: MuteMode): boolean {
  return mode !== "full";
}
