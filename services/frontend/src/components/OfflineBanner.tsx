import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './OfflineBanner.css';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="offline-banner">
      <WifiOff size={20} />
      <span>You are offline. Data may be outdated.</span>
    </div>
  );
};
