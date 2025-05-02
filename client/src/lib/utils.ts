import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combine tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 6) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Generate unique ID for guest files
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Local storage helpers
export const storage = {
  getRecentFiles: (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('pdfReader_recentFiles') || '[]');
    } catch (e) {
      return [];
    }
  },
  
  addRecentFile: (file: any) => {
    try {
      const files = storage.getRecentFiles();
      // Check if file already exists
      const fileIndex = files.findIndex(f => f.id === file.id);
      
      if (fileIndex !== -1) {
        // Update existing file
        files[fileIndex] = { ...files[fileIndex], ...file, lastOpenedAt: new Date() };
      } else {
        // Add new file
        files.unshift({ ...file, lastOpenedAt: new Date() });
      }
      
      // Keep only the 10 most recent files
      const updatedFiles = files.slice(0, 10);
      localStorage.setItem('pdfReader_recentFiles', JSON.stringify(updatedFiles));
      return updatedFiles;
    } catch (e) {
      return [];
    }
  },
  
  getBookmarks: (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('pdfReader_bookmarks') || '[]');
    } catch (e) {
      return [];
    }
  },
  
  addBookmark: (bookmark: any) => {
    try {
      const bookmarks = storage.getBookmarks();
      // Check if bookmark already exists
      const bookmarkExists = bookmarks.some(b => 
        b.fileId === bookmark.fileId && b.pageNumber === bookmark.pageNumber
      );
      
      if (!bookmarkExists) {
        bookmarks.push({ ...bookmark, id: generateUniqueId(), createdAt: new Date() });
        localStorage.setItem('pdfReader_bookmarks', JSON.stringify(bookmarks));
      }
      
      return bookmarks;
    } catch (e) {
      return [];
    }
  },
  
  removeBookmark: (fileId: string, pageNumber: number) => {
    try {
      const bookmarks = storage.getBookmarks();
      const updatedBookmarks = bookmarks.filter(
        b => !(b.fileId === fileId && b.pageNumber === pageNumber)
      );
      localStorage.setItem('pdfReader_bookmarks', JSON.stringify(updatedBookmarks));
      return updatedBookmarks;
    } catch (e) {
      return [];
    }
  },
  
  getSettings: (): any => {
    try {
      return JSON.parse(localStorage.getItem('pdfReader_settings') || '{}');
    } catch (e) {
      return {};
    }
  },
  
  updateSettings: (settings: any) => {
    try {
      const currentSettings = storage.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem('pdfReader_settings', JSON.stringify(updatedSettings));
      return updatedSettings;
    } catch (e) {
      return {};
    }
  },
  
  getCredits: (): number => {
    try {
      return parseInt(localStorage.getItem('pdfReader_credits') || '0');
    } catch (e) {
      return 0;
    }
  },
  
  addCredits: (credits: number): number => {
    try {
      const currentCredits = storage.getCredits();
      const newCredits = currentCredits + credits;
      localStorage.setItem('pdfReader_credits', newCredits.toString());
      return newCredits;
    } catch (e) {
      return 0;
    }
  },
  
  getTodayUsageTime: (): number => {
    try {
      const today = new Date().toLocaleDateString();
      const usageData = JSON.parse(localStorage.getItem('pdfReader_usageTime') || '{}');
      return usageData[today] || 0;
    } catch (e) {
      return 0;
    }
  },
  
  updateUsageTime: (seconds: number): number => {
    try {
      const today = new Date().toLocaleDateString();
      const usageData = JSON.parse(localStorage.getItem('pdfReader_usageTime') || '{}');
      
      // If no data for today, initialize it
      if (!usageData[today]) {
        usageData[today] = 0;
      }
      
      // Add the seconds to today's usage
      usageData[today] += seconds;
      
      localStorage.setItem('pdfReader_usageTime', JSON.stringify(usageData));
      return usageData[today];
    } catch (e) {
      return 0;
    }
  }
};

// Text-to-Speech Utilities
export const tts = {
  speak: (text: string, options: SpeechSynthesisUtteranceOptions = {}) => {
    if (!('speechSynthesis' in window)) {
      console.error('Text-to-speech not supported in this browser');
      return null;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    if (options.voice) utterance.voice = options.voice;
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    
    // Speak the text
    speechSynthesis.speak(utterance);
    
    return utterance;
  },
  
  stop: () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  },
  
  pause: () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.pause();
    }
  },
  
  resume: () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.resume();
    }
  },
  
  getVoices: (): SpeechSynthesisVoice[] => {
    if (!('speechSynthesis' in window)) {
      return [];
    }
    return speechSynthesis.getVoices();
  }
};

interface SpeechSynthesisUtteranceOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Speech recognition utilities
export const speechRecognition = {
  start: (onResult: (text: string) => void, onEnd?: () => void) => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return null;
    }
    
    // @ts-ignore
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    
    if (onEnd) {
      recognition.onend = onEnd;
    }
    
    recognition.start();
    return recognition;
  }
};
