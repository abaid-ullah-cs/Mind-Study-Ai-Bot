import {
  users,
  workspaces,
  workspaceMembers,
  channels,
  messages,
  threads,
  bookmarks,
  studyProgress,
  type User,
  type InsertUser,
  type InsertWorkspace,
  type Workspace,
  type InsertChannel,
  type Channel,
  type InsertMessage,
  type Message,
  type InsertThread,
  type Thread,
  type InsertBookmark,
  type Bookmark,
  type InsertStudyProgress,
  type StudyProgress,
  type WorkspaceMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserResetToken(id: number, token: string, expiry: Date): Promise<void>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Workspace operations
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getUserWorkspaces(userId: number): Promise<(Workspace & { memberCount: number })[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  addWorkspaceMember(workspaceId: number, userId: number, role?: string): Promise<WorkspaceMember>;
  getWorkspaceMembers(workspaceId: number): Promise<(WorkspaceMember & { user: User })[]>;
  
  // Channel operations
  createChannel(channel: InsertChannel): Promise<Channel>;
  getWorkspaceChannels(workspaceId: number): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getChannelMessages(channelId: number, limit?: number): Promise<(Message & { author: User | null })[]>;
  getMessage(id: number): Promise<Message | undefined>;
  
  // Thread operations
  createThread(thread: InsertThread): Promise<Thread>;
  getMessageThreads(messageId: number): Promise<(Thread & { author: User | null })[]>;
  
  // Bookmark operations
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  removeBookmark(userId: number, messageId: number): Promise<void>;
  getUserBookmarks(userId: number): Promise<(Bookmark & { message: Message })[]>;
  
  // Study progress operations
  getStudyProgress(userId: number, channelId: number): Promise<StudyProgress | undefined>;
  updateStudyProgress(userId: number, channelId: number, progress: Partial<InsertStudyProgress>): Promise<StudyProgress>;
  getUserDailyProgress(userId: number): Promise<{ channelName: string; progress: StudyProgress }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password, resetToken: null, resetTokenExpiry: null, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserResetToken(id: number, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Workspace operations
  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db
      .insert(workspaces)
      .values(workspace)
      .returning();
    return newWorkspace;
  }

  async getUserWorkspaces(userId: number): Promise<(Workspace & { memberCount: number })[]> {
    const result = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        description: workspaces.description,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        memberCount: sql<number>`count(${workspaceMembers.userId})::int`,
      })
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaces.ownerId, userId))
      .groupBy(workspaces.id);
    
    return result;
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async addWorkspaceMember(workspaceId: number, userId: number, role: string = "member"): Promise<WorkspaceMember> {
    const [member] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role })
      .returning();
    return member;
  }

  async getWorkspaceMembers(workspaceId: number): Promise<(WorkspaceMember & { user: User })[]> {
    const result = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    
    return result.map((row) => ({
      ...row.workspace_members,
      user: row.users,
    }));
  }

  // Channel operations
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db
      .insert(channels)
      .values(channel)
      .returning();
    return newChannel;
  }

  async getWorkspaceChannels(workspaceId: number): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId))
      .orderBy(channels.name);
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getChannelMessages(channelId: number, limit: number = 50): Promise<(Message & { author: User | null })[]> {
    const result = await db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return result.map((row) => ({
      ...row.messages,
      author: row.users,
    }));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  // Thread operations
  async createThread(thread: InsertThread): Promise<Thread> {
    const [newThread] = await db
      .insert(threads)
      .values(thread)
      .returning();
    return newThread;
  }

  async getMessageThreads(messageId: number): Promise<(Thread & { author: User | null })[]> {
    const result = await db
      .select()
      .from(threads)
      .leftJoin(users, eq(threads.authorId, users.id))
      .where(eq(threads.parentMessageId, messageId))
      .orderBy(threads.createdAt);
    
    return result.map((row) => ({
      ...row.threads,
      author: row.users,
    }));
  }

  // Bookmark operations
  async createBookmark(bookmark: InsertBookmark): Promise<Bookmark> {
    const [newBookmark] = await db
      .insert(bookmarks)
      .values(bookmark)
      .returning();
    return newBookmark;
  }

  async removeBookmark(userId: number, messageId: number): Promise<void> {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.messageId, messageId)));
  }

  async getUserBookmarks(userId: number): Promise<(Bookmark & { message: Message })[]> {
    const result = await db
      .select()
      .from(bookmarks)
      .innerJoin(messages, eq(bookmarks.messageId, messages.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));
    
    return result.map((row) => ({
      ...row.bookmarks,
      message: row.messages,
    }));
  }

  // Study progress operations
  async getStudyProgress(userId: number, channelId: number): Promise<StudyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.channelId, channelId)));
    return progress || undefined;
  }

  async updateStudyProgress(userId: number, channelId: number, progress: Partial<InsertStudyProgress>): Promise<StudyProgress> {
    const existing = await this.getStudyProgress(userId, channelId);
    
    if (existing) {
      const [updated] = await db
        .update(studyProgress)
        .set(progress)
        .where(and(eq(studyProgress.userId, userId), eq(studyProgress.channelId, channelId)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(studyProgress)
        .values({ userId, channelId, ...progress })
        .returning();
      return created;
    }
  }

  async getUserDailyProgress(userId: number): Promise<{ channelName: string; progress: StudyProgress }[]> {
    const result = await db
      .select({
        channelName: channels.name,
        progress: studyProgress,
      })
      .from(studyProgress)
      .innerJoin(channels, eq(studyProgress.channelId, channels.id))
      .where(eq(studyProgress.userId, userId));
    
    return result.map((row) => ({
      channelName: row.channelName,
      progress: row.progress,
    }));
  }
}

export const storage = new DatabaseStorage();