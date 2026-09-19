'use client';

import { useState, useRef, useCallback } from 'react';

export function useVoiceInput(onResultCallback?: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    setNetworkError(null);
    setTranscript('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          setIsListening(false);
          return;
        }

        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append('file', audioBlob);

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const text = (data.text || '').trim();
            if (text) {
              setTranscript(text);
              if (onResultCallback) onResultCallback(text);
            }
          } else {
            // Fallback error
            setNetworkError('Voice transcribed offline. You can also type directly.');
          }
        } catch (e) {
          console.error(e);
          setNetworkError('Could not process microphone audio.');
        } finally {
          setIsProcessing(false);
          setIsListening(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (err: any) {
      console.warn('Microphone permission or hardware issue:', err);
      setNetworkError('Microphone permission denied. Please allow microphone access.');
      setIsListening(false);
    }
  }, [onResultCallback]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    isSupported: true,
    setTranscript,
    networkError,
  };
}