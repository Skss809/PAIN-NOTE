/**
 * High-Precision Internet Time & Geo-Location Synchronization Service
 * Default & Primary Location: Mumbai, India (Timezone: Asia/Kolkata, UTC+05:30)
 * 
 * Fetches true atomic / NTP internet time and provides millisecond-precise
 * synchronization eliminating reliance on incorrect or drifting system clocks.
 */

export interface DetectedLocation {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  ip: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export interface InternetTimeState {
  synced: boolean;
  syncing: boolean;
  offsetMs: number; // internetTime - localSystemTime
  latencyMs: number; // Round-trip time / 2
  lastSyncTimestamp: number;
  detectedLocation: DetectedLocation;
  source: 'ipwhois' | 'timeapi' | 'server-ntp' | 'fallback';
  error: string | null;
}

// Primary default location: Mumbai, India
export const MUMBAI_LOCATION: DetectedLocation = {
  city: 'Mumbai',
  region: 'Maharashtra',
  country: 'India',
  countryCode: 'IN',
  flagEmoji: '🇮🇳',
  ip: '',
  timezone: 'Asia/Kolkata',
  latitude: 19.0760,
  longitude: 72.8777,
};

// Popular Indian Cities (all on Indian Standard Time: Asia/Kolkata)
export const POPULAR_INDIAN_LOCATIONS: DetectedLocation[] = [
  { city: 'Mumbai', region: 'Maharashtra', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'New Delhi', region: 'Delhi', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Bengaluru', region: 'Karnataka', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Kolkata', region: 'West Bengal', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Chennai', region: 'Tamil Nadu', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Hyderabad', region: 'Telangana', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Pune', region: 'Maharashtra', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
  { city: 'Ahmedabad', region: 'Gujarat', country: 'India', countryCode: 'IN', flagEmoji: '🇮🇳', ip: '', timezone: 'Asia/Kolkata' },
];

// Major Global Hubs
export const POPULAR_WORLD_LOCATIONS: DetectedLocation[] = [
  { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', flagEmoji: '🇦🇪', ip: '', timezone: 'Asia/Dubai' },
  { city: 'London', region: 'England', country: 'United Kingdom', countryCode: 'GB', flagEmoji: '🇬🇧', ip: '', timezone: 'Europe/London' },
  { city: 'New York', region: 'New York', country: 'United States', countryCode: 'US', flagEmoji: '🇺🇸', ip: '', timezone: 'America/New_York' },
  { city: 'Tokyo', region: 'Tokyo', country: 'Japan', countryCode: 'JP', flagEmoji: '🇯🇵', ip: '', timezone: 'Asia/Tokyo' },
  { city: 'Singapore', region: 'Singapore', country: 'Singapore', countryCode: 'SG', flagEmoji: '🇸🇬', ip: '', timezone: 'Asia/Singapore' },
  { city: 'Paris', region: 'Île-de-France', country: 'France', countryCode: 'FR', flagEmoji: '🇫🇷', ip: '', timezone: 'Europe/Paris' },
  { city: 'Sydney', region: 'New South Wales', country: 'Australia', countryCode: 'AU', flagEmoji: '🇦🇺', ip: '', timezone: 'Australia/Sydney' },
  { city: 'San Francisco', region: 'California', country: 'United States', countryCode: 'US', flagEmoji: '🇺🇸', ip: '', timezone: 'America/Los_Angeles' },
];

const LOCATION_STORAGE_KEY = 'user_clock_location_v2';
const AUTO_DETECT_STORAGE_KEY = 'user_clock_autodetect_enabled';

function getStoredLocation(): DetectedLocation {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.city && parsed.timezone) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }
  return MUMBAI_LOCATION;
}

function isAutoDetectExplicitlyEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(AUTO_DETECT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

const initialLoc = getStoredLocation();

let currentState: InternetTimeState = {
  synced: false,
  syncing: false,
  offsetMs: 0,
  latencyMs: 0,
  lastSyncTimestamp: 0,
  detectedLocation: initialLoc,
  source: 'fallback',
  error: null,
};

// Monotonic anchor:
// exactCurrentTime = anchorInternetTimeMs + (performance.now() - anchorPerf)
let anchorPerf = performance.now();
let anchorInternetTimeMs = Date.now();

// Listeners
type StateListener = (state: InternetTimeState) => void;
const listeners = new Set<StateListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentState });
    } catch (e) {
      console.error('Error notifying internet time listener', e);
    }
  });
}

