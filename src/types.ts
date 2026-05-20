export type MuteMode = "none" | "partial" | "full";

export type Direction = "user_to_admin" | "admin_to_user";

export interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  ADMIN_GROUP_ID: string;
  DB: D1Database;
}

export interface Session {
  id: number;
  userId: number;
  userChatId: number;
  topicId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  muteMode: MuteMode;
  deleteInterceptEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface MessageMapping {
  id: number;
  sessionId: number;
  userMessageId: number;
  adminChatId: number;
  adminTopicId: number;
  adminMessageId: number;
  direction: Direction;
  createdAt: string;
}
