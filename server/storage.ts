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
  type UpsertUser,
  type Workspace,
  type InsertWorkspace,
  type Channel,
  type InsertChannel,
  type Message,
  type InsertMessage,
  type Thread,
  type InsertThread,
  type Bookmark,
  type InsertBookmark,
  type StudyProgress,
  type InsertStudyProgress,
  type WorkspaceMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Workspace operations
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getUserWorkspaces(userId: string): Promise<(Workspace & { memberCount: number })[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  addWorkspaceMember(workspaceId: number, userId: string, role?: string): Promise<WorkspaceMember>;
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
  removeBookmark(userId: string, messageId: number): Promise<void>;
  getUserBookmarks(userId: string): Promise<(Bookmark & { message: Message })[]>;
  
  // Study progress operations
  getStudyProgress(userId: string, channelId: number): Promise<StudyProgress | undefined>;
  updateStudyProgress(userId: string, channelId: number, progress: Partial<InsertStudyProgress>): Promise<StudyProgress>;
  getUserDailyProgress(userId: string): Promise<{ channelName: string; progress: StudyProgress }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Workspace operations
  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    
    // Add owner as admin member
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId: workspace.ownerId,
      role: "admin",
    });
    
    return newWorkspace;
  }

  async getUserWorkspaces(userId: string): Promise<(Workspace & { memberCount: number })[]> {
    const result = await db
      .select({
        workspace: workspaces,
        memberCount: sql<number>`count(${workspaceMembers.userId})`,
      })
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        eq(workspaceMembers.userId, userId)
      )
      .groupBy(workspaces.id)
      .orderBy(desc(workspaces.createdAt));

    return result.map(row => ({
      ...row.workspace,
      memberCount: row.memberCount || 0,
    }));
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async addWorkspaceMember(workspaceId: number, userId: string, role: string = "member"): Promise<WorkspaceMember> {
    const [member] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role })
      .returning();
    return member;
  }

  async getWorkspaceMembers(workspaceId: number): Promise<(WorkspaceMember & { user: User })[]> {
    return await db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        user: users,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  // Channel operations
  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
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
    return channel;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getChannelMessages(channelId: number, limit: number = 50): Promise<(Message & { author: User | null })[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        messageType: messages.messageType,
        metadata: messages.metadata,
        isAi: messages.isAi,
        aiPrompt: messages.aiPrompt,
        createdAt: messages.createdAt,
        author: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  // Thread operations
  async createThread(thread: InsertThread): Promise<Thread> {
    const [newThread] = await db.insert(threads).values(thread).returning();
    return newThread;
  }

  async getMessageThreads(messageId: number): Promise<(Thread & { author: User | null })[]> {
    return await db
      .select({
        id: threads.id,
        parentMessageId: threads.parentMessageId,
        content: threads.content,
        authorId: threads.authorId,
        isAi: threads.isAi,
        createdAt: threads.createdAt,
        author: users,
      })
      .from(threads)
      .leftJoin(users, eq(threads.authorId, users.id))
      .where(eq(threads.parentMessageId, messageId))
      .orderBy(threads.createdAt);
  }

  // Bookmark operations
  async createBookmark(bookmark: InsertBookmark): Promise<Bookmark> {
    const [newBookmark] = await db.insert(bookmarks).values(bookmark).returning();
    return newBookmark;
  }

  async removeBookmark(userId: string, messageId: number): Promise<void> {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.messageId, messageId)));
  }

  async getUserBookmarks(userId: string): Promise<(Bookmark & { message: Message })[]> {
    return await db
      .select({
        id: bookmarks.id,
        userId: bookmarks.userId,
        messageId: bookmarks.messageId,
        createdAt: bookmarks.createdAt,
        message: messages,
      })
      .from(bookmarks)
      .innerJoin(messages, eq(bookmarks.messageId, messages.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));
  }

  // Study progress operations
  async getStudyProgress(userId: string, channelId: number): Promise<StudyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.channelId, channelId)));
    return progress;
  }

  async updateStudyProgress(userId: string, channelId: number, progress: Partial<InsertStudyProgress>): Promise<StudyProgress> {
    const existing = await this.getStudyProgress(userId, channelId);
    
    if (existing) {
      const [updated] = await db
        .update(studyProgress)
        .set({ ...progress, lastActivity: new Date() })
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

  async getUserDailyProgress(userId: string): Promise<{ channelName: string; progress: StudyProgress }[]> {
    return await db
      .select({
        channelName: channels.name,
        progress: studyProgress,
      })
      .from(studyProgress)
      .innerJoin(channels, eq(studyProgress.channelId, channels.id))
      .where(eq(studyProgress.userId, userId))
      .orderBy(desc(studyProgress.lastActivity));
  }
}

export const storage = new DatabaseStorage();
