import { useState, useEffect } from "react";
import { AlertCircle, Wifi, WifiOff, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isPWAInstalled } from "@/lib/registerSW";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [showOfflineHelper, setShowOfflineHelper] = useState(false);
  const isPwa = isPWAInstalled();
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show the indicator briefly when going online
      setShowIndicator(true);
      setShowOfflineHelper(false);
      setTimeout(() => setShowIndicator(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Always show the indicator when offline
      setShowIndicator(true);
      setTimeout(() => setShowOfflineHelper(true), 2000);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setShowIndicator(true);
      setTimeout(() => setShowOfflineHelper(true), 2000);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!showIndicator) return null;
  
  return (
    <>
      <AnimatePresence>
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 p-2 flex items-center justify-center ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          } text-white font-medium shadow-md`}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi size={18} />
                <span>You're back online! Syncing data...</span>
              </>
            ) : (
              <>
                <WifiOff size={18} />
                <span className="text-white font-semibold">
                  Offline Mode Active - Data is saved locally
                </span>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {!isOnline && showOfflineHelper && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-orange-300 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <Info className="text-orange-500 mt-1 flex-shrink-0" size={22} />
            <div>
              <h3 className="font-semibold text-lg mb-1">Offline Mode</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                You're using the app without an internet connection. 
                {isPwa 
                  ? " All your data is safely stored on your device."
                  : " Install as a PWA for the best offline experience!"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">✓ Your data is secure</span> and will sync when you're online again.
              </p>
            </div>
          </div>
          <button 
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={() => setShowOfflineHelper(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}