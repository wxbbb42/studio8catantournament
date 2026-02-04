import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  deadline: string;
  onExpire?: () => void;
}

const Timer: React.FC<TimerProps> = ({ deadline, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(null);
        if (onExpire) onExpire();
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!timeLeft) {
    return <div className="text-xl font-bold text-catan-brick">Registration Closed</div>;
  }

  return (
    <div className="flex gap-4 items-center justify-center bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200">
        <Clock className="w-6 h-6 text-catan-ore animate-pulse" />
        
        <div className="flex gap-4 text-center">
            <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-800">{timeLeft.days}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Days</span>
            </div>
            <div className="text-2xl font-bold text-slate-300">:</div>
            <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-800">{timeLeft.hours}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Hours</span>
            </div>
            <div className="text-2xl font-bold text-slate-300">:</div>
            <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-800">{timeLeft.minutes}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Mins</span>
            </div>
            <div className="text-2xl font-bold text-slate-300">:</div>
             <div className="flex flex-col">
                <span className="text-3xl font-black text-catan-brick w-12">{timeLeft.seconds}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">Secs</span>
            </div>
        </div>
    </div>
  );
};

export default Timer;