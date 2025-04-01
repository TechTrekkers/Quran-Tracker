import { generateCalendarData } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReadingCalendarProps {
  readingLogs: any[];
  days?: number;
}

export default function ReadingCalendar({ readingLogs, days = 30 }: ReadingCalendarProps) {
  const calendarData = generateCalendarData(days, readingLogs);
  
  // Group data by week for display
  const weeks: any[][] = [];
  let currentWeek: any[] = [];
  
  calendarData.forEach((day, index) => {
    currentWeek.push(day);
    
    // Start a new week every 7 days
    if (currentWeek.length === 7 || index === calendarData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // Create month labels
  const monthLabels = new Set<string>();
  calendarData.forEach(day => {
    const month = new Date(day.date).toLocaleDateString('en-US', { month: 'short' });
    monthLabels.add(month);
  });
  
  // Array of weekday labels
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Month Labels */}
      <div className="flex mb-2 text-xs text-neutral-600">
        {Array.from(monthLabels).map((month, i) => (
          <div key={month} className="mr-2">{month}</div>
        ))}
      </div>
      
      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((day) => (
          <div key={day} className="text-center text-xs text-neutral-500 font-medium">{day}</div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="calendar-heatmap grid grid-cols-7 gap-1 mb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => (
              <TooltipProvider key={day.dateStr}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`day w-3 h-3 rounded-sm ${
                        day.pagesRead > 0 
                          ? `bg-primary opacity-${Math.floor(day.intensity * 100)}`
                          : "bg-neutral-200"
                      }`}
                      style={{ 
                        opacity: day.pagesRead > 0 ? day.intensity : undefined 
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium text-xs">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs">
                      {day.pagesRead} {day.pagesRead === 1 ? 'page' : 'pages'} read
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2 text-xs text-neutral-600">
          <span>Less</span>
          <div className="day w-3 h-3 rounded-sm bg-neutral-200" />
          <div className="day w-3 h-3 rounded-sm bg-primary opacity-30" />
          <div className="day w-3 h-3 rounded-sm bg-primary opacity-60" />
          <div className="day w-3 h-3 rounded-sm bg-primary opacity-90" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
