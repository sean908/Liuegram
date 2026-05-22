import type { ReactionType } from "@grammyjs/types/message";
import { Bot, type Context } from "grammy";
import {
  MUTED_USER_NOTICE,
  parseAdminCommand,
  formatStatus,
  mutedAdminPrefix,
  shouldForwardMutedUserMessage,
  shouldNotifyMutedUser,
} from "./commands";
import { parseAdminGroupId } from "./env";
import { adminReplyParameters, getReplyToMessageId, userReplyParameters } from "./replies";
import { getAdminReactionTarget } from "./reactions";
import { Repository } from "./repository";
import type { Env, Session, UserProfile } from "./types";

type AppContext = Context;

export function createBot(env: Env): Bot<AppContext> {
  const bot = new Bot<AppContext>(env.BOT_TOKEN);
  const adminGroupId = parseAdminGroupId(env.ADMIN_GROUP_ID);

  bot.on("message", async (ctx) => {
    const repo = new Repository(env.DB);
    const message = ctx.message;

    if (message.chat.type === "private") {
      await handleUserMessage(ctx, repo, adminGroupId);
      return;
    }

    if (message.chat.id === adminGroupId && message.is_topic_message && message.message_thread_id) {
      await handleAdminTopicMessage(ctx, repo, adminGroupId);
    }
  });

  bot.on("message_reaction", async (ctx) => {
    const repo = new Repository(env.DB);
    await handleReaction(ctx, repo, adminGroupId);
  });

  bot.catch((err) => {
    console.error("Bot update failed", err.error);
  });

  return bot;
}

async function handleUserMessage(
  ctx: AppContext,
  repo: Repository,
  adminGroupId: number,
): Promise<void> {
  const message = ctx.message;
  const from = ctx.from;
  if (!message || !from) {
    return;
  }

  const profile = toUserProfile(from, message.chat.id);
  let session = await repo.getSessionByUserId(from.id);
  if (!session) {
    const topic = await ctx.api.createForumTopic(adminGroupId, topicName(profile));
    session = await repo.createSession(profile, topic.message_thread_id);
    await ctx.api.sendMessage(adminGroupId, formatStatus(session), {
      message_thread_id: session.topicId,
    });
  } else {
    await repo.touchSessionProfile(session, profile);
  }

  if (shouldNotifyMutedUser(session.muteMode)) {
    await ctx.reply(MUTED_USER_NOTICE);
  }

  if (session.muteMode === "partial") {
    await ctx.api.sendMessage(adminGroupId, mutedAdminPrefix(session.muteMode), {
      message_thread_id: session.topicId,
    });
  }

  if (!shouldForwardMutedUserMessage(session.muteMode)) {
    return;
  }

  const replyToMessageId = getReplyToMessageId(message);
  const replyMapping = replyToMessageId
    ? await repo.findByUserMessage(session.id, replyToMessageId)
    : null;
  const delivered = await deliverUserMessageToAdmin(
    ctx,
    adminGroupId,
    session,
    userReplyParameters(replyMapping),
  );
  if (!delivered) {
    await ctx.reply("这条消息暂时无法转发给客服。");
    return;
  }

  await repo.createMessageMapping({
    sessionId: session.id,
    userMessageId: message.message_id,
    adminChatId: adminGroupId,
    adminTopicId: session.topicId,
    adminMessageId: delivered.messageId,
    direction: "user_to_admin",
  });
}

async function handleAdminTopicMessage(
  ctx: AppContext,
  repo: Repository,
  adminGroupId: number,
): Promise<void> {
  const message = ctx.message;
  if (!message?.message_thread_id) {
    return;
  }

  if (isForumServiceMessage(message)) {
    return;
  }

  const session = await repo.getSessionByTopicId(message.message_thread_id);
  if (!session) {
    await ctx.reply("未找到当前 topic 绑定的用户会话。");
    return;
  }

  const text = "text" in message ? message.text : undefined;
  if (text?.startsWith("/")) {
    const handled = await handleAdminCommand(ctx, repo, session, text);
    if (handled) {
      return;
    }
  }

  const replyToMessageId = getReplyToMessageId(message);
  const replyMapping = replyToMessageId
    ? await repo.findBySessionAdminMessage(session.id, session.topicId, replyToMessageId)
    : null;
  const delivered = await deliverAdminMessageToUser(
    ctx,
    session,
    adminGroupId,
    adminReplyParameters(replyMapping),
  );
  if (!delivered) {
    await ctx.reply("这条消息无法转发给用户。请改用普通文本消息，或换一种 Telegram 支持复制的消息类型。");
    return;
  }

  await repo.createMessageMapping({
    sessionId: session.id,
    userMessageId: delivered.messageId,
    adminChatId: adminGroupId,
    adminTopicId: session.topicId,
    adminMessageId: message.message_id,
    direction: "admin_to_user",
  });
}

