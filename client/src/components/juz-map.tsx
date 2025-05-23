import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

type JuzStatus = 'completed' | 'partial' | 'not-started';

interface JuzMapItem {
  juzNumber: number;
  status: JuzStatus;
  pagesRead: number;
  totalPages: number;
  percentComplete: number;
}

export default function JuzMap() {
  // Fetch the juz map data
  const { data: juzMap, isLoading } = useQuery({
    queryKey: ['/api/juz-map'],
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
      {(juzMap || []).map((juz: JuzMapItem) => (
        <TooltipProvider key={juz.juzNumber}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`relative flex flex-col items-center justify-center p-2 rounded-md border cursor-pointer transition-all 
                  ${juz.status === 'completed' 
                    ? 'bg-green-400 text-green-900 border-green-500' 
                    : juz.status === 'partial' 
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }
                  hover:shadow-md
                `}
              >
                <span className="font-bold text-lg">{juz.juzNumber}</span>
                {juz.status === 'partial' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 rounded-b-md overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${juz.percentComplete}%` }}
                    />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-bold">Juz {juz.juzNumber}</div>
                <div>{juz.pagesRead} / {juz.totalPages} pages read</div>
                <div>Status: {juz.status}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}