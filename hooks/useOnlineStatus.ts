import { useState, useEffect } from 'react';
import { Telemetry } from '../utils/telemetry';

/**
 * Lane 4 Helper: Detects network connectivity.
 * Used to trigger the Offline Fallback UI.
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        Telemetry.info('Network', 'Connection Restored');
    };
    
    const handleOffline = () => {
        setIsOnline(false);
        Telemetry.warn('Network', 'Connection Lost - Entering Offline Mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};