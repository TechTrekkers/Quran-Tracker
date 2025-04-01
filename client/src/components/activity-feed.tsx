import { formatDateTimeRelative } from "@/lib/utils";

interface ActivityFeedProps {
  activities: any[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        No activity recorded yet. Start logging your reading to see activity here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const isToday = formatDateTimeRelative(activity.date) === "Today";
        const isYesterday = formatDateTimeRelative(activity.date) === "Yesterday";
        const isRecent = isToday || isYesterday;
        
        return (
          <div 
            key={activity.id} 
            className={`flex items-start border-l-4 ${
              isRecent ? "border-primary" : "border-neutral-300"
            } pl-4 py-2`}
          >
            <div className="flex-1">
              <p className="font-medium">Read {activity.pagesRead} pages</p>
              <p className="text-sm text-neutral-600">
                {activity.startPage && activity.endPage 
                  ? `Juz ${activity.juzNumber}, Pages ${activity.startPage}-${activity.endPage}`
                  : `Juz ${activity.juzNumber}`
                }
              </p>
              <p className="text-xs text-neutral-500">
                {formatDateTimeRelative(activity.date)}, {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
