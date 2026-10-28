import { useState, useEffect, useCallback } from 'react';
import { 
  InternetTimeState, 
  DetectedLocation,
  getInternetTimeState, 
  subscribeInternetTime, 
  syncInternetTime, 
  getExactInternetDate,
  setUserLocation,
  resetToMumbaiLocation,
  autoDetectLocation,
  MUMBAI_LOCATION,
  POPULAR_INDIAN_LOCATIONS,
  POPULAR_WORLD_LOCATIONS
} from '../lib/internetTime';

export function useInternetTime() {
  const [state, setState] = useState<InternetTimeState>(getInternetTimeState);

  useEffect(() => {
    const unsubscribe = subscribeInternetTime((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const syncNow = useCallback(() => {
    return syncInternetTime(true);
  }, []);

  const setLocation = useCallback((loc: DetectedLocation) => {
    setUserLocation(loc, false);
  }, []);

  const resetToMumbai = useCallback(() => {
    resetToMumbaiLocation();
  }, []);

  const autoDetect = useCallback(() => {
    return autoDetectLocation();
  }, []);

  return {
    ...state,
    syncNow,
    setLocation,
    resetToMumbai,
    autoDetect,
    getExactDate: getExactInternetDate,
    mumbaiLocation: MUMBAI_LOCATION,
    indianLocations: POPULAR_INDIAN_LOCATIONS,
    worldLocations: POPULAR_WORLD_LOCATIONS,
  };
}
