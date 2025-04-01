// Service Worker Registration

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
    });
  } else {
    console.log('Service workers are not supported in this browser.');
  }
}

// Check if the app is installed or in standalone mode
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

// Display installation prompt
export function promptInstall(callback?: () => void) {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    if (callback) callback();
  });

  return {
    isInstallable: () => !!deferredPrompt,
    showInstallPrompt: () => {
      if (!deferredPrompt) return false;

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      });

      return true;
    }
  };
}