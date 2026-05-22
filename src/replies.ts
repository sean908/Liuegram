import type { MessageMapping } from "./types";

export interface ReplyParameters {
  message_id: number;
  allow_sending_without_reply?: boolean;
}

export interface MessageWithReply {
  reply_to_message?: {
    message_id: number;
  };
}

export function getReplyToMessageId(message: MessageWithReply): number | null {
  return message.reply_to_message?.message_id ?? null;
}

export function userReplyParameters(mapping: MessageMapping | null): ReplyParameters | undefined {
  if (!mapping) {
    return undefined;
  }
  return {
    message_id: mapping.adminMessageId,
    allow_sending_without_reply: true,
  };
}

export function adminReplyParameters(mapping: MessageMapping | null): ReplyParameters | undefined {
  if (!mapping) {
    return undefined;
  }
  return {
    message_id: mapping.userMessageId,
    allow_sending_without_reply: true,
  };
}