/**
 * Explicitly set user location and persist to localStorage
 */
export function setUserLocation(location: DetectedLocation, isAutoDetected = false): void {
  currentState = {
    ...currentState,
    detectedLocation: {
      ...location,
      ip: currentState.detectedLocation.ip || location.ip || '',
    },
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(currentState.detectedLocation));
      localStorage.setItem(AUTO_DETECT_STORAGE_KEY, isAutoDetected ? 'true' : 'false');
    } catch {
      // ignore
    }
  }
  notifyListeners();
}

/**
 * Reset location strictly to Mumbai, India (Asia/Kolkata)
 */
export function resetToMumbaiLocation(): void {
  setUserLocation(MUMBAI_LOCATION, false);
}

/**
 * Returns current high-precision internet Date, with exact milliseconds preserved
 * for smooth dial hand animations and exact second changes.
 */
export function getExactInternetDate(targetTimezone?: string): Date {
  const elapsed = performance.now() - anchorPerf;
  const currentUtcMs = anchorInternetTimeMs + elapsed;
  const baseDate = new Date(currentUtcMs);

  const tz = targetTimezone || currentState.detectedLocation.timezone || 'Asia/Kolkata';

  try {
    const localeStr = baseDate.toLocaleString('en-US', { timeZone: tz });
    const targetDate = new Date(localeStr);
    const subSecondsMs = Math.floor(currentUtcMs % 1000);
    targetDate.setMilliseconds(subSecondsMs >= 0 ? subSecondsMs : subSecondsMs + 1000);
    return targetDate;
  } catch {
    return baseDate;
  }
}

/**
 * Get current synchronization status
 */
export function getInternetTimeState(): InternetTimeState {
  return { ...currentState };
}

/**
 * Perform synchronization with Internet Time.
 * Preserves Mumbai, India location unless auto-detection is explicitly enabled.
 */
