import React, { useEffect, useState } from 'react';

interface MiniRoundClockProps {
  size?: number;
  isDark?: boolean;
  showDigits?: boolean;
}

export const MiniRoundClock: React.FC<MiniRoundClockProps> = ({ 
  size = 28, 
  isDark = true,
  showDigits = false
}) => {
  const [angles, setAngles] = useState({ hour: 0, minute: 0, second: 0 });
  const [digitalTime, setDigitalTime] = useState('');

  useEffect(() => {
    let animId: number;

    const update = () => {
      const now = new Date();
      const ms = now.getMilliseconds();
      const s = now.getSeconds() + ms / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;

      setAngles({
        hour: h * 30,
        minute: m * 6,
        second: s * 6
      });

      if (showDigits) {
        const hoursStr = (now.getHours() % 12 || 12).toString().padStart(2, '0');
        const minsStr = now.getMinutes().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        setDigitalTime(`${hoursStr}:${minsStr} ${ampm}`);
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [showDigits]);

  return (
    <div className="flex items-center gap-1.5 select-none pointer-events-none">
      <div 
        className="relative rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 40 40" 
          className="w-full h-full drop-shadow-sm overflow-visible"
        >
          {/* Dial Background */}
          <circle
            cx="20"
            cy="20"
            r="18.5"
            fill={isDark ? '#0b0f19' : '#ffffff'}
            stroke={isDark ? '#00E5FF' : '#3b82f6'}
            strokeWidth="1.5"
            className="transition-colors"
          />

          {/* 4 Cardinal tick marks (12, 3, 6, 9) */}
          <line x1="20" y1="4" x2="20" y2="7" stroke={isDark ? '#00E5FF' : '#2563eb'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="36" y1="20" x2="33" y2="20" stroke={isDark ? '#00E5FF' : '#2563eb'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="36" x2="20" y2="33" stroke={isDark ? '#00E5FF' : '#2563eb'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="20" x2="7" y2="20" stroke={isDark ? '#00E5FF' : '#2563eb'} strokeWidth="1.5" strokeLinecap="round" />

          {/* Hour Hand */}
          <line
            x1="20"
            y1="20"
            x2="20"
            y2="10.5"
            stroke={isDark ? '#ffffff' : '#0f172a'}
            strokeWidth="2.2"
            strokeLinecap="round"
            transform={`rotate(${angles.hour}, 20, 20)`}
          />

          {/* Minute Hand */}
          <line
            x1="20"
            y1="20"
            x2="20"
            y2="6.5"
            stroke={isDark ? '#cbd5e1' : '#334155'}
            strokeWidth="1.6"
            strokeLinecap="round"
            transform={`rotate(${angles.minute}, 20, 20)`}
          />

          {/* Second Hand (Live Animation) */}
          <line
            x1="20"
            y1="23"
            x2="20"
            y2="5"
            stroke={isDark ? '#00E5FF' : '#ef4444'}
            strokeWidth="1.2"
            strokeLinecap="round"
            transform={`rotate(${angles.second}, 20, 20)`}
          />

          {/* Center Pivot Pin */}
          <circle
            cx="20"
            cy="20"
            r="1.8"
            fill={isDark ? '#00E5FF' : '#ef4444'}
          />
        </svg>
      </div>

      {showDigits && (
        <span className="font-mono text-xs font-semibold tracking-tight whitespace-nowrap">
          {digitalTime}
        </span>
      )}
    </div>
  );
};
