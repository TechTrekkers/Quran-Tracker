import { useState, useEffect } from "react";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show the indicator briefly when going online
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Always show the indicator when offline
      setShowIndicator(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setShowIndicator(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!showIndicator) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 p-2 flex items-center justify-center ${
          isOnline ? 'bg-green-500' : 'bg-orange-500'
        } text-white text-sm font-medium`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi size={16} />
              <span>You're back online! Syncing data...</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span>You're offline. Your data is saved locally.</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}