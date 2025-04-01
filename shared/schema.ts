import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define JuzStatus type for tracking reading progress
export type JuzStatus = 'completed' | 'partial' | 'not-started';

// Define JuzMapItem interface for visualization
export interface JuzMapItem {
  juzNumber: number;
  status: JuzStatus;
  pagesRead: number;
  totalPages: number;
  percentComplete: number;
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const readingLogs = pgTable("reading_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull().defaultNow(),
  juzNumber: integer("juz_number").notNull(),
  pagesRead: integer("pages_read").notNull(),
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReadingLogSchema = createInsertSchema(readingLogs).pick({
  userId: true,
  date: true,
  juzNumber: true,
  pagesRead: true,
  startPage: true,
  endPage: true,
});

export type InsertReadingLog = z.infer<typeof insertReadingLogSchema>;
export type ReadingLog = typeof readingLogs.$inferSelect;

export const readingGoals = pgTable("reading_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalPages: integer("total_pages").notNull().default(604), // Default total pages in Quran
  dailyTarget: integer("daily_target").notNull().default(5),
  weeklyTarget: integer("weekly_target").notNull().default(35),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertReadingGoalSchema = createInsertSchema(readingGoals).pick({
  userId: true,
  totalPages: true,
  dailyTarget: true,
  weeklyTarget: true,
  isActive: true,
});

export type InsertReadingGoal = z.infer<typeof insertReadingGoalSchema>;
export type ReadingGoal = typeof readingGoals.$inferSelect;
