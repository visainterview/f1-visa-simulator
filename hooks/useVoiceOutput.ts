'use client';

import { useState, useRef, useCallback } from 'react';

declare global {
  interface Window {
    puter?: any;
  }
}

export function useVoiceOutput() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    // 1. Kill Puter.js audio element if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    // 2. Kill Native browser SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      stopSpeaking();

      if (!text || text.trim().length === 0) {
        if (onEnd) onEnd();
        return;
      }

      setIsSpeaking(true);

      // Attempt 1: Free Puter.js Neural Voice (No API Key Required)
      if (typeof window !== 'undefined' && window.puter && window.puter.ai?.txt2speech) {
        try {
          const audio = await window.puter.ai.txt2speech(text, {
            language: 'en-US',
            engine: 'neural',
          });

          currentAudioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
            if (onEnd) onEnd();
          };

          audio.onerror = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
            if (onEnd) onEnd();
          };

          await audio.play();
          return;
        } catch (puterErr) {
          console.warn('Puter.js TTS issue, falling back to SpeechSynthesis:', puterErr);
        }
      }

      // Attempt 2: Native Browser SpeechSynthesis Fallback
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const usVoice =
          voices.find(
            (v) =>
              v.lang === 'en-US' &&
              (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Guy') || v.name.includes('David'))
          ) || voices.find((v) => v.lang === 'en-US');

        if (usVoice) utterance.voice = usVoice;

        utterance.onend = () => {
          setIsSpeaking(false);
          if (onEnd) onEnd();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          if (onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      }
    },
    [stopSpeaking]
  );

  return { speak, stopSpeaking, isSpeaking };
}