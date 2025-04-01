import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getJuzPageRange, totalJuzInQuran } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Minus, HelpCircle } from "lucide-react";

interface ReadingFormProps {
  onSuccess?: () => void;
}

const formSchema = z.object({
  date: z.string(),
  startingJuz: z.coerce.number().min(1).max(30),
  startingPage: z.coerce.number().min(1).max(604),
  juzRead: z.coerce.number().min(0).max(30),
  additionalPages: z.coerce.number().min(0).max(604),
  pagesRead: z.coerce.number().min(1).max(604),
});

export default function ReadingForm({ onSuccess }: ReadingFormProps) {
  const { toast } = useToast();
  const [calculatedPages, setCalculatedPages] = useState(0);
  const [willWrapAround, setWillWrapAround] = useState(false);
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  
  // Get recent reading logs to determine the last position
  const { data: recentLogs } = useQuery({
    queryKey: ['/api/reading-logs/recent'],
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: today,
      startingJuz: 1,
      startingPage: 1,
      juzRead: 0,
      additionalPages: 0,
      pagesRead: 0,
    },
  });
  
  // Get the current values from the form
  const startingJuz = form.watch("startingJuz");
  const startingPage = form.watch("startingPage");
  const juzRead = form.watch("juzRead");
  const additionalPages = form.watch("additionalPages");
  
  // Calculate total pages read when juz or additional pages change
  useEffect(() => {
    // Calculate pages based on which juz are being read
    let totalPagesRead = 0;
    
    // First count complete juz
    for (let i = 0; i < juzRead; i++) {
      const currentJuzNumber = (startingJuz + i - 1) % 30 + 1; // Wrap around to juz 1 after juz 30
      
      // Apply special page counts for juz 1 and 30
      if (currentJuzNumber === 1) {
        totalPagesRead += 21; // Juz 1 has 21 pages
      } else if (currentJuzNumber === 30) {
        totalPagesRead += 23; // Juz 30 has 23 pages
      } else {
        totalPagesRead += 20; // All other juz have 20 pages
      }
    }
    
    // Add any additional pages
    totalPagesRead += additionalPages;
    
    setCalculatedPages(totalPagesRead);
    form.setValue("pagesRead", totalPagesRead > 0 ? totalPagesRead : 0);
    
    // Check if reading will wrap around from end to beginning of Quran
    const startPage = form.getValues("startingPage");
    const endPage = startPage + totalPagesRead - 1;
    setWillWrapAround(endPage > 604);
  }, [juzRead, additionalPages, startingJuz, form]);
  
  // Set starting point based on most recent log when form loads
  useEffect(() => {
    if (recentLogs && recentLogs.length > 0) {
      // Find the most recent log based on date and creation time
      const lastLog = recentLogs[0];
      
      // If there's an end page, start from the next page
      if (lastLog.endPage) {
        // Calculate which juz this falls into
        const nextPage = lastLog.endPage + 1;
        
        // Reset to page 1 if we've completed the Quran
        if (nextPage > 604) {
          form.setValue("startingJuz", 1);
          form.setValue("startingPage", 1);
        } else {
          // Calculate juz correctly using our helper function
          const nextJuz = getJuzForPage(nextPage);
          
          // Set the form values to continue from where we left off
          form.setValue("startingJuz", nextJuz);
          form.setValue("startingPage", nextPage);
        }
      }
    }
  }, [recentLogs, form]);
  
  // Update starting page when starting juz changes
  useEffect(() => {
    const { start } = getJuzPageRange(startingJuz);
    // Check if the current page doesn't belong to the selected juz
    const currentPageJuz = getJuzForPage(startingPage);
    if (currentPageJuz !== startingJuz) {
      form.setValue("startingPage", start);
    }
  }, [startingJuz, startingPage, form]);
  
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      // Calculate end page based on starting point and pages read
      const startPage = values.startingPage;
      
      // Calculate the end page, considering wrap-around after page 604 (end of Quran)
      let endPage = startPage + values.pagesRead - 1;
      if (endPage > 604) {
        endPage = endPage % 604;  // Wrap around to beginning
        // If it wraps exactly to the end, use page 604 instead of 0
        if (endPage === 0) endPage = 604;
      }
      
      // Format data for the API
      const readingLog = {
        date: values.date,
        juzNumber: values.startingJuz,
        pagesRead: values.pagesRead,
        startPage: startPage,
        endPage: endPage
      };
      
      return apiRequest('/api/reading-logs', { 
        method: 'POST', 
        data: readingLog 
      });
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/reading-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reading-logs/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/juz-map'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reading-goals/active'] });
      
      toast({
        title: "Reading logged successfully",
        description: "Your reading progress has been saved.",
      });
      
      // Reset juz read and additional pages, but keep the starting point
      form.setValue("juzRead", 0);
      form.setValue("additionalPages", 0);
      
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log reading. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (values.pagesRead < 1) {
      toast({
        title: "Invalid input",
        description: "Please read at least 1 page before logging.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(values);
  };
  
  // Counter increment/decrement functions
  const incrementJuz = () => {
    const currentJuz = form.getValues("startingJuz");
    form.setValue("startingJuz", Math.min(currentJuz + 1, totalJuzInQuran));
  };
  
  const decrementJuz = () => {
    const currentJuz = form.getValues("startingJuz");
    form.setValue("startingJuz", Math.max(currentJuz - 1, 1));
  };
  
  // Helper function to determine juz number from page
  const getJuzForPage = (page: number): number => {
    // Handle special cases for juz 1 (pages 1-21)
    if (page <= 21) {
      return 1;
    }
    
    // Handle special cases for juz 30 (pages 582-604)
    if (page >= 582) {
      return 30;
    }
    
    // For pages in juz 2-29, account for juz 1 having 21 pages
    const adjustedPage = page - 21; // Subtract juz 1's pages
    return Math.floor(adjustedPage / 20) + 2; // +2 because we start at juz 2
  };

  const incrementPage = () => {
    const currentPage = form.getValues("startingPage");
    form.setValue("startingPage", Math.min(currentPage + 1, 604));
    
    // If we cross into next juz, update the juz number
    const newJuz = getJuzForPage(Math.min(currentPage + 1, 604));
    if (newJuz !== form.getValues("startingJuz")) {
      form.setValue("startingJuz", newJuz);
    }
  };
  
  const decrementPage = () => {
    const currentPage = form.getValues("startingPage");
    form.setValue("startingPage", Math.max(currentPage - 1, 1));
    
    // If we cross into previous juz, update the juz number
    const newJuz = getJuzForPage(Math.max(currentPage - 1, 1));
    if (newJuz !== form.getValues("startingJuz")) {
      form.setValue("startingJuz", newJuz);
    }
  };
  
  const incrementJuzRead = () => {
    const current = form.getValues("juzRead");
    // This calculates how many juz from the starting juz to the end of the Quran
    const maxBeforeWrap = totalJuzInQuran - form.getValues("startingJuz") + 1;
    // Allow user to increment beyond the end of the Quran (will wrap around in submission)
    form.setValue("juzRead", current + 1);
  };
  
  const decrementJuzRead = () => {
    const current = form.getValues("juzRead");
    form.setValue("juzRead", Math.max(current - 1, 0));
  };
  
  const incrementAdditionalPages = () => {
    const current = form.getValues("additionalPages");
    form.setValue("additionalPages", Math.min(current + 1, 20));
  };
  
  const decrementAdditionalPages = () => {
    const current = form.getValues("additionalPages");
    form.setValue("additionalPages", Math.max(current - 1, 0));
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-medium mb-3 flex items-center">
            Starting Point
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Select where you started reading from. By default, this will be after your last reading session.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startingJuz"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Juz</FormLabel>
                  <FormControl>
                    <div className="flex h-10">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-r-none border-r-0"
                        onClick={decrementJuz}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 flex items-center justify-center border border-input">
                        {field.value}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-l-none border-l-0"
                        onClick={incrementJuz}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="startingPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Page</FormLabel>
                  <FormControl>
                    <div className="flex h-10">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-r-none border-r-0"
                        onClick={decrementPage}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 flex items-center justify-center border border-input">
                        {field.value}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-l-none border-l-0"
                        onClick={incrementPage}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-medium mb-3 flex items-center">
            Reading Progress
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Enter how many complete juz you read, plus any additional pages.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="juzRead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complete Juz Read</FormLabel>
                  <FormControl>
                    <div className="flex h-10">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-r-none border-r-0"
                        onClick={decrementJuzRead}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 flex items-center justify-center border border-input">
                        {field.value}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-l-none border-l-0"
                        onClick={incrementJuzRead}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    {field.value} juz ≈ {calculatedPages - form.getValues("additionalPages")} pages 
                    {/* We show the actual calculated pages instead of a simple multiply by 20 */}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="additionalPages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Pages</FormLabel>
                  <FormControl>
                    <div className="flex h-10">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-r-none border-r-0"
                        onClick={decrementAdditionalPages}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 flex items-center justify-center border border-input">
                        {field.value}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-l-none border-l-0"
                        onClick={incrementAdditionalPages}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mt-4 bg-white p-3 rounded border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Pages Read:</span>
              <span className="text-lg font-bold">{calculatedPages}</span>
            </div>
            {willWrapAround && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                Your reading will wrap around from the end to the beginning of the Quran
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={calculatedPages < 1 || mutation.isPending}
            className="w-full md:w-auto"
          >
            {mutation.isPending ? "Saving..." : "Save Reading Progress"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