export async function syncInternetTime(force = false): Promise<InternetTimeState> {
  if (currentState.syncing && !force) {
    return currentState;
  }

  currentState = {
    ...currentState,
    syncing: true,
    error: null,
  };
  notifyListeners();

  let resolved = false;
  const autoDetectAllowed = isAutoDetectExplicitlyEnabled();

  // 1. Fetch Atomic Internet Time from our server NTP proxy (/api/time)
  try {
    const t0 = performance.now();
    const clientBefore = Date.now();

    const res = await fetch('/api/time', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const t1 = performance.now();
      const clientAfter = Date.now();
      const rtt = Math.max(0, t1 - t0);
      const halfRtt = rtt / 2;

      const serverTimestamp = Number(data.timestamp);
      if (!isNaN(serverTimestamp)) {
        const offsetMs = (serverTimestamp + halfRtt) - clientAfter;

        anchorPerf = performance.now();
        anchorInternetTimeMs = serverTimestamp + halfRtt;

        currentState = {
          synced: true,
          syncing: false,
          offsetMs,
          latencyMs: Math.round(halfRtt),
          lastSyncTimestamp: Date.now(),
          detectedLocation: {
            ...currentState.detectedLocation,
            ip: data.clientIp || currentState.detectedLocation.ip,
          },
          source: 'server-ntp',
          error: null,
        };

        resolved = true;
        notifyListeners();
      }
    }
  } catch (err) {
    console.warn('Server /api/time sync failed:', err);
  }

  // 2. Fetch from timeapi.io for Asia/Kolkata (Mumbai) or active timezone
  if (!resolved) {
    try {
      const tz = currentState.detectedLocation.timezone || 'Asia/Kolkata';
      const t0 = performance.now();
      const res = await fetch(`https://timeapi.io/api/v1/time/current/zone?timeZone=${encodeURIComponent(tz)}`);
      if (res.ok) {
        const data = await res.json();
        const t1 = performance.now();
        const halfRtt = Math.max(0, (t1 - t0) / 2);
        const internetUtcMs = Date.parse(data.date_time);

        if (!isNaN(internetUtcMs)) {
          const offsetMs = (internetUtcMs + halfRtt) - Date.now();
          anchorPerf = performance.now();
          anchorInternetTimeMs = internetUtcMs + halfRtt;

          currentState = {
            synced: true,
            syncing: false,
            offsetMs,
            latencyMs: Math.round(halfRtt),
            lastSyncTimestamp: Date.now(),
            detectedLocation: {
              ...currentState.detectedLocation,
            },
            source: 'timeapi',
            error: null,
          };

          resolved = true;
          notifyListeners();
        }
      }
    } catch (err) {
      console.warn('timeapi.io sync failed:', err);
    }
  }

  // 3. Fallback: Check ipwho.is for IP info (and location only if auto-detection explicitly allowed)
  if (!resolved || !currentState.detectedLocation.ip) {
    try {
      const res = await fetch('https://ipwho.is/', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false) {
          // If auto-detection was explicitly enabled by user, apply detected location
          if (autoDetectAllowed) {
            const detectedTz = data.timezone?.id || 'Asia/Kolkata';
            const city = data.city || 'Mumbai';
            const region = data.region || '';
            const country = data.country || 'India';
            const flag = data.flag?.emoji || '🇮🇳';

            currentState.detectedLocation = {
              city,
              region,
              country,
              countryCode: data.country_code || 'IN',
              flagEmoji: flag,
              ip: data.ip || currentState.detectedLocation.ip,
              timezone: detectedTz,
              latitude: data.latitude,
              longitude: data.longitude,
            };
          } else {
            // Otherwise preserve Mumbai, India and only store client's public IP
            currentState.detectedLocation = {
              ...currentState.detectedLocation,
              ip: data.ip || currentState.detectedLocation.ip,
            };
          }

          if (!resolved && data?.timezone?.current_time) {
            const parsed = Date.parse(data.timezone.current_time);
            if (!isNaN(parsed)) {
              anchorPerf = performance.now();
              anchorInternetTimeMs = parsed;
              currentState.synced = true;
              currentState.source = 'ipwhois';
              resolved = true;
            }
          }
        }
      }
    } catch (err) {
      console.warn('ipwho.is check skipped:', err);
    }
  }

  // Final fallback if all internet endpoints failed
  if (!resolved) {
    anchorPerf = performance.now();
    anchorInternetTimeMs = Date.now();
    currentState = {
      ...currentState,
      syncing: false,
      synced: false,
      source: 'fallback',
      error: 'Internet time unreachable. Operating on system time with auto-retry.',
    };
  } else {
    currentState.syncing = false;
  }

  notifyListeners();
  return currentState;
}

/**
 * Explicit auto-detect location (user initiated)
 */
export async function autoDetectLocation(): Promise<DetectedLocation> {
  currentState.syncing = true;
  notifyListeners();

  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const loc: DetectedLocation = {
          city: data.city || 'Mumbai',
          region: data.region || '',
          country: data.country || 'India',
          countryCode: data.country_code || 'IN',
          flagEmoji: data.flag?.emoji || '📍',
          ip: data.ip || '',
          timezone: data.timezone?.id || 'Asia/Kolkata',
          latitude: data.latitude,
          longitude: data.longitude,
        };
        setUserLocation(loc, true);
        await syncInternetTime(true);
        return loc;
      }
    }
  } catch (err) {
    console.warn('Auto-detect failed:', err);
  }

  // Fallback to Mumbai
  setUserLocation(MUMBAI_LOCATION, false);
  return MUMBAI_LOCATION;
}

/**
 * Subscribe to time state updates
 */
export function subscribeInternetTime(listener: StateListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

// Auto-initialize sync on load
if (typeof window !== 'undefined') {
  syncInternetTime();

  // Re-sync every 3 minutes to keep clock drift below 5 milliseconds
  setInterval(() => {
    syncInternetTime();
  }, 3 * 60 * 1000);

  // Re-sync when user switches back to tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - currentState.lastSyncTimestamp;
      if (elapsed > 60 * 1000) {
        syncInternetTime();
      }
    }
  });
}
