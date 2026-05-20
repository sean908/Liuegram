import type { Direction, MessageMapping, MuteMode, Session, UserProfile } from "./types";

interface SessionRow {
  id: number;
  user_id: number;
  user_chat_id: number;
  topic_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  mute_mode: MuteMode;
  delete_intercept_enabled: number;
  created_at: string;
  updated_at: string;
}

interface MessageMappingRow {
  id: number;
  session_id: number;
  user_message_id: number;
  admin_chat_id: number;
  admin_topic_id: number;
  admin_message_id: number;
  direction: Direction;
  created_at: string;
}

export class Repository {
  constructor(private readonly db: D1Database) {}

  async getSessionByUserId(userId: number): Promise<Session | null> {
    const row = await this.db
      .prepare("SELECT * FROM sessions WHERE user_id = ?")
      .bind(userId)
      .first<SessionRow>();
    return row ? mapSession(row) : null;
  }

  async getSessionByTopicId(topicId: number): Promise<Session | null> {
    const row = await this.db
      .prepare("SELECT * FROM sessions WHERE topic_id = ?")
      .bind(topicId)
      .first<SessionRow>();
    return row ? mapSession(row) : null;
  }

  async createSession(profile: UserProfile, topicId: number): Promise<Session> {
    await this.db
      .prepare(
        `INSERT INTO sessions (
          user_id, user_chat_id, topic_id, username, first_name, last_name
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        profile.id,
        profile.chatId,
        topicId,
        profile.username ?? null,
        profile.firstName ?? null,
        profile.lastName ?? null,
      )
      .run();

    const session = await this.getSessionByUserId(profile.id);
    if (!session) {
      throw new Error("Failed to load session after insert");
    }
    return session;
  }

  async touchSessionProfile(session: Session, profile: UserProfile): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sessions
         SET username = ?, first_name = ?, last_name = ?, user_chat_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        profile.username ?? null,
        profile.firstName ?? null,
        profile.lastName ?? null,
        profile.chatId,
        session.id,
      )
      .run();
  }

  async setMuteMode(sessionId: number, mode: MuteMode): Promise<void> {
    await this.db
      .prepare("UPDATE sessions SET mute_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(mode, sessionId)
      .run();
  }

  async setDeleteIntercept(sessionId: number, enabled: boolean): Promise<void> {
    await this.db
      .prepare(
        "UPDATE sessions SET delete_intercept_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(enabled ? 1 : 0, sessionId)
      .run();
  }

  async createMessageMapping(input: {
    sessionId: number;
    userMessageId: number;
    adminChatId: number;
    adminTopicId: number;
    adminMessageId: number;
    direction: Direction;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO message_mappings (
          session_id, user_message_id, admin_chat_id, admin_topic_id, admin_message_id, direction
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.sessionId,
        input.userMessageId,
        input.adminChatId,
        input.adminTopicId,
        input.adminMessageId,
        input.direction,
      )
      .run();
  }

  async findByAdminMessage(
    adminChatId: number,
    adminTopicId: number,
    adminMessageId: number,
  ): Promise<MessageMapping | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM message_mappings
         WHERE admin_chat_id = ? AND admin_topic_id = ? AND admin_message_id = ?`,
      )
      .bind(adminChatId, adminTopicId, adminMessageId)
      .first<MessageMappingRow>();
    return row ? mapMessageMapping(row) : null;
  }

  async findByAdminChatMessage(
    adminChatId: number,
    adminMessageId: number,
  ): Promise<MessageMapping | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM message_mappings
         WHERE admin_chat_id = ? AND admin_message_id = ?
         ORDER BY id DESC
         LIMIT 1`,
      )
      .bind(adminChatId, adminMessageId)
      .first<MessageMappingRow>();
    return row ? mapMessageMapping(row) : null;
  }

  async findByUserMessage(sessionId: number, userMessageId: number): Promise<MessageMapping | null> {
    const row = await this.db
      .prepare("SELECT * FROM message_mappings WHERE session_id = ? AND user_message_id = ?")
      .bind(sessionId, userMessageId)
      .first<MessageMappingRow>();
    return row ? mapMessageMapping(row) : null;
  }
}

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    userChatId: row.user_chat_id,
    topicId: row.topic_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    muteMode: row.mute_mode,
    deleteInterceptEnabled: row.delete_intercept_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageMapping(row: MessageMappingRow): MessageMapping {
  return {
    id: row.id,
    sessionId: row.session_id,
    userMessageId: row.user_message_id,
    adminChatId: row.admin_chat_id,
    adminTopicId: row.admin_topic_id,
    adminMessageId: row.admin_message_id,
    direction: row.direction,
    createdAt: row.created_at,
  };
}
