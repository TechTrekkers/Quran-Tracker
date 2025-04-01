import { useState, useEffect } from 'react';
import { Check, X, Smartphone, Wifi, Database, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPWAInstalled } from '@/lib/registerSW';

export default function PWADebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('Checking...');
  const [isPWA, setIsPWA] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheSize, setCacheSize] = useState('Calculating...');
  const [dbStatus, setDbStatus] = useState('Checking...');

  // Check service worker registration
  useEffect(() => {
    async function checkServiceWorker() {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            setServiceWorkerStatus(`Active (${registrations.length} registered)`);
          } else {
            setServiceWorkerStatus('Not registered');
          }
        } catch (error: any) {
          setServiceWorkerStatus(`Error: ${error?.message || 'Unknown error'}`);
        }
      } else {
        setServiceWorkerStatus('Not supported in this browser');
      }
    }

    checkServiceWorker();
    setIsPWA(isPWAInstalled());
    setIsOnline(navigator.onLine);

    // Check IndexedDB
    try {
      const dbOpenRequest = indexedDB.open('QuranTrackerDB');
      dbOpenRequest.onsuccess = () => {
        const db = dbOpenRequest.result;
        const stores = Array.from(db.objectStoreNames);
        db.close();
        setDbStatus(`Connected (stores: ${stores.join(', ')})`);
      };
      dbOpenRequest.onerror = () => {
        setDbStatus('Failed to connect');
      };
    } catch (error: any) {
      setDbStatus(`Error: ${error?.message || 'Unknown error'}`);
    }

    // Check caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(
          cacheNames.map(cacheName => {
            return caches.open(cacheName).then(cache => {
              return cache.keys().then(keys => keys.length);
            });
          })
        ).then(sizesArray => {
          const totalItems = sizesArray.reduce((acc, size) => acc + size, 0);
          setCacheSize(`${totalItems} items in ${cacheNames.length} caches`);
        });
      });
    } else {
      setCacheSize('Cache API not supported');
    }

    // Set up online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerOfflineMode = () => {
    // This doesn't actually disconnect, but helps test offline UX
    window.dispatchEvent(new Event('offline'));
  };

  const triggerOnlineMode = () => {
    window.dispatchEvent(new Event('online'));
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className="fixed bottom-4 left-4 z-40 bg-white/80 dark:bg-slate-800/80 shadow-md"
        onClick={() => setIsOpen(true)}
      >
        PWA Debug
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">PWA Status Checker</h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} />
            <span>Running as PWA:</span>
          </div>
          <div className="flex items-center gap-1">
            {isPWA ? (
              <><Check className="text-green-500" size={16} /> <span className="text-green-600">Yes</span></>
            ) : (
              <><X className="text-red-500" size={16} /> <span className="text-red-600">No</span></>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={16} />
            <span>Service Worker:</span>
          </div>
          <div>
            {serviceWorkerStatus.includes('Active') ? (
              <span className="text-green-600">{serviceWorkerStatus}</span>
            ) : (
              <span className="text-red-600">{serviceWorkerStatus}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} />
            <span>IndexedDB Status:</span>
          </div>
          <div>
            {dbStatus.includes('Connected') ? (
              <span className="text-green-600">{dbStatus}</span>
            ) : (
              <span className="text-red-600">{dbStatus}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>
            <span>Cache Storage:</span>
          </div>
          <span>{cacheSize}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={16} />
            <span>Network Status:</span>
          </div>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <><Check className="text-green-500" size={16} /> <span className="text-green-600">Online</span></>
            ) : (
              <><X className="text-red-500" size={16} /> <span className="text-red-600">Offline</span></>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={triggerOfflineMode}>
          Test Offline Mode
        </Button>
        <Button size="sm" variant="outline" onClick={triggerOnlineMode}>
          Test Online Mode
        </Button>
      </div>
    </div>
  );
}