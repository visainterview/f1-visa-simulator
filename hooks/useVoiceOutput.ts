'use client';

import { useState, useRef, useCallback } from 'react';

export function useVoiceOutput() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      stopSpeaking();

      if (!text || text.trim().length === 0) {
        if (onEnd) onEnd();
        return;
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onEnd) onEnd();
        return;
      }

      // Clean text of markdown/brackets if any
      const cleanText = text.replace(/[*_#`[\]()]/g, '').trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.02; // Realistic human conversational pace
      utterance.pitch = 0.95; // Slightly deeper, formal consular tone

      const voices = window.speechSynthesis.getVoices();
      
      // Select the best natural US male or female consular voice available
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang === 'en-US' &&
            (v.name.includes('Natural') ||
              v.name.includes('Google US English') ||
              v.name.includes('Guy') ||
              v.name.includes('David') ||
              v.name.includes('Aria'))
        ) || voices.find((v) => v.lang === 'en-US');

      if (preferredVoice) utterance.voice = preferredVoice;

      activeUtteranceRef.current = utterance;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking]
  );

  return { speak, stopSpeaking, isSpeaking };
}