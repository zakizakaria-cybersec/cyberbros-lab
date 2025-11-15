import React, { useEffect, useState } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div style={{ 
      fontSize: '1.2rem', 
      fontWeight: 'bold',
      color: timeRemaining < 600 ? '#d32f2f' : '#2e7d32'
    }}>
      Time Remaining: {formatTime(timeRemaining)}
    </div>
  );
};

export default CountdownTimer;
