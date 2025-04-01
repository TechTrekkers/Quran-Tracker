import { 
  users, type User, type InsertUser,
  readingLogs, type ReadingLog, type InsertReadingLog,
  readingGoals, type ReadingGoal, type InsertReadingGoal
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import postgres from "postgres";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Reading log operations
  createReadingLog(log: InsertReadingLog): Promise<ReadingLog>;
  getReadingLogs(userId: number): Promise<ReadingLog[]>;
  getReadingLogsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<ReadingLog[]>;
  getReadingLogsByJuz(userId: number, juzNumber: number): Promise<ReadingLog[]>;
  getRecentReadingLogs(userId: number, limit: number): Promise<ReadingLog[]>;
  
  // Reading goals operations
  createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal>;
  getActiveReadingGoal(userId: number): Promise<ReadingGoal | undefined>;
  updateReadingGoal(id: number, goal: Partial<InsertReadingGoal>): Promise<ReadingGoal | undefined>;
  
  // Analytics operations
  getTotalPagesRead(userId: number): Promise<number>;
  getTotalKhatmas(userId: number): Promise<number>;
  getJuzCompletion(userId: number): Promise<{ juzNumber: number, completed: boolean }[]>;
  getCurrentStreak(userId: number): Promise<number>;
  getLongestStreak(userId: number): Promise<number>;
  getConsistencyPercentage(userId: number, days: number): Promise<number>;
  
  // Database initialization
  initializeDefaultData(): Promise<void>;
}

// Initialize PostgreSQL client and Drizzle ORM
const queryClient = postgres(process.env.DATABASE_URL as string);
const db = drizzle(queryClient);

export class PgStorage implements IStorage {
  constructor() {}

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  
  // Reading log operations
  async createReadingLog(log: InsertReadingLog): Promise<ReadingLog> {
    const result = await db.insert(readingLogs).values(log).returning();
    return result[0];
  }
  
  async getReadingLogs(userId: number): Promise<ReadingLog[]> {
    return db.select()
      .from(readingLogs)
      .where(eq(readingLogs.userId, userId))
      .orderBy(desc(readingLogs.date));
  }
  
