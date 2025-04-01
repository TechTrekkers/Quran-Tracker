import { useState, useEffect } from "react";
import { isPWAInstalled, promptInstall } from "@/lib/registerSW";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function InstallPWABanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<ReturnType<typeof promptInstall> | null>(null);
  
  useEffect(() => {
    // Don't show the banner if already installed or not installable
    if (isPWAInstalled()) {
      return;
    }
    
    // Create install prompt
    const prompt = promptInstall(() => {
      // This callback runs when the installation is available
      setShowBanner(true);
      setInstallPrompt(prompt);
    });
    
    // Set up online/offline detection for banner visibility
    const handleNetworkChange = () => {
      // Only show banner if online (can't install offline)
      if (navigator.onLine) {
        setShowBanner(!isPWAInstalled() && !!prompt.isInstallable());
      } else {
        setShowBanner(false);
      }
    };
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);
  
  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.showInstallPrompt();
      setShowBanner(false);
    }
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-white p-4 flex justify-between items-center z-50">
      <div>
        <h3 className="font-semibold">Install Quran Tracker</h3>
        <p className="text-sm">Add this app to your home screen for offline access</p>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleInstall}
        >
          Install
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowBanner(false)}
          className="text-white hover:text-white hover:bg-primary-foreground/20"
        >
          <X size={18} />
        </Button>
      </div>
    </div>
  );
}