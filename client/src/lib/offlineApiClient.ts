import { clientStorage } from './clientStorage';

// Check if the app is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Wrapper for API requests that falls back to IndexedDB when offline
export async function offlineApiRequest<T>(url: string, options?: any): Promise<T> {
  // We're already in the offline fallback path, so go straight to offline handling
  console.log('Using offline data for:', url);
  return handleOfflineRequest<T>(url, options);
}

// Handle API requests when offline
async function handleOfflineRequest<T>(url: string, options?: any): Promise<T> {
  // Extract the endpoint from the URL
  const endpoint = url.split('/').pop();
  const isPost = options?.method === 'POST';
  const isPut = options?.method === 'PUT';
  
  switch (true) {
    // Reading logs endpoints
    case url.includes('/api/reading-logs') && !isPost && !endpoint?.includes('recent') && !endpoint?.includes('date-range'):
      return clientStorage.getReadingLogs() as unknown as T;
      
    case url.includes('/api/reading-logs/recent'):
      return clientStorage.getRecentReadingLogs(1, 10) as unknown as T;
      
    case url.includes('/api/reading-logs') && isPost:
      return clientStorage.createReadingLog(options.data) as unknown as T;
      
    case url.includes('/api/reading-logs/date-range'):
      const startDate = new URL(url, window.location.origin).searchParams.get('startDate');
      const endDate = new URL(url, window.location.origin).searchParams.get('endDate');
      if (startDate && endDate) {
        return clientStorage.getReadingLogsByDateRange(
          1, 
          new Date(startDate), 
          new Date(endDate)
        ) as unknown as T;
      }
      return [] as unknown as T;
    
    // Stats endpoints
    case url.includes('/api/stats'):
      const totalPagesRead = await clientStorage.getTotalPagesRead();
      const totalKhatmas = await clientStorage.getTotalKhatmas();
      const juzCompletion = await clientStorage.getJuzCompletion();
      const completedJuz = juzCompletion.filter(j => j.completed).length;
      const currentStreak = await clientStorage.getCurrentStreak();
      const longestStreak = await clientStorage.getLongestStreak();
      const consistency = await clientStorage.getConsistencyPercentage(1, 30);
      
      return {
        totalPagesRead,
        totalKhatmas,
        completedJuz,
        currentStreak,
        longestStreak,
        consistency
      } as unknown as T;
    
    // Juz map endpoint
    case url.includes('/api/juz-map'):
      return clientStorage.getDetailedJuzMap() as unknown as T;
    
    // Reading goals endpoints
    case url.includes('/api/reading-goals/active'):
      return clientStorage.getActiveReadingGoal() as unknown as T;
      
    case url.includes('/api/reading-goals') && isPost:
      return clientStorage.createReadingGoal(options.data) as unknown as T;
      
    case url.includes('/api/reading-goals/') && isPut:
      const goalId = parseInt(url.split('/').pop() || '0');
      return clientStorage.updateReadingGoal(goalId, options.data) as unknown as T;
    
    // Clear data endpoint  
    case url.includes('/api/clear-data') && isPost:
      await clientStorage.clearAllData();
      return { message: 'All reading data has been cleared.' } as unknown as T;
      
    default:
      throw new Error(`Offline mode: Cannot handle request to ${url}`);
  }
}