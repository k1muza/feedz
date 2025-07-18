
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const useNotificationSound = (soundUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload the audio when the hook is first used
  const preload = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(soundUrl);
      audioRef.current.load();
    }
  }, [soundUrl]);

  const playNotificationSound = useCallback(() => {
    // Don't play if the tab is already active
    if (typeof document !== 'undefined' && document.hasFocus()) {
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.error("Error playing notification sound:", error);
      });
    }
  }, []);

  return { playNotificationSound, preload };
};

export default useNotificationSound;
