import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReadingLogSchema, insertReadingGoalSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get user reading logs
  app.get("/api/reading-logs", async (req: Request, res: Response) => {
    try {
      // For demo purposes, use default user with ID 1
      const userId = 1;
      const logs = await storage.getReadingLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching reading logs:", error);
      res.status(500).json({ message: "Failed to fetch reading logs" });
    }
  });
  
  // Get recent reading logs
  app.get("/api/reading-logs/recent", async (req: Request, res: Response) => {
    try {
      const userId = 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const logs = await storage.getRecentReadingLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching recent reading logs:", error);
      res.status(500).json({ message: "Failed to fetch recent reading logs" });
    }
  });
  
  // Create new reading log
  app.post("/api/reading-logs", async (req: Request, res: Response) => {
    try {
      // Parse and validate input
      const validatedData = insertReadingLogSchema.parse({
        ...req.body,
        userId: 1 // For demo purposes, use default user
      });
      
      const readingLog = await storage.createReadingLog(validatedData);
      res.status(201).json(readingLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating reading log:", error);
        res.status(500).json({ message: "Failed to create reading log" });
      }
    }
  });
  
  // Get reading logs by date range
  app.get("/api/reading-logs/date-range", async (req: Request, res: Response) => {
    try {
      const userId = 1;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const logs = await storage.getReadingLogsByDateRange(userId, startDate, endDate);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching reading logs by date range:", error);
      res.status(500).json({ message: "Failed to fetch reading logs by date range" });
    }
  });
  
  // Get reading stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const userId = 1;
      
      const totalPagesRead = await storage.getTotalPagesRead(userId);
      const totalKhatmas = await storage.getTotalKhatmas(userId);
      const juzCompletion = await storage.getJuzCompletion(userId);
      const completedJuz = juzCompletion.filter(j => j.completed).length;
      const currentStreak = await storage.getCurrentStreak(userId);
      const longestStreak = await storage.getLongestStreak(userId);
      const consistency = await storage.getConsistencyPercentage(userId, 30);
      
      res.json({
        totalPagesRead,
        totalKhatmas,
        completedJuz,
        currentStreak,
        longestStreak,
        consistency
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  // Get active reading goal
  app.get("/api/reading-goals/active", async (req: Request, res: Response) => {
    try {
      const userId = 1;
      const goal = await storage.getActiveReadingGoal(userId);
      
      if (!goal) {
        return res.status(404).json({ message: "No active reading goal found" });
      }
      
      const totalPagesRead = await storage.getTotalPagesRead(userId);
      const completionPercentage = Math.round((totalPagesRead / goal.totalPages) * 100);
      
      // Calculate weekly progress
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const weekLogs = await storage.getReadingLogsByDateRange(userId, startOfWeek, today);
      const weeklyPagesRead = weekLogs.reduce((sum, log) => sum + log.pagesRead, 0);
      const weeklyTargetCompletion = Math.round((weeklyPagesRead / goal.weeklyTarget) * 100);
      
      res.json({
        ...goal,
        completionPercentage,
        weeklyTargetCompletion
      });
    } catch (error) {
      console.error("Error fetching active reading goal:", error);
      res.status(500).json({ message: "Failed to fetch active reading goal" });
    }
  });
  
  // Update reading goal
  app.put("/api/reading-goals/:id", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      
      // Parse and validate input
      const validatedData = insertReadingGoalSchema.partial().parse({
        ...req.body,
        userId: 1 // For demo purposes, use default user
      });
      
      const updatedGoal = await storage.updateReadingGoal(goalId, validatedData);
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Reading goal not found" });
      }
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error updating reading goal:", error);
        res.status(500).json({ message: "Failed to update reading goal" });
      }
    }
  });
  
  // Create new reading goal
  app.post("/api/reading-goals", async (req: Request, res: Response) => {
    try {
      // Parse and validate input
      const validatedData = insertReadingGoalSchema.parse({
        ...req.body,
        userId: 1 // For demo purposes, use default user
      });
      
      const readingGoal = await storage.createReadingGoal(validatedData);
      res.status(201).json(readingGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error creating reading goal:", error);
        res.status(500).json({ message: "Failed to create reading goal" });
      }
    }
  });
  
  // Get detailed juz completion map
  app.get("/api/juz-map", async (req: Request, res: Response) => {
    try {
      const userId = 1;
      const juzMap = await storage.getDetailedJuzMap(userId);
      res.json(juzMap);
    } catch (error) {
      console.error("Error fetching juz map:", error);
      res.status(500).json({ message: "Failed to fetch juz map" });
    }
  });
  
  // Clear all reading data (for testing/reset purposes)
  app.post("/api/clear-data", async (req: Request, res: Response) => {
    try {
      // Delete all reading logs and reset the sequence
      await pool.query(`
        TRUNCATE reading_logs RESTART IDENTITY;
      `);
      
      // Reset total pages in the active reading goal
      const userId = 1;
      const activeGoal = await storage.getActiveReadingGoal(userId);
      
      if (activeGoal) {
        await storage.updateReadingGoal(activeGoal.id, {
          userId: activeGoal.userId,
          isActive: true, // Keep it active
          dailyTarget: activeGoal.dailyTarget, // Keep targets
          weeklyTarget: activeGoal.weeklyTarget,
          totalPages: 604 // Reset total pages to default
        });
      }
      
      // Re-initialize default user data if needed
      await storage.initializeDefaultData();
      
      res.json({ message: "All reading data has been cleared successfully." });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ message: "Failed to clear data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
