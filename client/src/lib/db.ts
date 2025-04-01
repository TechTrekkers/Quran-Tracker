import Dexie from 'dexie';
import { User, ReadingLog, ReadingGoal } from '@shared/schema';

// Define the interface for our database
export class QuranTrackerDatabase extends Dexie {
  users: Dexie.Table<User, number>;
  readingLogs: Dexie.Table<ReadingLog, number>;
  readingGoals: Dexie.Table<ReadingGoal, number>;

  constructor() {
    super('QuranTracker');
    
    this.version(1).stores({
      users: '++id,username',
      readingLogs: '++id,userId,date,juzNumber',
      readingGoals: '++id,userId,isActive'
    });
  }
  
  // Helper methods for users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.where('username').equals(username).first();
  }
  
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const id = await this.users.add(user as any);
    return { ...user, id } as User;
  }
  
  // Helper methods for reading logs
  async getReadingLogs(userId: number): Promise<ReadingLog[]> {
    return this.readingLogs.where('userId').equals(userId).toArray();
  }
  
  async getReadingLogsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<ReadingLog[]> {
    return this.readingLogs
      .where('userId').equals(userId)
      .and(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      })
      .toArray();
  }
  
  async getReadingLogsByJuz(userId: number, juzNumber: number): Promise<ReadingLog[]> {
    return this.readingLogs
      .where('userId').equals(userId)
      .and(log => log.juzNumber === juzNumber)
      .toArray();
  }
  
  async getRecentReadingLogs(userId: number, limit: number): Promise<ReadingLog[]> {
    return this.readingLogs
      .where('userId').equals(userId)
      .reverse() // Sort by id in descending order (assuming newest have higher ids)
      .limit(limit)
      .toArray();
  }
  
  async createReadingLog(log: Omit<ReadingLog, 'id'>): Promise<ReadingLog> {
    const id = await this.readingLogs.add(log as any);
    return { ...log, id } as ReadingLog;
  }
  
  // Helper methods for reading goals
  async getActiveReadingGoal(userId: number): Promise<ReadingGoal | undefined> {
    return this.readingGoals
      .where('userId').equals(userId)
      .and(goal => goal.isActive === true)
      .first();
  }
  
  async createReadingGoal(goal: Omit<ReadingGoal, 'id'>): Promise<ReadingGoal> {
    const id = await this.readingGoals.add(goal as any);
    return { ...goal, id } as ReadingGoal;
  }
  
  async updateReadingGoal(id: number, goal: Partial<ReadingGoal>): Promise<ReadingGoal | undefined> {
    await this.readingGoals.update(id, goal);
    return this.readingGoals.get(id);
  }
  
  // Analytics methods
  async getTotalPagesRead(userId: number): Promise<number> {
    const logs = await this.getReadingLogs(userId);
    return logs.reduce((sum, log) => sum + log.pagesRead, 0);
  }
  
  async getTotalKhatmas(userId: number): Promise<number> {
    const totalPages = await this.getTotalPagesRead(userId);
    return Math.floor(totalPages / 604); // 604 pages in the Quran
  }
  
  async getCurrentStreak(userId: number): Promise<number> {
    // Implementation for streak calculation based on client-side data
    const logs = await this.getReadingLogs(userId);
    if (logs.length === 0) return 0;
    
    // Sort logs by date (newest first)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Group logs by date
    const dateMap = new Map<string, boolean>();
    sortedLogs.forEach(log => {
      dateMap.set(log.date, true);
    });

    const dates = Array.from(dateMap.keys())
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime()); // Sort descending
    
    if (dates.length === 0) return 0;
    
    // Check if most recent reading is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const mostRecentDate = dates[0];
    mostRecentDate.setHours(0, 0, 0, 0);
    
    const differenceInDays = Math.floor(
      (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // If the most recent reading is more than 1 day ago, streak is broken
    if (differenceInDays > 1) return 0;
    
    // Count consecutive days
    let streak = 1;
    let currentDate = mostRecentDate;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i]);
      prevDate.setHours(0, 0, 0, 0);
      
      const dayDifference = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (dayDifference === 1) {
        streak++;
        currentDate = prevDate;
      } else if (dayDifference === 0) {
        // Same day, continue with current streak and date
        continue;
      } else {
        // Gap in dates, streak ends
        break;
      }
    }
    
    return streak;
  }
  
  // Initialize default data for testing/demo
  async initializeDefaultData(): Promise<void> {
    // Check if we already have a user
    const userCount = await this.users.count();
    if (userCount > 0) {
      return; // Data already initialized
    }
    
    // Create default user
    const userId = await this.users.add({
      username: 'demo_user',
      name: 'Demo User',
      createdAt: new Date().toISOString()
    } as any);
    
    // Create default reading goal
    await this.readingGoals.add({
      userId,
      dailyTarget: 10,
      weeklyTarget: 50,
      totalPages: 604,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
    
    // Initialize with default data if needed
    await this.addSampleReadingLogs(userId);
  }
  
  private async addSampleReadingLogs(userId: number): Promise<void> {
    // Add sample reading logs for demonstration
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Sample reading from yesterday
    await this.readingLogs.add({
      userId,
      date: yesterday.toISOString().split('T')[0],
      juzNumber: 1,
      startPage: 1,
      endPage: 21,
      pagesRead: 21,
      createdAt: yesterday.toISOString()
    } as any);
    
    // Sample reading from today
    await this.readingLogs.add({
      userId,
      date: today.toISOString().split('T')[0],
      juzNumber: 2,
      startPage: 22,
      endPage: 41,
      pagesRead: 20,
      createdAt: today.toISOString()
    } as any);
  }
}

// Export the database instance
export const db = new QuranTrackerDatabase();

// Export a function to initialize the database
export async function initDatabase(): Promise<void> {
  try {
    await db.initializeDefaultData();
    console.log('IndexedDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
  }
}