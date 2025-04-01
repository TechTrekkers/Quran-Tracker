import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/stats-card";
import ReadingChart from "@/components/reading-chart";
import ReadingForm from "@/components/reading-form";
import ActivityFeed from "@/components/activity-feed";
import ReadingCalendar from "@/components/reading-calendar";
import ProgressBar from "@/components/progress-bar";
import JuzMap from "@/components/juz-map";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showReadingForm, setShowReadingForm] = useState(false);
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats'],
  });
  
  const { data: goal, isLoading: goalLoading } = useQuery({
    queryKey: ['/api/reading-goals/active'],
  });
  
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/reading-logs/recent'],
  });
  
  const { data: allLogs, isLoading: allLogsLoading } = useQuery({
    queryKey: ['/api/reading-logs'],
  });
  
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Dashboard</h2>
        <button 
          className={`${showReadingForm ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-secondary"} text-white px-4 py-2 rounded-lg transition-colors flex items-center`}
          onClick={() => setShowReadingForm(!showReadingForm)}
        >
          {showReadingForm ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Log Today's Reading
            </>
          )}
        </button>
      </div>

      {/* Log Reading Form */}
      {showReadingForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h3 className="font-display font-bold text-lg mb-4">Log Your Reading</h3>
          <ReadingForm onSuccess={() => setShowReadingForm(false)} />
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </>
        ) : (
          <>
            <StatsCard 
              title="Current Streak" 
              value={`${stats?.currentStreak || 0} days`}
              subValue={`Longest: ${stats?.longestStreak || 0} days`}
              icon="fire"
            />
            <StatsCard 
              title="Pages Read" 
              value={stats?.totalPagesRead || 0}
              subValue={`${Math.round(((stats?.totalPagesRead || 0) / 604) * 100)}% of total`}
              icon="book"
            />
            <StatsCard 
              title="Juz Completed" 
              value={stats?.completedJuz || 0}
              subValue={`${Math.round(((stats?.completedJuz || 0) / 30) * 100)}% of total`}
              icon="bookmark"
            />
            <StatsCard 
              title="Consistency" 
              value={`${stats?.consistency || 0}%`}
              subValue="Last 30 days"
              icon="calendar"
            />
          </>
        )}
      </div>

      {/* Reading Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h3 className="font-display font-bold text-lg mb-4">Reading Progress</h3>
          {allLogsLoading ? (
            <Skeleton className="h-72 rounded-lg" />
          ) : (
            <ReadingChart readingLogs={allLogs || []} />
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Current Goal</h3>
          {goalLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-700 font-medium">Complete Quran</span>
                  <span className="text-sm text-primary font-medium">{goal?.completionPercentage || 0}%</span>
                </div>
                <ProgressBar value={goal?.completionPercentage || 0} />
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-700 font-medium">Daily Consistency</span>
                  <span className="text-sm text-primary font-medium">{stats?.consistency || 0}%</span>
                </div>
                <ProgressBar value={stats?.consistency || 0} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-700 font-medium">Weekly Target</span>
                  <span className="text-sm text-primary font-medium">{goal?.weeklyTargetCompletion || 0}%</span>
                </div>
                <ProgressBar value={goal?.weeklyTargetCompletion || 0} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Juz Progress Map */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">Juz Progress Map</h3>
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to clear all reading data? This action cannot be undone.")) {
                try {
                  await apiRequest("/api/clear-data", { 
                    method: "POST"
                  });
                  // Invalidate all queries to refresh the data
                  queryClient.invalidateQueries();
                  toast({
                    title: "Data reset successful",
                    description: "All reading data has been cleared. Your progress has been reset.",
                  });
                } catch (error) {
                  console.error("Error clearing data:", error);
                  toast({
                    title: "Error",
                    description: "Failed to clear data. Please try again.",
                    variant: "destructive",
                  });
                }
              }
            }}
            className="text-sm text-red-600 hover:text-red-800 px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Reset Data
          </button>
        </div>
        <p className="text-neutral-500 text-sm mb-4">
          This map shows your progress through each juz for your current khatma (Quran reading).
          Green indicates completed juz, yellow indicates in-progress, and gray indicates not yet started.
        </p>
        <JuzMap />
      </div>

      {/* Recent Activity & Reading Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
          {logsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : (
            <ActivityFeed activities={recentLogs || []} />
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h3 className="font-display font-bold text-lg mb-4">Reading Calendar</h3>
          {allLogsLoading ? (
            <Skeleton className="h-52 rounded-lg" />
          ) : (
            <ReadingCalendar readingLogs={allLogs || []} />
          )}
        </div>
      </div>
    </div>
  );
}
