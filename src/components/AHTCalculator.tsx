import React, { useState } from 'react';
import { 
  Calculator, 
  Clock, 
  PhoneCall, 
  PauseCircle, 
  FileCheck, 
  RotateCcw, 
  Copy, 
  Check, 
  Info,
  History,
  Trash2,
  HelpCircle,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface AHTCalculatorProps {
  isDark?: boolean;
}

interface SavedCalculation {
  id: string;
  timestamp: number;
  calls: number;
  talkTimeSec: number;
  holdTimeSec: number;
  wrapTimeSec: number;
  ahtSec: number;
  note?: string;
}

export const AHTCalculator: React.FC<AHTCalculatorProps> = ({ isDark = true }) => {
  // Individual unit modes for each metric
  const [talkUnit, setTalkUnit] = useState<'sec' | 'min' | 'hr'>('sec');
  const [holdUnit, setHoldUnit] = useState<'sec' | 'min' | 'hr'>('sec');
  const [wrapUnit, setWrapUnit] = useState<'sec' | 'min' | 'hr'>('sec');

  // Helper to set all units at once
  const setAllUnits = (unit: 'sec' | 'min' | 'hr') => {
    setTalkUnit(unit);
    setHoldUnit(unit);
    setWrapUnit(unit);
  };

  // Helper to parse string (number or MM:SS or HH:MM:SS) to seconds
  const parseToSeconds = (input: string, unit: 'sec' | 'min' | 'hr'): number => {
    const trimmed = input.trim();
    if (!trimmed) return 0;

    // Handle HH:MM:SS or MM:SS format
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(p => parseFloat(p) || 0);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
    }

    const val = parseFloat(trimmed) || 0;
    if (unit === 'hr') return val * 3600;
    if (unit === 'min') return val * 60;
    return val;
  };

  // Output display unit mode: 'sec' | 'min' | 'formatted'
  const [displayUnit, setDisplayUnit] = useState<'sec' | 'min' | 'formatted'>('sec');

  // Input states
  const [callsInput, setCallsInput] = useState<string>('150');
  const [talkInput, setTalkInput] = useState<string>('36000');
  const [holdInput, setHoldInput] = useState<string>('1500');
  const [wrapInput, setWrapInput] = useState<string>('4500');

  // Calculation output state
  const [result, setResult] = useState<{
    ahtSec: number;
    totalTimeSec: number;
    calls: number;
    avgTalkSec: number;
    avgHoldSec: number;
    avgWrapSec: number;
    talkPercent: number;
    holdPercent: number;
    wrapPercent: number;
  } | null>({
    ahtSec: 280, // (36000 + 1500 + 4500) / 150 = 42000 / 150 = 280
    totalTimeSec: 42000,
    calls: 150,
    avgTalkSec: 240,
    avgHoldSec: 10,
    avgWrapSec: 30,
    talkPercent: 85.7,
    holdPercent: 3.6,
    wrapPercent: 10.7
  });

  const [copied, setCopied] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>(() => {
    try {
      const saved = localStorage.getItem('aht_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate AHT logic
  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const calls = parseFloat(callsInput) || 0;
    const talkSec = parseToSeconds(talkInput, talkUnit);
    const holdSec = parseToSeconds(holdInput, holdUnit);
    const wrapSec = parseToSeconds(wrapInput, wrapUnit);

    if (calls <= 0) {
      setResult(null);
      return;
    }

    const totalTimeSec = talkSec + holdSec + wrapSec;
    const ahtSec = totalTimeSec / calls;

    const avgTalkSec = talkSec / calls;
    const avgHoldSec = holdSec / calls;
    const avgWrapSec = wrapSec / calls;

    const talkPercent = totalTimeSec > 0 ? (talkSec / totalTimeSec) * 100 : 0;
    const holdPercent = totalTimeSec > 0 ? (holdSec / totalTimeSec) * 100 : 0;
    const wrapPercent = totalTimeSec > 0 ? (wrapSec / totalTimeSec) * 100 : 0;

    setResult({
      ahtSec,
      totalTimeSec,
      calls,
      avgTalkSec,
      avgHoldSec,
      avgWrapSec,
      talkPercent: Math.round(talkPercent * 10) / 10,
      holdPercent: Math.round(holdPercent * 10) / 10,
      wrapPercent: Math.round(wrapPercent * 10) / 10
    });
  };

  const handleReset = () => {
    setCallsInput('');
    setTalkInput('');
    setHoldInput('');
    setWrapInput('');
    setResult(null);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const formatHMS = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `AHT: ${Math.round(result.ahtSec)}s per call (${formatTime(result.ahtSec)})\nTotal Calls: ${result.calls}\nTotal Time: ${formatHMS(result.totalTimeSec)}\nFormula: (Talk + Hold + Wrap-up) / Total Calls`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveCalculation = () => {
    if (!result) return;
    const newEntry: SavedCalculation = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      calls: result.calls,
      talkTimeSec: result.avgTalkSec * result.calls,
      holdTimeSec: result.avgHoldSec * result.calls,
      wrapTimeSec: result.avgWrapSec * result.calls,
      ahtSec: result.ahtSec
    };
    const updated = [newEntry, ...savedCalculations];
    setSavedCalculations(updated);
    try {
      localStorage.setItem('aht_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSaved = (id: string) => {
    const updated = savedCalculations.filter(item => item.id !== id);
    setSavedCalculations(updated);
    try {
      localStorage.setItem('aht_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn text-neutral-100">
      
      {/* Executive Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#131313]/90 border border-[#2a2a2a] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              AHT Calculator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-mono">
                Executive Edition
              </span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">Quick AHT grabbing tool for call center metrics</p>
          </div>
        </div>

        {/* Unit switch & reset controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-[#0e0e0e] border border-[#262626]">
            <button
              type="button"
              onClick={() => setAllUnits('sec')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                talkUnit === 'sec' && holdUnit === 'sec' && wrapUnit === 'sec'
                  ? 'bg-[#20201f] text-[#00E5FF] font-semibold border border-[#353535]' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Sec
            </button>
            <button
              type="button"
              onClick={() => setAllUnits('min')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                talkUnit === 'min' && holdUnit === 'min' && wrapUnit === 'min'
                  ? 'bg-[#20201f] text-[#00E5FF] font-semibold border border-[#353535]' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Min
            </button>
            <button
              type="button"
              onClick={() => setAllUnits('hr')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                talkUnit === 'hr' && holdUnit === 'hr' && wrapUnit === 'hr'
                  ? 'bg-[#20201f] text-[#00E5FF] font-semibold border border-[#353535]' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Hr
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-[#1c1b1b] border border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#252424] transition-colors"
            title="Reset All Inputs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Form vs Result Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Metrics Input Form */}
        <div className="lg:col-span-7 bg-[#131313]/90 border border-[#262626] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#00E5FF]" />
              Metrics Input
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              Supports <span className="text-[#00E5FF]">Seconds</span>, <span className="text-[#00E5FF]">Minutes</span>, <span className="text-[#00E5FF]">Hours</span> & <span className="text-[#00E5FF]">MM:SS</span>
            </span>
          </div>

          <form onSubmit={handleCalculate} className="space-y-5">
            
            {/* Input 1: Total Calls Handled */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-[#00E5FF]" />
                Total Calls Handled
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={callsInput}
                onChange={(e) => setCallsInput(e.target.value)}
                placeholder="e.g., 150"
                className="w-full px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all placeholder:text-neutral-600"
              />
              <p className="text-[11px] text-neutral-400 font-sans">
                The total number of calls successfully processed during the given period.
              </p>
            </div>

            {/* Input 2: Total Talk Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Total Talk Time
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={talkInput}
                  onChange={(e) => setTalkInput(e.target.value)}
                  placeholder={talkUnit === 'sec' ? 'e.g., 36000 or 10:30' : talkUnit === 'min' ? 'e.g., 600' : 'e.g., 10'}
                  className="flex-1 px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all placeholder:text-neutral-600"
                />
                <select
                  value={talkUnit}
                  onChange={(e) => setTalkUnit(e.target.value as 'sec' | 'min' | 'hr')}
                  className="px-3 py-3 bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#00E5FF] font-semibold focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  <option value="sec">Seconds</option>
                  <option value="min">Minutes</option>
                  <option value="hr">Hours</option>
                </select>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Total time spent speaking. Enter number (e.g. 600) or format like 10:30 (MM:SS).
              </p>
            </div>

            {/* Input 3: Total Hold Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-1.5">
                  <PauseCircle className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Total Hold Time
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={holdInput}
                  onChange={(e) => setHoldInput(e.target.value)}
                  placeholder={holdUnit === 'sec' ? 'e.g., 1500 or 25:00' : holdUnit === 'min' ? 'e.g., 25' : 'e.g., 0.4'}
                  className="flex-1 px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all placeholder:text-neutral-600"
                />
                <select
                  value={holdUnit}
                  onChange={(e) => setHoldUnit(e.target.value as 'sec' | 'min' | 'hr')}
                  className="px-3 py-3 bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#00E5FF] font-semibold focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  <option value="sec">Seconds</option>
                  <option value="min">Minutes</option>
                  <option value="hr">Hours</option>
                </select>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Total time customers spent waiting on hold during calls.
              </p>
            </div>

            {/* Input 4: Total Wrap-up Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Total Wrap-up Time
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={wrapInput}
                  onChange={(e) => setWrapInput(e.target.value)}
                  placeholder={wrapUnit === 'sec' ? 'e.g., 4500 or 75:00' : wrapUnit === 'min' ? 'e.g., 75' : 'e.g., 1.25'}
                  className="flex-1 px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all placeholder:text-neutral-600"
                />
                <select
                  value={wrapUnit}
                  onChange={(e) => setWrapUnit(e.target.value as 'sec' | 'min' | 'hr')}
                  className="px-3 py-3 bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#00E5FF] font-semibold focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  <option value="sec">Seconds</option>
                  <option value="min">Minutes</option>
                  <option value="hr">Hours</option>
                </select>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Total after-call work (ACW) time spent documenting or processing post-call tasks.
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#00E5FF] text-[#001f24] hover:bg-[#00daf3] transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                Calculate AHT
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Calculated Results Display */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#131313]/90 border border-[#262626] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            
            {/* Ambient Cyan Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-[#262626] pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00E5FF]" />
                  Average Handling Time
                </h3>

                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveCalculation}
                      className="p-1.5 rounded-lg bg-[#20201f] border border-[#353535] text-xs font-mono text-neutral-300 hover:text-white hover:border-[#00E5FF] transition-colors"
                      title="Save Calculation to History"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="p-1.5 rounded-lg bg-[#20201f] border border-[#353535] text-xs font-mono text-neutral-300 hover:text-white hover:border-[#00E5FF] transition-colors flex items-center gap-1"
                      title="Copy to Clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Big Metric Card */}
              <div className="bg-[#0e0e0e] border border-[#262626] rounded-2xl p-6 text-center space-y-4 relative">
                {/* Result Unit Selector Tabs */}
                <div className="flex items-center justify-center gap-1 p-1 bg-[#131313] border border-[#262626] rounded-xl w-fit mx-auto">
                  <button
                    type="button"
                    onClick={() => setDisplayUnit('sec')}
                    className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all ${
                      displayUnit === 'sec'
                        ? 'bg-[#20201f] text-[#00E5FF] font-bold border border-[#353535] shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Seconds
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayUnit('min')}
                    className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all ${
                      displayUnit === 'min'
                        ? 'bg-[#20201f] text-[#00E5FF] font-bold border border-[#353535] shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayUnit('formatted')}
                    className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all ${
                      displayUnit === 'formatted'
                        ? 'bg-[#20201f] text-[#00E5FF] font-bold border border-[#353535] shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Formatted
                  </button>
                </div>

                {result ? (
                  <>
                    <div className="space-y-1">
                      <div className="text-4xl sm:text-5xl font-mono font-bold text-[#00E5FF] tracking-tight">
                        {displayUnit === 'sec' && `${Math.round(result.ahtSec)}s`}
                        {displayUnit === 'min' && `${(result.ahtSec / 60).toFixed(2)}m`}
                        {displayUnit === 'formatted' && formatTime(result.ahtSec)}
                      </div>
                      <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                        {displayUnit === 'sec' && 'Seconds per call'}
                        {displayUnit === 'min' && 'Minutes per call'}
                        {displayUnit === 'formatted' && 'Average handling time'}
                      </div>
                    </div>

                    {/* Multi-unit comparative badge */}
                    <div className="pt-3 border-t border-[#1c1b1b] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono text-neutral-300">
                      <div className="bg-[#131313] p-2 rounded-lg border border-[#20201f]">
                        <span className="text-[10px] text-neutral-500 block">Seconds</span>
                        <strong className="text-white">{Math.round(result.ahtSec)}s</strong>
                      </div>
                      <div className="bg-[#131313] p-2 rounded-lg border border-[#20201f]">
                        <span className="text-[10px] text-neutral-500 block">Minutes</span>
                        <strong className="text-[#00E5FF]">{(result.ahtSec / 60).toFixed(2)} min</strong>
                      </div>
                      <div className="bg-[#131313] p-2 rounded-lg border border-[#20201f] col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-neutral-500 block">Formatted</span>
                        <strong className="text-white">{formatTime(result.ahtSec)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-neutral-500 font-mono">
                    <div className="text-4xl font-bold tracking-widest text-neutral-700">--</div>
                    <p className="text-xs mt-2">Enter metrics on the left and click Calculate AHT</p>
                  </div>
                )}
              </div>

              {/* Formula Used Container */}
              <div className="bg-[#0e0e0e] border border-[#262626] rounded-xl p-4 font-mono text-xs text-neutral-300 space-y-2">
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                  Formula Used
                </div>
                <div className="bg-[#1c1b1b] p-3 rounded-lg border border-[#2a2a2a] text-[#00E5FF] text-[11px] leading-relaxed overflow-x-auto">
                  (Talk Time + Hold Time + Wrap-up) / Total Calls
                </div>
              </div>

              {/* Breakdown Per Call metrics */}
              {result && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    Call Handling Breakdown
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="bg-[#0e0e0e] border border-[#262626] p-3 rounded-xl text-center space-y-1">
                      <div className="text-[10px] text-neutral-400">Avg Talk</div>
                      <div className="text-sm font-bold text-white">{Math.round(result.avgTalkSec)}s</div>
                      <div className="text-[11px] text-[#00E5FF]">{(result.avgTalkSec / 60).toFixed(2)}m</div>
                      <div className="text-[10px] text-emerald-400 pt-0.5">{result.talkPercent}%</div>
                    </div>

                    <div className="bg-[#0e0e0e] border border-[#262626] p-3 rounded-xl text-center space-y-1">
                      <div className="text-[10px] text-neutral-400">Avg Hold</div>
                      <div className="text-sm font-bold text-white">{Math.round(result.avgHoldSec)}s</div>
                      <div className="text-[11px] text-[#00E5FF]">{(result.avgHoldSec / 60).toFixed(2)}m</div>
                      <div className="text-[10px] text-amber-400 pt-0.5">{result.holdPercent}%</div>
                    </div>

                    <div className="bg-[#0e0e0e] border border-[#262626] p-3 rounded-xl text-center space-y-1">
                      <div className="text-[10px] text-neutral-400">Avg ACW</div>
                      <div className="text-sm font-bold text-white">{Math.round(result.avgWrapSec)}s</div>
                      <div className="text-[11px] text-[#00E5FF]">{(result.avgWrapSec / 60).toFixed(2)}m</div>
                      <div className="text-[10px] text-cyan-400 pt-0.5">{result.wrapPercent}%</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* History List if present */}
          {savedCalculations.length > 0 && (
            <div className="bg-[#131313]/90 border border-[#262626] rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <History className="w-4 h-4 text-[#00E5FF]" />
                  Saved Calculations
                </h4>
                <span className="text-xs font-mono text-neutral-500">{savedCalculations.length} saved</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedCalculations.map((item) => (
                  <div key={item.id} className="bg-[#0e0e0e] border border-[#262626] p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-white font-bold">{Math.round(item.ahtSec)}s AHT ({item.calls} calls)</div>
                      <div className="text-[10px] text-neutral-500">
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSaved(item.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer matching reference banner */}
      <footer className="pt-8 border-t border-[#262626]/50 text-center sm:flex sm:items-center sm:justify-between text-xs font-mono text-neutral-500 space-y-3 sm:space-y-0">
        <div>
          © {new Date().getFullYear()} PAIN ASSOCIATION AND SKSS COMMUNITY. ALL RIGHTS RESERVED.
        </div>
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-neutral-300 transition-colors">Support</a>
        </div>
      </footer>

    </div>
  );
};
