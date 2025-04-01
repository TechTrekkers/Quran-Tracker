import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState, useMemo } from 'react';
import { formatDate } from '@/lib/utils';

interface ReadingChartProps {
  readingLogs: any[];
}

export default function ReadingChart({ readingLogs }: ReadingChartProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  
  const chartData = useMemo(() => {
    if (!readingLogs.length) return [];
    
    // Clone and sort logs by date
    const sortedLogs = [...readingLogs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Determine date range based on selected time range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'year':
        startDate.setDate(endDate.getDate() - 365);
        break;
    }
    
    // Filter logs within selected date range
    const filteredLogs = sortedLogs.filter(log => 
      new Date(log.date) >= startDate && new Date(log.date) <= endDate
    );
    
    // Group logs by date
    const groupedByDate = filteredLogs.reduce((acc: Record<string, any>, log) => {
      const dateStr = new Date(log.date).toISOString().split('T')[0];
      
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          pagesRead: 0,
          cumulative: 0,
        };
      }
      
      acc[dateStr].pagesRead += log.pagesRead;
      return acc;
    }, {});
    
    // Fill in missing dates and calculate cumulative pages
    const result = [];
    let cumulativePages = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const entry = groupedByDate[dateStr] || { date: dateStr, pagesRead: 0 };
      
      cumulativePages += entry.pagesRead;
      
      result.push({
        date: dateStr,
        formattedDate: formatDate(dateStr),
        pagesRead: entry.pagesRead,
        cumulative: cumulativePages,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }, [readingLogs, timeRange]);
  
  return (
    <div className="h-72">
      <div className="flex justify-end mb-4 space-x-2">
        <button 
          onClick={() => setTimeRange('week')}
          className={`px-3 py-1 text-sm rounded-md ${
            timeRange === 'week' 
              ? 'bg-primary text-white' 
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Week
        </button>
        <button 
          onClick={() => setTimeRange('month')}
          className={`px-3 py-1 text-sm rounded-md ${
            timeRange === 'month' 
              ? 'bg-primary text-white' 
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Month
        </button>
        <button 
          onClick={() => setTimeRange('year')}
          className={`px-3 py-1 text-sm rounded-md ${
            timeRange === 'year' 
              ? 'bg-primary text-white' 
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Year
        </button>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Show fewer ticks based on time range
              if (timeRange === 'week') return value;
              if (timeRange === 'month' && chartData.length > 15) {
                const index = chartData.findIndex(item => item.formattedDate === value);
                return index % 5 === 0 ? value : '';
              }
              if (timeRange === 'year' && chartData.length > 30) {
                const index = chartData.findIndex(item => item.formattedDate === value);
                return index % 30 === 0 ? value : '';
              }
              return value;
            }}
            angle={-45}
            textAnchor="end"
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'Daily Pages') return [`${value} pages`, name];
              if (name === 'Total Pages') return [`${value} pages`, name];
              return [value, name];
            }}
          />
          <Legend />
          <Bar 
            yAxisId="left" 
            dataKey="pagesRead" 
            name="Daily Pages" 
            fill="#4361ee" 
            radius={[4, 4, 0, 0]}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="cumulative" 
            name="Total Pages" 
            stroke="#4cc9f0" 
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
