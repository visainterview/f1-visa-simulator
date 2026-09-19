'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceOutput() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load natural voices properly on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

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

      const cleanText = text.replace(/[*_#`[\]()]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();

      // Priority ranking: Find natural human voice first (Google US English or Natural)
      const humanVoice =
        currentVoices.find(
          (v) => v.lang === 'en-US' && v.name.includes('Google US English')
        ) ||
        currentVoices.find(
          (v) => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Online'))
        ) ||
        currentVoices.find(
          (v) => v.lang === 'en-US' && (v.name.includes('Guy') || v.name.includes('David') || v.name.includes('Aria'))
        ) ||
        currentVoices.find((v) => v.lang.startsWith('en'));

      if (humanVoice) {
        utterance.voice = humanVoice;
      }

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
    [voices, stopSpeaking]
  );

  return { speak, stopSpeaking, isSpeaking };
}