import { useState, useEffect, useRef } from 'react';

export default function CountdownTimer({ deadline, className = '' }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = new Date(deadline) - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const diff = new Date(deadline) - Date.now();
      const next = Math.max(0, Math.floor(diff / 1000));
      setSecondsLeft((prev) => (prev === next ? prev : next));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [deadline]);

  const totalDays    = 21;
  const daysLeft     = Math.floor(secondsLeft / 86400);
  const hoursLeft    = Math.floor((secondsLeft % 86400) / 3600);
  const isUrgent     = daysLeft < 3;
  const progress     = Math.max(0, Math.min(1, secondsLeft / (totalDays * 86400)));
  const barColor     = isUrgent ? 'var(--red)' : daysLeft < 7 ? 'var(--yellow)' : 'var(--accent)';

  if (secondsLeft === 0) {
    return <span className="text-xs" style={{ color: 'var(--red)' }}>Expired</span>;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: isUrgent ? 'var(--red)' : 'var(--text-muted)' }}>
          {daysLeft}d {hoursLeft}h left
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'var(--bg-hover)' }}>
        <div
          className="h-1 rounded-full transition-all duration-1000"
          style={{ width: `${progress * 100}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
