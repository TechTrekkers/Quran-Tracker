import { 
  users, type User, type InsertUser,
  readingLogs, type ReadingLog, type InsertReadingLog,
  readingGoals, type ReadingGoal, type InsertReadingGoal
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import postgres from "postgres";

export type JuzStatus = 'completed' | 'partial' | 'not-started';

export interface JuzMapItem {
  juzNumber: number;
  status: JuzStatus;
  pagesRead: number;
  totalPages: number;
  percentComplete: number;
}

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
  getDetailedJuzMap(userId: number): Promise<JuzMapItem[]>;
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
      .orderBy(desc(readingLogs.date), desc(readingLogs.createdAt));
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
      .orderBy(desc(readingLogs.date), desc(readingLogs.createdAt))
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
    // Get the detailed juz map
    const detailedMap = await this.getDetailedJuzMap(userId);
    
    // Convert to the simpler format
    return detailedMap.map(item => ({
      juzNumber: item.juzNumber,
      completed: item.status === 'completed'
    }));
  }
  
  async getDetailedJuzMap(userId: number): Promise<JuzMapItem[]> {
    // Get all reading logs for this user
    const logs = await this.getReadingLogs(userId);
    
    // Get total pages read to determine what khatma we're on
    const totalPagesRead = await this.getTotalPagesRead(userId);
    const currentKhatmaPages = totalPagesRead % 604; // 604 is total pages in Quran
    
    const juzMap = new Map<number, Set<number>>();
    const pagesPerJuz = 20; // Approximate
    
    // Initialize all 30 juz with empty sets
    for (let i = 1; i <= 30; i++) {
      juzMap.set(i, new Set<number>());
    }
    
    // Only consider logs that are part of the current khatma
    let remainingPages = currentKhatmaPages;
    const relevantLogs = [...logs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const currentKhatmaLogs = [];
    
    // Start from the oldest logs and work forward until we've covered all current khatma pages
    for (const log of relevantLogs) {
      if (remainingPages <= 0) break;
      
      const logPages = log.pagesRead;
      if (logPages <= remainingPages) {
        currentKhatmaLogs.push(log);
        remainingPages -= logPages;
      } else {
        // This log covers more pages than we have left, so we need to add it partially
        const partialLog = { ...log, pagesRead: remainingPages };
        currentKhatmaLogs.push(partialLog);
        remainingPages = 0;
      }
    }
    
    // Track pages read in each juz for the current khatma
    currentKhatmaLogs.forEach(log => {
      // Calculate start and end pages properly
      let startPage;
      if (log.startPage) {
        startPage = log.startPage;
      } else {
        // Calculate start page based on juz number with special cases
        if (log.juzNumber === 1) {
          startPage = 1; // Juz 1 starts at page 1
        } else if (log.juzNumber === 30) {
          startPage = 582; // Juz 30 starts at page 582
        } else {
          // For juz 2-29, account for juz 1 having 21 pages
          startPage = 22 + ((log.juzNumber - 2) * 20);
        }
      }
      const endPage = log.endPage || (startPage + log.pagesRead - 1);
      
      // For all pages in the log, determine which juz they belong to
      for (let page = startPage; page <= endPage; page++) {
        // Calculate which juz this page belongs to (1-based)
        let juzForPage;
        
        // Special cases for juz 1 (pages 1-21)
        if (page <= 21) {
          juzForPage = 1;
        }
        // Special cases for juz 30 (pages 582-604)
        else if (page >= 582) {
          juzForPage = 30;
        }
        // For pages in juz 2-29
        else {
          // Adjust calculation to account for juz 1 having 21 pages
          const adjustedPage = page - 21; // Subtract juz 1's pages
          juzForPage = Math.floor(adjustedPage / 20) + 2; // +2 because we start at juz 2
        }
        
        // Get the set of pages for that juz
        const juzPages = juzMap.get(juzForPage) || new Set<number>();
        
        // Add this page to the appropriate juz
        juzPages.add(page);
        
        // Update the juz map
        juzMap.set(juzForPage, juzPages);
      }
    });
    
    // Create detailed map with completion status
    return Array.from(juzMap.entries()).map(([juzNumber, pages]) => {
      const pagesRead = pages.size;
      
      // Handle special cases for juz 1 and juz 30
      let totalPagesInJuz = 20;
      if (juzNumber === 1) {
        totalPagesInJuz = 21;
      } else if (juzNumber === 30) {
        totalPagesInJuz = 23;
      }
      
      const percentComplete = Math.round((pagesRead / totalPagesInJuz) * 100);
      
      let status: JuzStatus = 'not-started';
      if (pagesRead >= totalPagesInJuz) {
        status = 'completed';
      } else if (pagesRead > 0) {
        status = 'partial';
      }
      
      return {
        juzNumber,
        status,
        pagesRead,
        totalPages: totalPagesInJuz,
        percentComplete
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
      
      // Get proper start page based on juz number
      let startPage;
      if (juzNumber === 1) {
        startPage = 1; // Juz 1 starts at page 1
      } else if (juzNumber === 30) {
        startPage = 582; // Juz 30 starts at page 582
      } else {
        // For juz 2-29, account for juz 1 having 21 pages
        startPage = 22 + ((juzNumber - 2) * 20);
      }
      
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
    const todayJuz = 5;
    const todayPagesRead = 12;
    
    // Calculate correct start page for juz 5
    // Juz 5 starts after juz 1 (21 pages) and juz 2-4 (60 pages)
    const todayStartPage = 22 + ((todayJuz - 2) * 20);
    const todayEndPage = todayStartPage + todayPagesRead - 1;
    
    await this.createReadingLog({
      userId,
      date: today.toISOString().split('T')[0],
      juzNumber: todayJuz,
      pagesRead: todayPagesRead,
      startPage: todayStartPage,
      endPage: todayEndPage
    });
  }
}

export const storage = new PgStorage();
