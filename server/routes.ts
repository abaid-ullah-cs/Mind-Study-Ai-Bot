import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  generateStudyArticle, 
  generateQuiz, 
  generateThreadResponse, 
  getTermDefinition,
  generateStudyPlan
} from "./openai";
import { insertWorkspaceSchema, insertChannelSchema, insertMessageSchema, insertThreadSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Workspace routes
  app.get('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaces = await storage.getUserWorkspaces(userId);
      res.json(workspaces);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      res.status(500).json({ message: "Failed to fetch workspaces" });
    }
  });

  app.post('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const workspace = await storage.createWorkspace(data);
      res.json(workspace);
    } catch (error) {
      console.error("Error creating workspace:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create workspace" });
      }
    }
  });

  app.get('/api/workspaces/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const workspace = await storage.getWorkspace(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }
      
      res.json(workspace);
    } catch (error) {
      console.error("Error fetching workspace:", error);
      res.status(500).json({ message: "Failed to fetch workspace" });
    }
  });

  // Channel routes
  app.get('/api/workspaces/:workspaceId/channels', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const channels = await storage.getWorkspaceChannels(workspaceId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.post('/api/workspaces/:workspaceId/channels', isAuthenticated, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const data = insertChannelSchema.parse({
        ...req.body,
        workspaceId,
      });
      
      const channel = await storage.createChannel(data);
      res.json(channel);
    } catch (error) {
      console.error("Error creating channel:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create channel" });
      }
    }
  });

  // Message routes
  app.get('/api/channels/:channelId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChannelMessages(channelId, limit);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/channels/:channelId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.user.claims.sub;
      
      const data = insertMessageSchema.parse({
        ...req.body,
        channelId,
        authorId: userId,
      });
      
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create message" });
      }
    }
  });

  // AI routes
  app.post('/api/ai/generate-article', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, subject, channelId } = req.body;
      
      if (!prompt || !subject || !channelId) {
        return res.status(400).json({ message: "Missing required fields: prompt, subject, channelId" });
      }

      // Generate the article using OpenAI
      const article = await generateStudyArticle(prompt, subject);
      
      // Save the AI-generated message to the database
      const message = await storage.createMessage({
        content: JSON.stringify(article),
        channelId: parseInt(channelId),
        authorId: null, // AI message
        messageType: "article",
        isAi: true,
        aiPrompt: prompt,
      });

      // Update study progress
      const userId = req.user.claims.sub;
      const currentProgress = await storage.getStudyProgress(userId, parseInt(channelId));
      await storage.updateStudyProgress(userId, parseInt(channelId), {
        topicsStudied: (currentProgress?.topicsStudied || 0) + 1,
      });

      res.json({ message, article });
    } catch (error) {
      console.error("Error generating article:", error);
      res.status(500).json({ message: "Failed to generate article: " + (error as Error).message });
    }
  });

  app.post('/api/ai/generate-quiz', isAuthenticated, async (req: any, res) => {
    try {
      const { topic, subject, channelId, numQuestions = 5 } = req.body;
      
      if (!topic || !subject || !channelId) {
        return res.status(400).json({ message: "Missing required fields: topic, subject, channelId" });
      }

      // Generate the quiz using OpenAI
      const quiz = await generateQuiz(topic, subject, numQuestions);
      
      // Save the AI-generated quiz to the database
      const message = await storage.createMessage({
        content: JSON.stringify(quiz),
        channelId: parseInt(channelId),
        authorId: null, // AI message
        messageType: "quiz",
        isAi: true,
        aiPrompt: `Generate quiz: ${topic}`,
      });

      res.json({ message, quiz });
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz: " + (error as Error).message });
    }
  });

  app.post('/api/ai/generate-study-plan', isAuthenticated, async (req: any, res) => {
    try {
      const { subject, goals, timeframe } = req.body;
      
      if (!subject || !goals || !timeframe) {
        return res.status(400).json({ message: "Missing required fields: subject, goals, timeframe" });
      }

      const studyPlan = await generateStudyPlan(subject, goals, timeframe);
      res.json(studyPlan);
    } catch (error) {
      console.error("Error generating study plan:", error);
      res.status(500).json({ message: "Failed to generate study plan: " + (error as Error).message });
    }
  });

  app.post('/api/ai/term-definition', isAuthenticated, async (req: any, res) => {
    try {
      const { term } = req.body;
      
      if (!term) {
        return res.status(400).json({ message: "Missing required field: term" });
      }

      const definition = await getTermDefinition(term);
      res.json({ term, definition });
    } catch (error) {
      console.error("Error getting term definition:", error);
      res.status(500).json({ message: "Failed to get term definition: " + (error as Error).message });
    }
  });

  // Thread routes
  app.get('/api/messages/:messageId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const threads = await storage.getMessageThreads(messageId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  app.post('/api/messages/:messageId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      const data = insertThreadSchema.parse({
        ...req.body,
        parentMessageId: messageId,
        authorId: userId,
      });
      
      const thread = await storage.createThread(data);
      res.json(thread);
    } catch (error) {
      console.error("Error creating thread:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create thread" });
      }
    }
  });

  app.post('/api/ai/thread-response', isAuthenticated, async (req: any, res) => {
    try {
      const { question, messageId, subject } = req.body;
      
      if (!question || !messageId || !subject) {
        return res.status(400).json({ message: "Missing required fields: question, messageId, subject" });
      }

      // Get the original message for context
      const originalMessage = await storage.getMessage(parseInt(messageId));
      if (!originalMessage) {
        return res.status(404).json({ message: "Original message not found" });
      }

      const context = originalMessage.content;
      const response = await generateThreadResponse(question, context, subject);
      
      // Save AI response as a thread
      const thread = await storage.createThread({
        parentMessageId: parseInt(messageId),
        content: response,
        authorId: null, // AI response
        isAi: true,
      });

      res.json({ thread, response });
    } catch (error) {
      console.error("Error generating thread response:", error);
      res.status(500).json({ message: "Failed to generate thread response: " + (error as Error).message });
    }
  });

  // Bookmark routes
  app.post('/api/messages/:messageId/bookmark', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      const bookmark = await storage.createBookmark({
        userId,
        messageId,
      });
      
      res.json(bookmark);
    } catch (error) {
      console.error("Error creating bookmark:", error);
      res.status(500).json({ message: "Failed to create bookmark" });
    }
  });

  app.delete('/api/messages/:messageId/bookmark', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      await storage.removeBookmark(userId, messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing bookmark:", error);
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });

  app.get('/api/bookmarks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookmarks = await storage.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  // Study progress routes
  app.get('/api/study-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserDailyProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ message: "Failed to fetch study progress" });
    }
  });

  app.get('/api/channels/:channelId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.user.claims.sub;
      
      const progress = await storage.getStudyProgress(userId, channelId);
      res.json(progress || { topicsStudied: 0, dailyGoal: 5 });
    } catch (error) {
      console.error("Error fetching channel progress:", error);
      res.status(500).json({ message: "Failed to fetch channel progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
