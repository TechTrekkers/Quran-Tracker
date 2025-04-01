import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "./components/sidebar";
import Dashboard from "./pages/dashboard";
import History from "./pages/history";
import Analytics from "./pages/analytics";
import Settings from "./pages/settings";
import NotFound from "@/pages/not-found";
import InstallPWABanner from "./components/install-pwa-banner";
import OfflineIndicator from "./components/offline-indicator";
import PWADebugger from "./components/pwa-debugger";
import { useState } from "react";

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="bg-white p-4 shadow md:hidden flex justify-between items-center">
          <h1 className="text-xl font-display font-bold text-primary">Quran Tracker</h1>
          <button 
            className="text-neutral-800 focus:outline-none" 
            onClick={toggleSidebar}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 18H21M3 12H21M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/history" component={History} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
      
    </div>
  );
}

function App() {
  const isDev = import.meta.env.MODE === 'development';

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <OfflineIndicator />
      <InstallPWABanner />
      {isDev && <PWADebugger />}
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
