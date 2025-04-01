// Service Worker Registration and PWA Support

// Shared state for installation prompt
let deferredPrompt: any = null;

// Register service worker with improved error handling and logging
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // First unregister any existing service workers to ensure clean state
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Unregistered existing service worker');
        }
        
        // Register the service worker with correct path
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Don't use browser cache for service worker
        });
        
        console.log('ServiceWorker registration successful with scope:', registration.scope);
        
        // Set up update handling
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New service worker available, refresh to update');
                  // Optional: Show notification to user about update
                } else {
                  console.log('Service worker installed for the first time');
                }
              }
            };
          }
        };
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
          console.log('Checking for service worker updates');
        }, 60 * 60 * 1000);
        
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    });
    
    // Listen for controller change events
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed');
    });
    
  } else {
    console.log('Service workers are not supported in this browser.');
  }
}

// Check if the app is installed or in standalone mode
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.matchMedia('(display-mode: minimal-ui)').matches;
}

// Handle installation prompt events
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  console.log('Install prompt ready');
});

// Handle app installation success
window.addEventListener('appinstalled', () => {
  // Clear the prompt reference
  deferredPrompt = null;
  // Log app was installed
  console.log('PWA was installed');
});

// Helper to update service worker
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.update();
    });
  }
}

// Display installation prompt with improved feedback
export function promptInstall(callback?: () => void) {
  if (callback && deferredPrompt) callback();
  
  return {
    isInstallable: () => !!deferredPrompt,
    showInstallPrompt: () => {
      if (!deferredPrompt) return false;

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      return deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        const wasAccepted = choiceResult.outcome === 'accepted';
        console.log(`User ${wasAccepted ? 'accepted' : 'dismissed'} the install prompt`);
        deferredPrompt = null;
        return wasAccepted;
      });
    }
  };
}