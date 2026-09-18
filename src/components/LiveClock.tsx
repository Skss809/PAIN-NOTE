import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  Pause, 
  Flame, 
  Globe, 
  Sparkles, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Timer,
  Flag,
  Calendar,
  Compass,
  Zap
} from 'lucide-react';

interface LiveClockProps {
  isDark?: boolean;
  onClose?: () => void;
}

type ClockTheme = 'obsidian' | 'chrono' | 'minimal' | 'emerald';
type ToolMode = 'clock' | 'stopwatch' | 'timer' | 'world';

interface WorldCity {
  city: string;
  country: string;
  timezone: string;
  flag: string;
}

const WORLD_CITIES: WorldCity[] = [
  { city: 'London', country: 'United Kingdom', timezone: 'Europe/London', flag: '🇬🇧' },
  { city: 'New York', country: 'United States', timezone: 'America/New_York', flag: '🇺🇸' },
  { city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { city: 'Paris', country: 'France', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { city: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
];

export const LiveClock: React.FC<LiveClockProps> = ({ isDark = true, onClose }) => {
  // Navigation tool tabs
  const [toolMode, setToolMode] = useState<ToolMode>('clock');
  const [theme, setTheme] = useState<ClockTheme>('obsidian');
  const [smoothSweep, setSmoothSweep] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<WorldCity | null>(null);

  // Time state updated via requestAnimationFrame
  const [timeData, setTimeData] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    hourAngle: 0,
    minuteAngle: 0,
    secondAngle: 0,
    dateString: '',
    timeString: '',
    amPm: '',
    dayOfWeek: '',
    fullDate: '',
    timezone: ''
  });

  // Web Audio synth tick
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSecondRef = useRef<number>(-1);

  const playMechanicalTick = (isMajor: boolean = false) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isMajor ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isMajor ? 1200 : 980, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Stopwatch state
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchTimeMs, setStopwatchTimeMs] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchRef = useRef<{ startTime: number; accumulated: number } | null>(null);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTotalSec, setTimerTotalSec] = useState(25 * 60); // 25 min default
  const [timerRemainingSec, setTimerRemainingSec] = useState(25 * 60);
  const timerIntervalRef = useRef<number | null>(null);

  // Animation Frame loop for silky 60fps clock hands
  useEffect(() => {
    let animId: number;

    const updateClock = () => {
      const now = new Date();

      // If world city is selected, adjust time
      let targetDate = now;
      if (selectedCity) {
        try {
          const str = now.toLocaleString('en-US', { timeZone: selectedCity.timezone });
          targetDate = new Date(str);
        } catch {
          targetDate = now;
        }
      }

      const hours = targetDate.getHours();
      const minutes = targetDate.getMinutes();
      const seconds = targetDate.getSeconds();
      const ms = targetDate.getMilliseconds();

      // Check for tick sound on second change
      if (seconds !== lastSecondRef.current) {
        lastSecondRef.current = seconds;
        playMechanicalTick(seconds % 5 === 0);
      }

      // Calculate hand angles in degrees
      let secFraction = seconds;
      if (smoothSweep) {
        secFraction += ms / 1000;
      }
      const minFraction = minutes + secFraction / 60;
      const hourFraction = (hours % 12) + minFraction / 60;

      const secondAngle = secFraction * 6; // 360 / 60 = 6 deg/sec
      const minuteAngle = minFraction * 6; // 6 deg/min
      const hourAngle = hourFraction * 30; // 360 / 12 = 30 deg/hour

      // Formatting strings
      const displayHours = is24Hour ? hours : (hours % 12 || 12);
      const amPm = hours >= 12 ? 'PM' : 'AM';
      const timeString = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const fullDate = targetDate.toLocaleDateString(undefined, options);
      const dayOfWeek = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
      const dateString = `${targetDate.getDate()} ${targetDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}`;
      
      const tz = selectedCity 
        ? `${selectedCity.city} (${selectedCity.timezone.split('/')[1]?.replace('_', ' ') || ''})`
        : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time');

      setTimeData({
        hours,
        minutes,
        seconds,
        milliseconds: ms,
        hourAngle,
        minuteAngle,
        secondAngle,
        dateString,
        timeString,
        amPm,
        dayOfWeek,
        fullDate,
        timezone: tz
      });

      animId = requestAnimationFrame(updateClock);
    };

    animId = requestAnimationFrame(updateClock);
    return () => cancelAnimationFrame(animId);
  }, [smoothSweep, is24Hour, selectedCity, soundEnabled]);

  // Stopwatch interval
  useEffect(() => {
    let interval: number;
    if (stopwatchRunning) {
      interval = window.setInterval(() => {
        if (stopwatchRef.current) {
          const now = Date.now();
          const elapsed = now - stopwatchRef.current.startTime + stopwatchRef.current.accumulated;
          setStopwatchTimeMs(elapsed);
        }
      }, 16);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

  const toggleStopwatch = () => {
    if (!stopwatchRunning) {
      stopwatchRef.current = {
        startTime: Date.now(),
        accumulated: stopwatchTimeMs
      };
      setStopwatchRunning(true);
    } else {
      if (stopwatchRef.current) {
        stopwatchRef.current.accumulated = stopwatchTimeMs;
      }
      setStopwatchRunning(false);
    }
  };

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTimeMs(0);
    setLaps([]);
    stopwatchRef.current = null;
  };

  const lapStopwatch = () => {
    if (stopwatchRunning) {
      setLaps(prev => [stopwatchTimeMs, ...prev]);
    }
  };

  // Timer interval
  useEffect(() => {
    if (timerRunning && timerRemainingSec > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerRemainingSec(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            playMechanicalTick(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, timerRemainingSec]);

  const setTimerPreset = (minutes: number) => {
    setTimerRunning(false);
    const secs = minutes * 60;
    setTimerTotalSec(secs);
    setTimerRemainingSec(secs);
  };

  // Format Stopwatch time
  const formatStopwatch = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  // Format Timer time
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Theme styling definitions
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'chrono':
        return {
          dialBg: isDark 
            ? 'radial-gradient(circle, #1a1f2c 0%, #0d1117 70%, #080a0e 100%)' 
            : 'radial-gradient(circle, #f0f4f8 0%, #d9e2ec 70%, #bcccdc 100%)',
          bezelBorder: isDark ? 'border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]' : 'border-slate-300 shadow-xl',
          majorTick: isDark ? '#60a5fa' : '#334155',
          minorTick: isDark ? '#3b82f640' : '#94a3b8',
          numeralColor: isDark ? '#e2e8f0' : '#1e293b',
          hourHand: isDark ? '#93c5fd' : '#1e293b',
          minuteHand: isDark ? '#60a5fa' : '#334155',
          secondHand: '#ef4444',
          subdialBorder: isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(51, 65, 85, 0.15)',
          accentGlow: 'rgba(59, 130, 246, 0.4)',
          name: 'Chronograph'
        };
      case 'minimal':
        return {
          dialBg: isDark 
            ? 'radial-gradient(circle, #171717 0%, #0a0a0a 100%)' 
            : 'radial-gradient(circle, #fafafa 0%, #f4f4f5 100%)',
          bezelBorder: isDark ? 'border-neutral-800 shadow-2xl' : 'border-neutral-200 shadow-xl',
          majorTick: isDark ? '#ffffff' : '#18181b',
          minorTick: isDark ? '#404040' : '#d4d4d8',
          numeralColor: isDark ? '#fafafa' : '#27272a',
          hourHand: isDark ? '#ffffff' : '#18181b',
          minuteHand: isDark ? '#a3a3a3' : '#52525b',
          secondHand: '#f97316',
          subdialBorder: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          accentGlow: 'rgba(249, 115, 22, 0.3)',
          name: 'Minimal Bauhaus'
        };
      case 'emerald':
        return {
          dialBg: isDark 
            ? 'radial-gradient(circle, #062c20 0%, #031711 70%, #010a08 100%)' 
            : 'radial-gradient(circle, #ecfdf5 0%, #d1fae5 70%, #a7f3d0 100%)',
          bezelBorder: isDark ? 'border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-emerald-200 shadow-xl',
          majorTick: '#f59e0b',
          minorTick: isDark ? '#05966960' : '#10b98160',
          numeralColor: isDark ? '#fef3c7' : '#064e3b',
          hourHand: '#f59e0b',
          minuteHand: isDark ? '#fbbf24' : '#d97706',
          secondHand: '#10b981',
          subdialBorder: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)',
          accentGlow: 'rgba(16, 185, 129, 0.4)',
          name: 'Emerald Luxe'
        };
      case 'obsidian':
      default:
        return {
          dialBg: isDark 
            ? 'radial-gradient(circle, #121824 0%, #0a0d14 70%, #030508 100%)' 
            : 'radial-gradient(circle, #ffffff 0%, #f1f5f9 70%, #e2e8f0 100%)',
          bezelBorder: isDark ? 'border-[#00E5FF]/40 shadow-[0_0_40px_rgba(0,229,255,0.2)]' : 'border-neutral-300 shadow-2xl',
          majorTick: isDark ? '#00E5FF' : '#0284c7',
          minorTick: isDark ? 'rgba(0, 229, 255, 0.25)' : '#94a3b8',
          numeralColor: isDark ? '#f8fafc' : '#0f172a',
          hourHand: isDark ? '#ffffff' : '#0f172a',
          minuteHand: isDark ? '#cbd5e1' : '#334155',
          secondHand: '#00E5FF',
          subdialBorder: isDark ? 'rgba(0, 229, 255, 0.3)' : 'rgba(2, 132, 199, 0.2)',
          accentGlow: 'rgba(0, 229, 255, 0.5)',
          name: 'Cyber Obsidian'
        };
    }
  }, [theme, isDark]);

  // Generate 60 ticks
  const dialTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const angle = i * 6;
      const isMajor = i % 5 === 0;
      return { index: i, angle, isMajor };
    });
  }, []);

  // Numbers 1-12 positions
  const dialNumbers = useMemo(() => {
    return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
      const angle = (num * 30 - 90) * (Math.PI / 180);
      const radius = 122; // px radius on 320px SVG
      const x = 160 + radius * Math.cos(angle);
      const y = 160 + radius * Math.sin(angle);
      return { num, x, y };
    });
  }, []);

  return (
    <div className={`flex-1 w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col border ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 ${
      isDark ? 'bg-black/85 border-white/10 text-white' : 'bg-white/95 border-neutral-200 text-neutral-900'
    }`}>
      {/* Top Header Bar */}
      <div className={`px-4 sm:px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-100 bg-neutral-50/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-12 ${
            isDark 
              ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_20px_rgba(0,229,255,0.25)]' 
              : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '30s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Live Precision Clock</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Live Synchronized
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              High-frequency animated analog escapement & temporal utilities
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Click Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playMechanicalTick(true);
            }}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              soundEnabled
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                : (isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white' : 'bg-white border-neutral-200 text-neutral-600')
            }`}
            title={soundEnabled ? "Mute Mechanical Tick" : "Enable Mechanical Tick Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Tick On' : 'Silent'}</span>
          </button>

          {/* Sweep vs Tick Toggle */}
          <button
            onClick={() => setSmoothSweep(!smoothSweep)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              smoothSweep
                ? (isDark ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40' : 'bg-blue-50 text-blue-600 border-blue-200')
                : (isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600')
            }`}
            title="Toggle smooth continuous automatic movement vs quartz step tick"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{smoothSweep ? 'Continuous Sweep' : 'Step Tick'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500'
              }`}
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/30' : 'border-neutral-100 bg-neutral-50/50'
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setToolMode('clock'); setSelectedCity(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              toolMode === 'clock' && !selectedCity
                ? (isDark ? 'bg-white text-black shadow-md' : 'bg-neutral-900 text-white shadow-md')
                : (isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60' : 'text-neutral-600 hover:bg-neutral-100')
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Local Clock
          </button>

          <button
            onClick={() => setToolMode('world')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              toolMode === 'world' || selectedCity
                ? (isDark ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40' : 'bg-blue-50 text-blue-600 border border-blue-200')
                : (isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60' : 'text-neutral-600 hover:bg-neutral-100')
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> World Time {selectedCity && `(${selectedCity.city})`}
          </button>

          <button
            onClick={() => setToolMode('stopwatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              toolMode === 'stopwatch'
                ? (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-amber-50 text-amber-700 border border-amber-200')
                : (isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60' : 'text-neutral-600 hover:bg-neutral-100')
            }`}
          >
            <Timer className="w-3.5 h-3.5" /> Stopwatch
          </button>

          <button
            onClick={() => setToolMode('timer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              toolMode === 'timer'
                ? (isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-rose-50 text-rose-700 border border-rose-200')
                : (isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60' : 'text-neutral-600 hover:bg-neutral-100')
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Focus Timer
          </button>
        </div>

        {/* Dial Theme Switcher */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 mr-1 hidden md:inline">Dial:</span>
          {(['obsidian', 'chrono', 'minimal', 'emerald'] as ClockTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                theme === t
                  ? (isDark ? 'bg-neutral-700 text-white shadow-inner font-bold' : 'bg-white shadow text-neutral-900 font-bold')
                  : (isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900')
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Clock Stage */}
      <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center gap-8 overflow-y-auto min-h-0">
        
        {/* Animated Round Clock Dial */}
        <div className="relative flex items-center justify-center">
          
          {/* Subtle Outer Ambient Radial Glow */}
          <div 
            className="absolute rounded-full pointer-events-none filter blur-2xl transition-all duration-700 opacity-60"
            style={{
              width: '360px',
              height: '360px',
              backgroundColor: themeStyles.accentGlow
            }}
          />

          {/* Clock Outer Bezel Ring */}
          <div 
            className={`relative rounded-full p-3 sm:p-4 border-2 transition-all duration-500 backdrop-blur-md ${themeStyles.bezelBorder}`}
            style={{
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -4px 10px rgba(0,0,0,0.4)`
            }}
          >
            {/* SVG Analog Clock Face */}
            <svg 
              className="w-72 h-72 sm:w-96 sm:h-96 drop-shadow-2xl select-none"
              viewBox="0 0 320 320"
            >
              <defs>
                {/* Radial gradient dial background */}
                <radialGradient id="clockDialGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={isDark ? '#1a2233' : '#ffffff'} />
                  <stop offset="70%" stopColor={isDark ? '#0c1017' : '#e2e8f0'} />
                  <stop offset="100%" stopColor={isDark ? '#04060a' : '#cbd5e1'} />
                </radialGradient>

                {/* Hand drop shadow */}
                <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
                </filter>
                <filter id="secondShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={themeStyles.secondHand} floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Dial Face Circle */}
              <circle
                cx="160"
                cy="160"
                r="154"
                fill="url(#clockDialGrad)"
                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
                strokeWidth="1.5"
              />

              {/* Inner Decorative Accent Ring */}
              <circle
                cx="160"
                cy="160"
                r="138"
                fill="none"
                stroke={themeStyles.subdialBorder}
                strokeWidth="1"
                strokeDasharray="2 4"
              />

              {/* 60 Dial Tick Marks */}
              {dialTicks.map(({ index, angle, isMajor }) => {
                const rad = (angle - 90) * (Math.PI / 180);
                const rOuter = 150;
                const rInner = isMajor ? 136 : 144;
                const x1 = 160 + rOuter * Math.cos(rad);
                const y1 = 160 + rOuter * Math.sin(rad);
                const x2 = 160 + rInner * Math.cos(rad);
                const y2 = 160 + rInner * Math.sin(rad);

                // Highlight tick under second hand
                const isCurrentSec = Math.floor(timeData.seconds) === index;

                return (
                  <line
                    key={index}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCurrentSec ? themeStyles.secondHand : (isMajor ? themeStyles.majorTick : themeStyles.minorTick)}
                    strokeWidth={isMajor ? 2.5 : 1}
                    strokeLinecap="round"
                    className="transition-colors duration-150"
                  />
                );
              })}

              {/* Radial Hour Numerals */}
              {dialNumbers.map(({ num, x, y }) => (
                <text
                  key={num}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={themeStyles.numeralColor}
                  fontSize={num % 3 === 0 ? "17" : "14"}
                  fontWeight={num % 3 === 0 ? "800" : "600"}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  opacity={num % 3 === 0 ? "1" : "0.85"}
                >
                  {num}
                </text>
              ))}

              {/* Sub-Dial Top: Day of Week & Chrono Branding */}
              <g transform="translate(160, 100)">
                <rect 
                  x="-32" 
                  y="-10" 
                  width="64" 
                  height="18" 
                  rx="6" 
                  fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                  stroke={themeStyles.subdialBorder}
                  strokeWidth="0.75"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="1.5"
                  fill={themeStyles.numeralColor}
                  opacity="0.8"
                >
                  {timeData.dayOfWeek.toUpperCase()}
                </text>
              </g>

              {/* Sub-Dial Bottom: Date Window */}
              <g transform="translate(160, 215)">
                <rect 
                  x="-28" 
                  y="-11" 
                  width="56" 
                  height="20" 
                  rx="5" 
                  fill={isDark ? '#090d14' : '#ffffff'}
                  stroke={themeStyles.subdialBorder}
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="monospace"
                  fill={isDark ? '#60a5fa' : '#2563eb'}
                >
                  {timeData.dateString}
                </text>
              </g>

              {/* Brand Label Center */}
              <text
                x="160"
                y="135"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fontWeight="800"
                letterSpacing="2.5"
                fill={themeStyles.numeralColor}
                opacity="0.45"
              >
                AUTOMATIC
              </text>

              {/* --- CLOCK HANDS --- */}

              {/* Hour Hand */}
              <g 
                transform={`rotate(${timeData.hourAngle}, 160, 160)`}
                filter="url(#handShadow)"
              >
                {/* Tapered Hour Spear */}
                <path
                  d="M156.5 160 L158 80 L160 70 L162 80 L163.5 160 L160 172 Z"
                  fill={themeStyles.hourHand}
                />
                {/* Center luminous strip on hour hand */}
                <line
                  x1="160"
                  y1="88"
                  x2="160"
                  y2="148"
                  stroke={isDark ? '#00E5FF' : '#ffffff'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>

              {/* Minute Hand */}
              <g 
                transform={`rotate(${timeData.minuteAngle}, 160, 160)`}
                filter="url(#handShadow)"
              >
                {/* Sleek Minute Needle */}
                <path
                  d="M157.5 160 L159 45 L160 35 L161 45 L162.5 160 L160 176 Z"
                  fill={themeStyles.minuteHand}
                />
                {/* Luminous center stripe on minute hand */}
                <line
                  x1="160"
                  y1="50"
                  x2="160"
                  y2="145"
                  stroke={isDark ? '#00E5FF' : '#ffffff'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>

              {/* Second Hand (Live sweeping / ticking) */}
              <g 
                transform={`rotate(${timeData.secondAngle}, 160, 160)`}
                filter="url(#secondShadow)"
              >
                {/* Ultra-fine needle extending through center to counterweight */}
                <line
                  x1="160"
                  y1="195"
                  x2="160"
                  y2="28"
                  stroke={themeStyles.secondHand}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Counterweight circle */}
                <circle
                  cx="160"
                  cy="185"
                  r="5"
                  fill="none"
                  stroke={themeStyles.secondHand}
                  strokeWidth="1.5"
                />
                {/* Second pointer arrowhead */}
                <circle
                  cx="160"
                  cy="32"
                  r="2.5"
                  fill={themeStyles.secondHand}
                />
              </g>

              {/* Center Pinion Cap */}
              <circle
                cx="160"
                cy="160"
                r="7"
                fill={isDark ? '#1e293b' : '#334155'}
                stroke={themeStyles.secondHand}
                strokeWidth="2"
              />
              <circle
                cx="160"
                cy="160"
                r="2.5"
                fill={themeStyles.secondHand}
              />
            </svg>
          </div>
        </div>

        {/* Digital Readout & Mode Display */}
        <div className="w-full max-w-xl flex flex-col items-center gap-4">
          
          {/* Main Digital Clock Display */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight drop-shadow-sm">
                {timeData.timeString}
              </span>
              <button
                onClick={() => setIs24Hour(!is24Hour)}
                className={`text-xs px-2 py-1 rounded-md font-bold transition-colors ${
                  isDark ? 'bg-neutral-800 text-neutral-300 hover:text-white' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
                title="Toggle 12h/24h"
              >
                {!is24Hour ? timeData.amPm : '24H'}
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-medium opacity-80">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 opacity-60" /> {timeData.fullDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[11px] opacity-75">
                <Compass className="w-3.5 h-3.5 opacity-60" /> {timeData.timezone}
              </span>
            </div>
          </div>

          {/* Conditional Sub-Tool Controls */}

          {/* 1. World Time Mode */}
          {toolMode === 'world' && (
            <div className={`w-full rounded-2xl p-4 border transition-all ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                  World Time Zones
                </span>
                {selectedCity && (
                  <button
                    onClick={() => setSelectedCity(null)}
                    className="text-xs text-blue-500 hover:underline font-semibold"
                  >
                    Reset to Local
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WORLD_CITIES.map(c => {
                  const isSelected = selectedCity?.city === c.city;
                  let cityTimeStr = '';
                  try {
                    const cityDate = new Date(new Date().toLocaleString('en-US', { timeZone: c.timezone }));
                    const h = is24Hour ? cityDate.getHours() : (cityDate.getHours() % 12 || 12);
                    const m = cityDate.getMinutes().toString().padStart(2, '0');
                    const ap = cityDate.getHours() >= 12 ? 'PM' : 'AM';
                    cityTimeStr = `${h}:${m} ${!is24Hour ? ap : ''}`;
                  } catch {
                    cityTimeStr = '--:--';
                  }

                  return (
                    <button
                      key={c.city}
                      onClick={() => setSelectedCity(c)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? (isDark ? 'bg-[#00E5FF]/15 border-[#00E5FF]/50 text-white' : 'bg-blue-50 border-blue-400 text-blue-900')
                          : (isDark ? 'bg-neutral-800/60 border-neutral-700/60 hover:border-neutral-600' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100')
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{c.flag}</span>
                        <span className="text-[10px] opacity-60 font-medium truncate">{c.city}</span>
                      </div>
                      <div className="font-mono text-sm font-bold tracking-tight">
                        {cityTimeStr}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Stopwatch Mode */}
          {toolMode === 'stopwatch' && (
            <div className={`w-full rounded-2xl p-4 sm:p-5 border transition-all flex flex-col items-center gap-4 ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  Precision Chronometer
                </span>
                <span className="text-[11px] opacity-60 font-mono">1/100th Second Accuracy</span>
              </div>

              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-amber-500 tracking-tight">
                {formatStopwatch(stopwatchTimeMs)}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleStopwatch}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
                    stopwatchRunning
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {stopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {stopwatchRunning ? 'Stop' : 'Start'}
                </button>

                <button
                  onClick={lapStopwatch}
                  disabled={!stopwatchRunning}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 border transition-all disabled:opacity-40 ${
                    isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <Flag className="w-4 h-4" /> Lap
                </button>

                <button
                  onClick={resetStopwatch}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 border transition-all ${
                    isDark ? 'border-neutral-700 hover:bg-neutral-800 text-red-400' : 'border-neutral-300 hover:bg-neutral-100 text-red-600'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>

              {/* Lap times */}
              {laps.length > 0 && (
                <div className="w-full max-h-36 overflow-y-auto space-y-1.5 pt-2 border-t border-neutral-500/20">
                  {laps.map((lapMs, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
                        isDark ? 'bg-neutral-800/50 font-mono' : 'bg-neutral-100 font-mono'
                      }`}
                    >
                      <span className="opacity-60">Lap #{laps.length - idx}</span>
                      <span className="font-bold">{formatStopwatch(lapMs)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Focus / Pomodoro Timer Mode */}
          {toolMode === 'timer' && (
            <div className={`w-full rounded-2xl p-4 sm:p-5 border transition-all flex flex-col items-center gap-4 ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                  Focus Interval Timer
                </span>
                <span className="text-[11px] opacity-60">Deep Work & Study</span>
              </div>

              {/* Circular Progress Display */}
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-rose-500 tracking-tight">
                {formatTimer(timerRemainingSec)}
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2">
                {[15, 25, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setTimerPreset(mins)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                      timerTotalSec === mins * 60 && !timerRunning
                        ? 'bg-rose-500 text-white border-rose-600'
                        : (isDark ? 'border-neutral-700 bg-neutral-800/60 hover:bg-neutral-800' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100')
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
                    timerRunning
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {timerRunning ? 'Pause' : 'Start Focus'}
                </button>

                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerRemainingSec(timerTotalSec);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 border transition-all ${
                    isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-300 hover:bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
