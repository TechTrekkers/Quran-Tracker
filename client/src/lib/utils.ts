import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const totalPagesInQuran = 604;
export const totalJuzInQuran = 30;

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTimeRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return formatDate(date);
  }
}

export function getJuzPageRange(juzNumber: number): { start: number; end: number } {
  // Special cases for juz 1 and juz 30 
  if (juzNumber === 1) {
    return { start: 1, end: 21 }; // Juz 1 has 21 pages
  } else if (juzNumber === 30) {
    return { start: 582, end: 604 }; // Juz 30 has 23 pages (582-604)
  }
  
  // Handle the rest of the juz (each with 20 pages)
  // Need to adjust calculations to account for juz 1 having 21 pages
  const startPage = 22 + ((juzNumber - 2) * 20);
  const endPage = startPage + 19; // 20 pages total (end - start + 1 = 20)
  
  return { start: startPage, end: endPage };
}

export function calculateHeatmapIntensity(pagesRead: number): number {
  // Calculate color intensity based on pages read
  if (pagesRead === 0) return 0;
  if (pagesRead <= 3) return 0.3;
  if (pagesRead <= 6) return 0.5;
  if (pagesRead <= 10) return 0.7;
  if (pagesRead <= 15) return 0.9;
  return 1;
}

// Generate calendar data for the past 'days'
export function generateCalendarData(days: number, readingLogs: any[]) {
  const today = new Date();
  const calendarData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Find any logs for this date
    const logsForDate = readingLogs.filter(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      return logDate === dateStr;
    });
    
    // Sum the pages read
    const pagesRead = logsForDate.reduce((sum, log) => sum + log.pagesRead, 0);
    
    calendarData.push({
      date,
      dateStr,
      pagesRead,
      intensity: calculateHeatmapIntensity(pagesRead)
    });
  }
  
  return calendarData;
}
