import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const goalFormSchema = z.object({
  dailyTarget: z.coerce.number().min(1, "Must be at least 1 page").max(30, "Maximum 30 pages"),
  weeklyTarget: z.coerce.number().min(1, "Must be at least 1 page").max(150, "Maximum 150 pages"),
});

export default function Settings() {
  const { toast } = useToast();
  
  const { data: goal, isLoading } = useQuery({
    queryKey: ['/api/reading-goals/active'],
  });
  
  const form = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      dailyTarget: 5,
      weeklyTarget: 35,
    },
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (goal) {
      form.reset({
        dailyTarget: goal.dailyTarget,
        weeklyTarget: goal.weeklyTarget,
      });
    }
  }, [goal, form]);
  
  const updateGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof goalFormSchema>) => {
      if (!goal) throw new Error("No active goal found");
      return apiRequest(`/api/reading-goals/${goal.id}`, {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reading-goals/active'] });
      toast({
        title: "Settings updated",
        description: "Your reading goals have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: z.infer<typeof goalFormSchema>) {
    updateGoalMutation.mutate(data);
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold">Settings</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reading Goals</CardTitle>
            <CardDescription>
              Set your daily and weekly reading targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="dailyTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Target (pages)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of pages you aim to read each day
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="weeklyTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekly Target (pages)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of pages you aim to read each week
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={updateGoalMutation.isPending}
                  >
                    {updateGoalMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>About Quran Tracker</CardTitle>
            <CardDescription>
              Application information and resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-1">Version</h4>
                <p className="text-sm text-neutral-600">1.0.0</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-1">Description</h4>
                <p className="text-sm text-neutral-600">
                  Quran Tracker helps you maintain consistency in your Quran reading by 
                  tracking your progress and providing analytics to help you stay motivated.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-1">Default Settings</h4>
                <ul className="text-sm text-neutral-600 list-disc list-inside">
                  <li>Total pages in Quran: 604</li>
                  <li>Total Juz in Quran: 30</li>
                  <li>Default daily target: 5 pages</li>
                  <li>Default weekly target: 35 pages</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
