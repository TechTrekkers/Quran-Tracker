import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getJuzPageRange } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ReadingFormProps {
  onSuccess?: () => void;
}

const formSchema = z.object({
  date: z.string(),
  juzNumber: z.coerce.number().min(1).max(30),
  pagesRead: z.coerce.number().min(1).max(604),
  startPage: z.coerce.number().optional(),
  endPage: z.coerce.number().optional(),
});

export default function ReadingForm({ onSuccess }: ReadingFormProps) {
  const { toast } = useToast();
  const [showPageRange, setShowPageRange] = useState(false);
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: today,
      juzNumber: 1,
      pagesRead: 1,
    },
  });
  
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      // If page range is not shown, calculate start and end pages based on juz
      if (!showPageRange) {
        const { start } = getJuzPageRange(values.juzNumber);
        values.startPage = start;
        values.endPage = start + values.pagesRead - 1;
      }
      
      return apiRequest('POST', '/api/reading-logs', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reading-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reading-logs/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Reading logged successfully",
        description: "Your reading progress has been saved.",
      });
      form.reset({
        date: today,
        juzNumber: 1,
        pagesRead: 1,
      });
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
    mutation.mutate(values);
  };
  
  // Handle juz change to update page range hints
  const handleJuzChange = (value: string) => {
    const juzNumber = parseInt(value);
    const { start, end } = getJuzPageRange(juzNumber);
    
    // Update form values
    form.setValue("juzNumber", juzNumber);
    
    if (showPageRange) {
      form.setValue("startPage", start);
      form.setValue("endPage", Math.min(start + form.getValues("pagesRead") - 1, end));
    }
  };
  
  // Toggle page range visibility
  const togglePageRange = () => {
    setShowPageRange(!showPageRange);
    
    if (!showPageRange) {
      // When enabling page range, set default values
      const juzNumber = form.getValues("juzNumber");
      const { start } = getJuzPageRange(juzNumber);
      const pagesRead = form.getValues("pagesRead");
      
      form.setValue("startPage", start);
      form.setValue("endPage", start + pagesRead - 1);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          
          <FormField
            control={form.control}
            name="juzNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Juz</FormLabel>
                <Select 
                  onValueChange={handleJuzChange} 
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Juz" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => {
                      const juzNum = i + 1;
                      const { start, end } = getJuzPageRange(juzNum);
                      return (
                        <SelectItem key={juzNum} value={juzNum.toString()}>
                          Juz {juzNum} (Page {start}-{end})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="pagesRead"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pages Read</FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input type="number" {...field} className="rounded-r-none" />
                  </FormControl>
                  <Button type="submit" className="rounded-l-none">
                    Log
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={togglePageRange}
          >
            {showPageRange ? "Hide Page Range" : "Specify Page Range"}
          </Button>
        </div>
        
        {showPageRange && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Page</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Page</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </form>
    </Form>
  );
}
