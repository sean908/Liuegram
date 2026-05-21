import type { Direction, MessageMapping, Session } from "./types";

export interface ReactionMirrorTarget {
  chatId: number;
  messageId: number;
}

export function getAdminReactionTarget(
  mapping: MessageMapping,
  session: Session,
): ReactionMirrorTarget | null {
  if (mapping.direction === "user_to_admin") {
    return {
      chatId: session.userChatId,
      messageId: mapping.userMessageId,
    };
  }

  if (mapping.direction === "admin_to_user") {
    return {
      chatId: session.userChatId,
      messageId: mapping.userMessageId,
    };
  }

  return null;
}

export function isDirection(value: string): value is Direction {
  return value === "user_to_admin" || value === "admin_to_user";
}
