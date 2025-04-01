import { useState, useEffect } from "react";
import { isPWAInstalled, promptInstall } from "@/lib/registerSW";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Wifi, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPWABanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<ReturnType<typeof promptInstall> | null>(null);
  const [dismissCount, setDismissCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    // Don't show the banner if already installed
    if (isPWAInstalled()) {
      return;
    }
    
    // Try to load dismiss count from localStorage
    const savedDismissCount = localStorage.getItem('pwa-banner-dismiss-count');
    if (savedDismissCount) {
      setDismissCount(parseInt(savedDismissCount, 10));
    }
    
    // Create install prompt
    const prompt = promptInstall(() => {
      // This callback runs when the installation is available
      setShowBanner(true);
      setInstallPrompt(prompt);
      
      // Auto-expand after a few seconds
      setTimeout(() => {
        setExpanded(true);
      }, 2000);
    });
    
    // Set up online/offline detection for banner visibility
    const handleNetworkChange = () => {
      // Only show banner if online (can't install offline) and if user hasn't dismissed too many times
      if (navigator.onLine) {
        const dismissed = parseInt(localStorage.getItem('pwa-banner-dismiss-count') || '0', 10);
        // Only hide permanently after 3 dismissals
        if (dismissed < 3) {
          setShowBanner(!isPWAInstalled() && !!prompt.isInstallable());
        }
      } else {
        setShowBanner(false);
      }
    };
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Also check after a delay to allow browser to detect installability
    setTimeout(handleNetworkChange, 3000);
    
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);
  
  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.showInstallPrompt().then((installed: boolean) => {
        setShowBanner(false);
        if (installed) {
          // Reset dismiss count if installed
          localStorage.setItem('pwa-banner-dismiss-count', '0');
        }
      });
    }
  };
  
  const handleDismiss = () => {
    // Increment dismiss count and save to localStorage
    const newDismissCount = dismissCount + 1;
    setDismissCount(newDismissCount);
    localStorage.setItem('pwa-banner-dismiss-count', newDismissCount.toString());
    
    // Hide the banner
    setShowBanner(false);
  };
  
  if (!showBanner) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <div className="mx-auto max-w-md bg-gradient-to-r from-primary to-primary-600 text-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 flex justify-between items-start">
            <div className="flex gap-3">
              <div className="mt-1">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Install Quran Tracker App</h3>
                <p className="text-sm text-white/90">
                  Use this app even when you're offline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                className="bg-white text-primary hover:bg-white/90 font-semibold"
                size="sm" 
                onClick={handleInstall}
              >
                <Download className="mr-1 h-4 w-4" /> Install
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDismiss}
                className="text-white hover:text-white hover:bg-primary-foreground/20"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 pt-0"
              >
                <div className="bg-white/10 rounded-md p-3 mt-2">
                  <h4 className="font-semibold mb-2 text-sm">This app works offline with:</h4>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-white" />
                      <span>Complete offline data storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-white" />
                      <span>Fast access from your home screen</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-white" />
                      <span>No need for internet connection</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-3 text-xs text-white/80 flex items-center gap-1.5">
                  <Wifi size={12} /> 
                  <span>Internet only needed for syncing across devices</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}