import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReadingCalendar from "@/components/reading-calendar";

export default function History() {
  const [filterJuz, setFilterJuz] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['/api/reading-logs'],
  });

  const filteredLogs = logs
    ? filterJuz === "all"
      ? logs
      : logs.filter((log: any) => log.juzNumber === parseInt(filterJuz))
    : [];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Reading History</h2>
      </div>

      {/* Calendar View */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h3 className="font-display font-bold text-lg mb-4">Reading Calendar</h3>
        {isLoading ? (
          <Skeleton className="h-52 rounded-lg" />
        ) : (
          <ReadingCalendar readingLogs={logs || []} />
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <h3 className="font-display font-bold text-lg">Reading Logs</h3>
          <div className="w-40">
            <Select
              value={filterJuz}
              onValueChange={setFilterJuz}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Juz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Juz</SelectItem>
                {Array.from({ length: 30 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Juz {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Juz</TableHead>
                <TableHead>Pages Read</TableHead>
                <TableHead>Page Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                    No reading logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.date)}</TableCell>
                    <TableCell>Juz {log.juzNumber}</TableCell>
                    <TableCell>{log.pagesRead}</TableCell>
                    <TableCell>
                      {log.startPage && log.endPage
                        ? `${log.startPage} - ${log.endPage}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
