import { db } from './db';
import type { 
  ReadingLog, ReadingGoal, User,
  InsertReadingLog, InsertReadingGoal, InsertUser 
} from '@shared/schema';
import { JuzMapItem, JuzStatus } from '@shared/schema';
import { getJuzPageRange, totalJuzInQuran } from './utils';

// Client-side implementation of the storage interface
export class ClientStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return db.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.getUserByUsername(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.createUser({
      ...insertUser,
      createdAt: new Date().toISOString()
    } as any);
  }
  
  // Reading log operations
  async createReadingLog(log: InsertReadingLog): Promise<ReadingLog> {
    return db.createReadingLog({
      ...log,
      userId: 1, // Default user ID for client-side storage
      createdAt: new Date().toISOString()
    } as any);
  }
  
  async getReadingLogs(userId: number = 1): Promise<ReadingLog[]> {
    const logs = await db.getReadingLogs(userId);
    // Sort by date (newest first), then by createdAt (newest first)
    return logs.sort((a, b) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }
  
  async getReadingLogsByDateRange(
    userId: number = 1, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReadingLog[]> {
    return db.getReadingLogsByDateRange(userId, startDate, endDate);
  }
  
  async getReadingLogsByJuz(userId: number = 1, juzNumber: number): Promise<ReadingLog[]> {
    return db.getReadingLogsByJuz(userId, juzNumber);
  }
  
  async getRecentReadingLogs(userId: number = 1, limit: number = 10): Promise<ReadingLog[]> {
    return db.getRecentReadingLogs(userId, limit);
  }
  
  // Reading goals operations
  async createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal> {
    // Deactivate any existing active goals first
    const activeGoal = await this.getActiveReadingGoal(1);
    if (activeGoal) {
      await db.updateReadingGoal(activeGoal.id, { isActive: false });
    }
    
    return db.createReadingGoal({
      ...goal,
      userId: 1, // Default user ID for client-side storage
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
  }
  
  async getActiveReadingGoal(userId: number = 1): Promise<ReadingGoal | undefined> {
    return db.getActiveReadingGoal(userId);
  }
  
  async updateReadingGoal(id: number, goal: Partial<InsertReadingGoal>): Promise<ReadingGoal | undefined> {
    return db.updateReadingGoal(id, {
      ...goal,
      updatedAt: new Date().toISOString()
    } as any);
  }
  
  // Analytics operations
  async getTotalPagesRead(userId: number = 1): Promise<number> {
    return db.getTotalPagesRead(userId);
  }
  
  async getTotalKhatmas(userId: number = 1): Promise<number> {
    return db.getTotalKhatmas(userId);
  }
  
  async getJuzCompletion(userId: number = 1): Promise<{ juzNumber: number, completed: boolean }[]> {
    const logs = await this.getReadingLogs(userId);
    const totalPages = await this.getTotalPagesRead(userId);
    const khatmas = Math.floor(totalPages / 604);
    
    // Get pages read for the current khatma (after the last complete khatma)
    const pagesInCurrentKhatma = totalPages - (khatmas * 604);
    
    // Track which juz have been completed in the current khatma
    const juzCompletion: { juzNumber: number, completed: boolean }[] = [];
    
    // Initialize all juz as not completed
    for (let i = 1; i <= totalJuzInQuran; i++) {
      juzCompletion.push({ juzNumber: i, completed: false });
    }
    
    if (pagesInCurrentKhatma === 0) {
      // If we just completed a khatma, all juz are marked as not completed for the new khatma
      return juzCompletion;
    }
    
    // Calculate which juz have been completed in the current khatma
    let accumulatedPages = 0;
    
    for (let juzNum = 1; juzNum <= totalJuzInQuran; juzNum++) {
      const { start, end } = getJuzPageRange(juzNum);
      const juzSize = end - start + 1;
      
      accumulatedPages += juzSize;
      
      if (accumulatedPages <= pagesInCurrentKhatma) {
        // This juz has been completed in the current khatma
        juzCompletion[juzNum - 1].completed = true;
      } else if (accumulatedPages - juzSize < pagesInCurrentKhatma) {
        // This juz has been partially read in the current khatma
        // For simplicity, we consider it not completed
        juzCompletion[juzNum - 1].completed = false;
      }
    }
    
    return juzCompletion;
  }
  
  async getDetailedJuzMap(userId: number = 1): Promise<JuzMapItem[]> {
    // Get total pages read in all khatmas
    const totalPages = await this.getTotalPagesRead(userId);
    
    // Calculate completed khatmas
    const khatmas = Math.floor(totalPages / 604);
    
    // Pages read in current khatma (after last complete khatma)
    const pagesInCurrentKhatma = totalPages - (khatmas * 604);
    
    // Create the juz map
    const juzMap: JuzMapItem[] = [];
    
    // Initialize the map with status for each juz
    let accumulatedPages = 0;
    
    for (let juzNum = 1; juzNum <= totalJuzInQuran; juzNum++) {
      const { start, end } = getJuzPageRange(juzNum);
      const juzSize = end - start + 1;
      
      // Calculate how many pages of this juz have been read in the current khatma
      let pagesReadInJuz = 0;
      if (accumulatedPages < pagesInCurrentKhatma) {
        pagesReadInJuz = Math.min(pagesInCurrentKhatma - accumulatedPages, juzSize);
      }
      
      accumulatedPages += juzSize;
      
      // Determine the status
      let status: JuzStatus = 'not-started';
      if (pagesReadInJuz === juzSize) {
        status = 'completed';
      } else if (pagesReadInJuz > 0) {
        status = 'partial';
      }
      
      juzMap.push({
        juzNumber: juzNum,
        status,
        pagesRead: pagesReadInJuz,
        totalPages: juzSize,
        percentComplete: (pagesReadInJuz / juzSize) * 100
      });
    }
    
    return juzMap;
  }
  
  async getCurrentStreak(userId: number = 1): Promise<number> {
    return db.getCurrentStreak(userId);
  }
  
  async getLongestStreak(userId: number = 1): Promise<number> {
    // For simplicity in this client implementation, we'll use the current streak
    // A complete implementation would track the longest streak historically
    return this.getCurrentStreak(userId);
  }
  
  async getConsistencyPercentage(userId: number = 1, days: number = 30): Promise<number> {
    // Calculate how many days in the last 'days' period had reading activity
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logs = await this.getReadingLogsByDateRange(userId, startDate, endDate);
    
    // Count unique days with reading activity
    const uniqueDays = new Set<string>();
    logs.forEach(log => uniqueDays.add(log.date));
    
    // Calculate consistency percentage
    return (uniqueDays.size / days) * 100;
  }
  
  // Database initialization
  async initializeDefaultData(): Promise<void> {
    await db.initializeDefaultData();
  }
  
  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    await db.readingLogs.clear();
    await db.readingGoals.clear();
    
    // Re-initialize with default reading goal
    const user = await db.users.get(1);
    if (user) {
      await db.readingGoals.add({
        userId: user.id,
        dailyTarget: 10,
        weeklyTarget: 50,
        totalPages: 604,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);
    }
  }
}

// Export a singleton instance
export const clientStorage = new ClientStorage();