  async getReadingLogsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<ReadingLog[]> {
    return db.select()
      .from(readingLogs)
      .where(
        and(
          eq(readingLogs.userId, userId),
          gte(readingLogs.date, startDate.toISOString().split('T')[0]),
          lte(readingLogs.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(readingLogs.date);
  }
  
  async getReadingLogsByJuz(userId: number, juzNumber: number): Promise<ReadingLog[]> {
    return db.select()
      .from(readingLogs)
      .where(
        and(
          eq(readingLogs.userId, userId),
          eq(readingLogs.juzNumber, juzNumber)
        )
      )
      .orderBy(desc(readingLogs.date));
  }
  
  async getRecentReadingLogs(userId: number, limit: number): Promise<ReadingLog[]> {
    return db.select()
      .from(readingLogs)
      .where(eq(readingLogs.userId, userId))
      .orderBy(desc(readingLogs.date))
      .limit(limit);
  }
  
  // Reading goals operations
  async createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal> {
    // If this is marked as active, deactivate all other goals for this user
    if (goal.isActive) {
      await db.update(readingGoals)
        .set({ isActive: false })
        .where(eq(readingGoals.userId, goal.userId));
    }
    
    const result = await db.insert(readingGoals).values(goal).returning();
    return result[0];
  }
  
  async getActiveReadingGoal(userId: number): Promise<ReadingGoal | undefined> {
    const result = await db.select()
      .from(readingGoals)
      .where(
        and(
          eq(readingGoals.userId, userId),
          eq(readingGoals.isActive, true)
        )
      );
    return result[0];
  }
  
  async updateReadingGoal(id: number, goal: Partial<InsertReadingGoal>): Promise<ReadingGoal | undefined> {
    // If this is being marked as active, deactivate all other goals for this user
    if (goal.isActive) {
      const existingGoal = await db.select()
        .from(readingGoals)
        .where(eq(readingGoals.id, id))
        .then(res => res[0]);
      
      if (existingGoal) {
        await db.update(readingGoals)
          .set({ isActive: false })
          .where(and(
            eq(readingGoals.userId, existingGoal.userId),
            sql`${readingGoals.id} != ${id}`
          ));
      }
    }
    
    const result = await db.update(readingGoals)
      .set(goal)
      .where(eq(readingGoals.id, id))
      .returning();
      
    return result[0];
  }
  
  // Analytics operations
  async getTotalPagesRead(userId: number): Promise<number> {
    const result = await db.select({
      totalPages: sql<number>`SUM(${readingLogs.pagesRead})`
    })
    .from(readingLogs)
    .where(eq(readingLogs.userId, userId));
    
    return result[0]?.totalPages || 0;
  }
  
  async getTotalKhatmas(userId: number): Promise<number> {
    const totalPages = await this.getTotalPagesRead(userId);
    // A khatma is a complete reading of the Quran (604 pages)
    return Math.floor(totalPages / 604);
  }
  
  async getJuzCompletion(userId: number): Promise<{ juzNumber: number, completed: boolean }[]> {
    // Get all reading logs for this user
    const logs = await this.getReadingLogs(userId);
    const juzMap = new Map<number, Set<number>>();
    
    // Initialize all 30 juz with empty sets
    for (let i = 1; i <= 30; i++) {
      juzMap.set(i, new Set<number>());
    }
    
    // Track pages read in each juz
    logs.forEach(log => {
      const juzPages = juzMap.get(log.juzNumber) || new Set<number>();
      
      if (log.startPage && log.endPage) {
        for (let page = log.startPage; page <= log.endPage; page++) {
          juzPages.add(page);
        }
      } else {
        // If specific pages aren't tracked, estimate based on juz number and pages read
        const startPage = (log.juzNumber - 1) * 20 + 1;
        for (let i = 0; i < log.pagesRead; i++) {
          juzPages.add(startPage + i);
        }
      }
      
      juzMap.set(log.juzNumber, juzPages);
    });
    
    // Check if each juz is completed (typically 20 pages per juz)
    return Array.from(juzMap.entries()).map(([juzNumber, pages]) => {
      // Consider a juz completed if all pages (about 20) are read
      const pagesInJuz = 20;
      return {
        juzNumber,
        completed: pages.size >= pagesInJuz
      };
    });
  }
  
  async getCurrentStreak(userId: number): Promise<number> {
    const logs = await this.getReadingLogs(userId);
    if (logs.length === 0) return 0;
    
    // Group logs by date
    const dateMap = new Map<string, boolean>();
    logs.forEach(log => {
      const dateStr = new Date(log.date).toISOString().split('T')[0];
      dateMap.set(dateStr, true);
    });
    
    const today = new Date();
    let streak = 0;
    
    // Check each day from today backwards
    for (let i = 0; i < 366; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      if (dateMap.has(checkDateStr)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  async getLongestStreak(userId: number): Promise<number> {
    const logs = await this.getReadingLogs(userId);
    if (logs.length === 0) return 0;
    
    // Sort logs by date
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group logs by date to handle multiple entries per day
    const dateMap = new Map<string, boolean>();
    sortedLogs.forEach(log => {
      const dateStr = new Date(log.date).toISOString().split('T')[0];
      dateMap.set(dateStr, true);
    });
    
    const dates = Array.from(dateMap.keys()).map(d => new Date(d));
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    let longestStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      
      // Check if dates are consecutive
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        currentStreak = 1;
      }
    }
    
    return Math.max(longestStreak, currentStreak);
  }
  
  async getConsistencyPercentage(userId: number, days: number): Promise<number> {
    // Get reading logs within specified days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    
    const logs = await this.getReadingLogsByDateRange(userId, startDate, endDate);
    
    // Group by date to count unique days
    const uniqueDates = new Set<string>();
    logs.forEach(log => {
      const dateStr = new Date(log.date).toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });
    
    // Calculate consistency percentage
    const daysRead = uniqueDates.size;
    return Math.round((daysRead / days) * 100);
  }
  
  // Initialize default data
  async initializeDefaultData(): Promise<void> {
    try {
      // Check if we already have a default user
      const existingUser = await this.getUserByUsername("user");
      
      if (!existingUser) {
        // Create default user
        const defaultUser = await this.createUser({
          username: "user",
          password: "password"
        });
        
        // Create default reading goal
        await this.createReadingGoal({
          userId: defaultUser.id,
          totalPages: 604,
          dailyTarget: 5,
          weeklyTarget: 35,
          isActive: true
        });
        
        // Add sample reading logs
        await this.addSampleReadingLogs(defaultUser.id);
      }
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }
  
  private async addSampleReadingLogs(userId: number) {
    const today = new Date();
    
    // Generate some reading logs for the past 30 days
    for (let i = 30; i > 0; i--) {
      // Skip some days to simulate inconsistency
      if (i % 5 === 0) continue;
      
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const juzNumber = Math.min(Math.floor(i / 3) + 1, 30);
      const pagesRead = Math.floor(Math.random() * 5) + 3;
      const startPage = (juzNumber - 1) * 20 + 1;
      const endPage = startPage + pagesRead - 1;
      
      await this.createReadingLog({
        userId,
        date: dateStr,
        juzNumber,
        pagesRead,
        startPage,
        endPage
      });
    }
    
    // Add today's reading
    await this.createReadingLog({
      userId,
      date: today.toISOString().split('T')[0],
      juzNumber: 5,
      pagesRead: 12,
      startPage: 81,
      endPage: 92
    });
  }
}

export const storage = new PgStorage();