async function handleAdminCommand(
  ctx: AppContext,
  repo: Repository,
  session: Session,
  text: string,
): Promise<boolean> {
  const command = parseAdminCommand(text);
  if (!command) {
    return false;
  }

  if (command.kind === "mute") {
    await repo.setMuteMode(session.id, command.mode);
    await ctx.reply(`已设置禁言模式: ${command.mode}`);
    await ctx.api.sendMessage(session.userChatId, MUTED_USER_NOTICE);
    return true;
  }

  if (command.kind === "unmute") {
    await repo.setMuteMode(session.id, "none");
    await ctx.reply("已解除禁言。");
    await ctx.api.sendMessage(session.userChatId, "你的禁言已解除。");
    return true;
  }

  if (command.kind === "status") {
    const current = await repo.getSessionByTopicId(session.topicId);
    await ctx.reply(formatStatus(current ?? session));
    return true;
  }

  if (command.kind === "delete_intercept") {
    await repo.setDeleteIntercept(session.id, command.enabled);
    await ctx.reply(
      command.enabled
        ? "已开启撤回拦截：当前实现为保留客服端副本模式。"
        : "已关闭撤回拦截。",
    );
    return true;
  }

  if (command.kind === "close") {
    await ctx.reply("会话已标记为关闭。当前版本保留 topic 和历史消息。");
    return true;
  }

  return false;
}

async function deliverUserMessageToAdmin(
  ctx: AppContext,
  adminGroupId: number,
  session: Session,
  replyParameters?: { message_id: number; allow_sending_without_reply?: boolean },
): Promise<{ messageId: number } | null> {
  const message = ctx.message;
  if (!message) {
    return null;
  }

  const text = getMessageText(message);
  if (text) {
    const sent = await ctx.api.sendMessage(adminGroupId, text, {
      message_thread_id: session.topicId,
      entities: "entities" in message ? message.entities : undefined,
      reply_parameters: replyParameters,
    });
    return { messageId: sent.message_id };
  }

  try {
    const copied = await ctx.api.copyMessage(adminGroupId, message.chat.id, message.message_id, {
      message_thread_id: session.topicId,
      reply_parameters: replyParameters,
    });
    return { messageId: copied.message_id };
  } catch (error) {
    console.warn("Failed to copy user message to admin topic", describeMessageForLog(message), error);
    await ctx.api.sendMessage(adminGroupId, "用户发送了一条当前无法复制的消息。", {
      message_thread_id: session.topicId,
    });
    return null;
  }
}

async function deliverAdminMessageToUser(
  ctx: AppContext,
  session: Session,
  adminGroupId: number,
  replyParameters?: { message_id: number; allow_sending_without_reply?: boolean },
): Promise<{ messageId: number } | null> {
  const message = ctx.message;
  if (!message) {
    return null;
  }

  const text = getMessageText(message);
  if (text) {
    const sent = await ctx.api.sendMessage(session.userChatId, text, {
      entities: "entities" in message ? message.entities : undefined,
      reply_parameters: replyParameters,
    });
    return { messageId: sent.message_id };
  }

  try {
    const copied = await ctx.api.copyMessage(session.userChatId, adminGroupId, message.message_id, {
      reply_parameters: replyParameters,
    });
    return { messageId: copied.message_id };
  } catch (error) {
    console.warn("Failed to copy admin message to user", describeMessageForLog(message), error);
    return null;
  }
}

function getMessageText(message: NonNullable<AppContext["message"]>): string | null {
  if ("text" in message && message.text) {
    return message.text;
  }
  return null;
}

function isForumServiceMessage(message: NonNullable<AppContext["message"]>): boolean {
  return (
    "forum_topic_created" in message ||
    "forum_topic_edited" in message ||
    "forum_topic_closed" in message ||
    "forum_topic_reopened" in message ||
    "general_forum_topic_hidden" in message ||
    "general_forum_topic_unhidden" in message
  );
}

function describeMessageForLog(message: NonNullable<AppContext["message"]>): Record<string, unknown> {
  return {
    chatId: message.chat.id,
    messageId: message.message_id,
    hasText: "text" in message,
    hasCaption: "caption" in message,
  };
}

async function handleReaction(
  ctx: AppContext,
  repo: Repository,
  adminGroupId: number,
): Promise<void> {
  const reaction = ctx.update.message_reaction;
  if (!reaction) {
    return;
  }

  if (reaction.chat.id === adminGroupId && reaction.chat.type !== "private") {
    const mapping = await repo.findByAdminChatMessage(adminGroupId, reaction.message_id);
    if (!mapping) {
      return;
    }
    const session = await repo.getSessionByTopicId(mapping.adminTopicId);
    if (!session) {
      return;
    }
    const target = getAdminReactionTarget(mapping, session);
    if (!target) {
      return;
    }
    await setVisibleReaction(ctx, target.chatId, target.messageId, reaction.new_reaction);
    return;
  }

  if (reaction.chat.type === "private") {
    const session = await repo.getSessionByUserId(reaction.user?.id ?? reaction.chat.id);
    if (!session) {
      return;
    }
    const mapping = await repo.findByUserMessage(session.id, reaction.message_id);
    if (!mapping) {
      return;
    }
    await setVisibleReaction(ctx, adminGroupId, mapping.adminMessageId, reaction.new_reaction);
  }
}

async function setVisibleReaction(
  ctx: AppContext,
  chatId: number,
  messageId: number,
  reactions: ReactionType[],
): Promise<void> {
  const supported = reactions.filter((reaction) => reaction.type !== "paid");
  try {
    await ctx.api.setMessageReaction(chatId, messageId, supported);
  } catch (error) {
    console.warn("Failed to mirror message reaction", error);
  }
}

function toUserProfile(
  from: NonNullable<AppContext["from"]>,
  chatId: number,
): UserProfile {
  return {
    id: from.id,
    chatId,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
  };
}

function topicName(profile: UserProfile): string {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const handle = profile.username ? `@${profile.username}` : null;
  return [name || handle || "User", `#${profile.id}`].join(" ");
}
