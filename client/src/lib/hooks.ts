import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '@/components/auth-provider';
import { CreditsContext } from '@/components/credits-provider';
import { auth, onAuthStateChanged, handleRedirectResult, loginWithGoogle, logout } from './firebase';
import { storage, tts, speechRecognition } from './utils';
import { User } from './types';

// Auth hooks
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

// Credits hooks
export const useCredits = () => {
  const context = useContext(CreditsContext);
  return context;
};

// Usage tracking hooks
export const useUsageTracking = () => {
  const { isAuthenticated, user } = useAuth();
  const { addCredits } = useCredits();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  // Start tracking usage time
  const startTracking = useCallback(() => {
    setStartTime(Date.now());
    setIsTracking(true);
  }, []);

  // Stop tracking and calculate credits
  const stopTracking = useCallback(() => {
    if (startTime === null) return;
    
    const currentTime = Date.now();
    const timeSpentSeconds = Math.floor((currentTime - startTime) / 1000);
    setElapsedTime(prev => prev + timeSpentSeconds);
    
    // Reset start time
    setStartTime(null);
    setIsTracking(false);
    
    // Update usage time
    const updatedSeconds = storage.updateUsageTime(timeSpentSeconds);
    
    // Check if an hour has passed since last credit award
    const hoursSpent = Math.floor(updatedSeconds / 3600);
    const prevHoursSpent = Math.floor((updatedSeconds - timeSpentSeconds) / 3600);
    
    if (hoursSpent > prevHoursSpent) {
      // Add 1 credit per hour, max 8 per day
      const todayCredits = Math.min(hoursSpent, 8) - prevHoursSpent;
      if (todayCredits > 0) {
        addCredits(todayCredits);
      }
    }
  }, [startTime, addCredits]);

  // Auto-stop tracking when component unmounts
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  return {
    isTracking,
    startTracking,
    stopTracking,
    elapsedTime
  };
};

// Text to Speech hooks
export const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    // Get available voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        setVoices(tts.getVoices());
      };
      
      // Chrome loads voices asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      loadVoices();
    }
  }, []);
  
  const speak = useCallback((text: string, options = {}) => {
    const utterance = tts.speak(text, options);
    
    if (utterance) {
      setIsPlaying(true);
      setCurrentUtterance(utterance);
      
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentUtterance(null);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
        setCurrentUtterance(null);
      };
    }
  }, []);
  
  const stop = useCallback(() => {
    tts.stop();
    setIsPlaying(false);
    setCurrentUtterance(null);
  }, []);
  
  const pause = useCallback(() => {
    if (isPlaying) {
      tts.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);
  
  const resume = useCallback(() => {
    if (currentUtterance && !isPlaying) {
      tts.resume();
      setIsPlaying(true);
    }
  }, [currentUtterance, isPlaying]);
  
  return {
    isPlaying,
    speak,
    stop,
    pause,
    resume,
    voices
  };
};

// Speech recognition hooks
export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  const startListening = useCallback((onResult: (text: string) => void) => {
    const newRecognition = speechRecognition.start(
      (text) => {
        setIsListening(false);
        onResult(text);
      },
      () => {
        setIsListening(false);
      }
    );
    
    if (newRecognition) {
      setRecognition(newRecognition);
      setIsListening(true);
    }
  }, []);
  
  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);
  
  return {
    isListening,
    startListening,
    stopListening
  };
};

// Media query hooks
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
};
