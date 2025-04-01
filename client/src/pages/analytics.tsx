import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { totalJuzInQuran, totalPagesInQuran } from "@/lib/utils";
import ReadingChart from "@/components/reading-chart";

export default function Analytics() {
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/reading-logs'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats'],
  });

  // Calculate daily average pages
  const calculateDailyAverage = () => {
    if (!logs || logs.length === 0) return 0;
    
    const totalPages = logs.reduce((sum: number, log: any) => sum + log.pagesRead, 0);
    // Get unique dates
    const uniqueDates = new Set(logs.map((log: any) => new Date(log.date).toISOString().split('T')[0]));
    return Math.round((totalPages / uniqueDates.size) * 10) / 10; // Round to 1 decimal
  };

  // Calculate most productive day of week
  const calculateMostProductiveDay = () => {
    if (!logs || logs.length === 0) return { day: "N/A", pages: 0 };
    
    const dayMap: Record<number, { total: number; count: number }> = {
      0: { total: 0, count: 0 }, // Sunday
      1: { total: 0, count: 0 },
      2: { total: 0, count: 0 },
      3: { total: 0, count: 0 },
      4: { total: 0, count: 0 },
      5: { total: 0, count: 0 },
      6: { total: 0, count: 0 }, // Saturday
    };
    
    // Group by day of week
    logs.forEach((log: any) => {
      const date = new Date(log.date);
      const day = date.getDay();
      dayMap[day].total += log.pagesRead;
      dayMap[day].count += 1;
    });
    
    // Find day with highest average
    let maxAvg = 0;
    let maxDay = 0;
    for (let i = 0; i < 7; i++) {
      const avg = dayMap[i].count > 0 ? dayMap[i].total / dayMap[i].count : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        maxDay = i;
      }
    }
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return { day: days[maxDay], pages: Math.round(maxAvg * 10) / 10 };
  };

  const dailyAverage = calculateDailyAverage();
  const mostProductiveDay = calculateMostProductiveDay();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Analytics</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-neutral-600 font-medium mb-2">Completion Status</h3>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="font-bold text-2xl">
                  {Math.round(((stats?.totalPagesRead || 0) / totalPagesInQuran) * 100)}%
                </span>
              </div>
              <p className="text-sm text-neutral-600">of Quran completed</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-neutral-600 font-medium mb-2">Total Khatmas</h3>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span className="font-bold text-2xl">{stats?.totalKhatmas || 0}</span>
              </div>
              <p className="text-sm text-neutral-600">complete readings</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-neutral-600 font-medium mb-2">Daily Average</h3>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="font-bold text-2xl">{dailyAverage}</span>
              </div>
              <p className="text-sm text-neutral-600">pages per reading day</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-neutral-600 font-medium mb-2">Most Productive</h3>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="font-bold text-2xl">{mostProductiveDay.day}</span>
              </div>
              <p className="text-sm text-neutral-600">{mostProductiveDay.pages} pages avg</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-neutral-600 font-medium mb-2">Streaks</h3>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"></path>
                </svg>
                <span className="font-bold text-2xl">{stats?.currentStreak}</span>
              </div>
              <p className="text-sm text-neutral-600">current / {stats?.longestStreak} longest</p>
            </div>
          </>
        )}
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h3 className="font-display font-bold text-lg mb-4">Reading Progress Over Time</h3>
        {logsLoading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <ReadingChart readingLogs={logs || []} />
        )}
      </div>

      {/* Juz Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h3 className="font-display font-bold text-lg mb-4">Juz Progress</h3>
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats?.completedJuz || 0}</div>
                  <div className="text-sm text-neutral-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.max(0, totalJuzInQuran - (stats?.completedJuz || 0))}</div>
                  <div className="text-sm text-neutral-600">Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.round(((stats?.completedJuz || 0) / totalJuzInQuran) * 100)}%</div>
                  <div className="text-sm text-neutral-600">Complete</div>
                </div>
              </div>
              <Progress value={(stats?.completedJuz || 0) / totalJuzInQuran * 100} className="h-4" />
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">Time Projection</h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                {dailyAverage > 0 ? (
                  <>
                    <p className="text-neutral-700 mb-1">
                      At your current pace of {dailyAverage} pages per day:
                    </p>
                    <p className="font-medium">
                      You'll complete the Quran in approximately{" "}
                      <span className="text-primary font-bold">
                        {Math.ceil((totalPagesInQuran - (stats?.totalPagesRead || 0)) / dailyAverage)}
                      </span>{" "}
                      days.
                    </p>
                  </>
                ) : (
                  <p className="text-neutral-700">
                    Log more reading days to see completion projections.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4">Page Progress</h3>
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats?.totalPagesRead || 0}</div>
                  <div className="text-sm text-neutral-600">Pages Read</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.max(0, totalPagesInQuran - (stats?.totalPagesRead || 0))}</div>
                  <div className="text-sm text-neutral-600">Pages Left</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.round(((stats?.totalPagesRead || 0) / totalPagesInQuran) * 100)}%</div>
                  <div className="text-sm text-neutral-600">Complete</div>
                </div>
              </div>
              <Progress value={(stats?.totalPagesRead || 0) / totalPagesInQuran * 100} className="h-4" />
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">Consistency</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-neutral-600">30-day consistency</span>
                    <span className="text-sm font-medium">{stats?.consistency || 0}%</span>
                  </div>
                  <Progress value={stats?.consistency || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-neutral-600">Current streak</span>
                    <span className="text-sm font-medium">{stats?.currentStreak || 0} days</span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((stats?.currentStreak || 0) / (stats?.longestStreak || 1)) * 100)} 
                    className="h-2" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
