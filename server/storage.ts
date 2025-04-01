import { 
  users, type User, type InsertUser,
  readingLogs, type ReadingLog, type InsertReadingLog,
  readingGoals, type ReadingGoal, type InsertReadingGoal
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private readingLogs: Map<number, ReadingLog>;
  private readingGoals: Map<number, ReadingGoal>;
  private userIdCounter: number;
  private logIdCounter: number;
  private goalIdCounter: number;

  constructor() {
    this.users = new Map();
    this.readingLogs = new Map();
    this.readingGoals = new Map();
    this.userIdCounter = 1;
    this.logIdCounter = 1;
    this.goalIdCounter = 1;
    
    // Create a default user for testing
    const defaultUser: User = {
      id: this.userIdCounter++,
      username: "user",
      password: "password"
    };
    this.users.set(defaultUser.id, defaultUser);
    
    // Create a default reading goal
    const defaultGoal: ReadingGoal = {
      id: this.goalIdCounter++,
      userId: defaultUser.id,
      totalPages: 604,
      dailyTarget: 5,
      weeklyTarget: 35,
      isActive: true,
      createdAt: new Date()
    };
    this.readingGoals.set(defaultGoal.id, defaultGoal);
    
    // Add some sample reading logs for the default user
    this.addSampleReadingLogs(defaultUser.id);
  }
  
  private addSampleReadingLogs(userId: number) {
    const today = new Date();
    
    // Generate some reading logs for the past 30 days
    for (let i = 30; i > 0; i--) {
      // Skip some days to simulate inconsistency
      if (i % 5 === 0) continue;
      
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      const juzNumber = Math.min(Math.floor(i / 3) + 1, 30);
      const pagesRead = Math.floor(Math.random() * 5) + 3;
      const startPage = (juzNumber - 1) * 20 + 1;
      const endPage = startPage + pagesRead - 1;
      
      const log: ReadingLog = {
        id: this.logIdCounter++,
        userId,
        date,
        juzNumber,
        pagesRead,
        startPage,
        endPage,
        createdAt: date
      };
      
      this.readingLogs.set(log.id, log);
    }
    
    // Add today's reading
    const log: ReadingLog = {
      id: this.logIdCounter++,
      userId,
      date: today,
      juzNumber: 5,
      pagesRead: 12,
      startPage: 81,
      endPage: 92,
      createdAt: today
    };
    
    this.readingLogs.set(log.id, log);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async createReadingLog(log: InsertReadingLog): Promise<ReadingLog> {
    const id = this.logIdCounter++;
    const readingLog: ReadingLog = { 
      ...log, 
      id, 
      createdAt: new Date() 
    };
    this.readingLogs.set(id, readingLog);
    return readingLog;
  }
  
  async getReadingLogs(userId: number): Promise<ReadingLog[]> {
    return Array.from(this.readingLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getReadingLogsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<ReadingLog[]> {
    return Array.from(this.readingLogs.values())
      .filter(log => 
        log.userId === userId && 
        new Date(log.date) >= startDate && 
        new Date(log.date) <= endDate
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async getReadingLogsByJuz(userId: number, juzNumber: number): Promise<ReadingLog[]> {
    return Array.from(this.readingLogs.values())
      .filter(log => log.userId === userId && log.juzNumber === juzNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getRecentReadingLogs(userId: number, limit: number): Promise<ReadingLog[]> {
    return Array.from(this.readingLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }
  
  async createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal> {
    const id = this.goalIdCounter++;
    const readingGoal: ReadingGoal = { 
      ...goal, 
      id, 
      createdAt: new Date() 
    };
    this.readingGoals.set(id, readingGoal);
    return readingGoal;
  }
  
  async getActiveReadingGoal(userId: number): Promise<ReadingGoal | undefined> {
    return Array.from(this.readingGoals.values())
      .find(goal => goal.userId === userId && goal.isActive);
  }
  
  async updateReadingGoal(id: number, goal: Partial<InsertReadingGoal>): Promise<ReadingGoal | undefined> {
    const existingGoal = this.readingGoals.get(id);
    if (!existingGoal) return undefined;
    
    const updatedGoal: ReadingGoal = { ...existingGoal, ...goal };
    this.readingGoals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  async getTotalPagesRead(userId: number): Promise<number> {
    const logs = await this.getReadingLogs(userId);
    return logs.reduce((sum, log) => sum + log.pagesRead, 0);
  }
  
  async getTotalKhatmas(userId: number): Promise<number> {
    const totalPages = await this.getTotalPagesRead(userId);
    // A khatma is a complete reading of the Quran (604 pages)
    return Math.floor(totalPages / 604);
  }
  
  async getJuzCompletion(userId: number): Promise<{ juzNumber: number, completed: boolean }[]> {
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
}

export const storage = new MemStorage();
