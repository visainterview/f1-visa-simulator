'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile, ChatMessage } from '@/lib/types';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { Mic, MicOff, Volume2, Send, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';

export default function InterviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { speak, stopSpeaking, isSpeaking } = useVoiceOutput();
  const { isListening, isProcessing, transcript, startListening, stopListening, networkError } = useVoiceInput();

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (transcript) setTextInput(transcript);
  }, [transcript]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSpeaking, isProcessing]);

  useEffect(() => {
    const raw = localStorage.getItem('f1_applicant_profile');
    if (!raw) {
      router.push('/');
      return;
    }
    const data: StudentProfile = JSON.parse(raw);
    setProfile(data);

    const firstGreeting = `Good morning. Pass me your passport and I-20. Why did you choose ${data.targetUniversity} to study ${data.major}?`;

    const initMsg: ChatMessage = {
      id: '1',
      sender: 'vo',
      text: firstGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initMsg]);

    setTimeout(() => {
      speak(firstGreeting);
    }, 600);

    return () => {
      stopSpeaking();
    };
  }, [router, speak, stopSpeaking]);

  const handleSendMessage = async () => {
    if (!textInput.trim() || isLoading) return;

    stopListening();
    stopSpeaking();

    const studentMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      text: textInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, studentMsg];
    setMessages(newHistory);
    setTextInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          conversationHistory: newHistory,
          latestStudentAnswer: studentMsg.text,
        }),
      });

      const data = await res.json();
      const voReply = data.reply || 'State clearly your economic ties to Nepal.';

      const voMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'vo',
        text: voReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [...newHistory, voMsg];
      setMessages(updatedHistory);
      speak(voReply);

      // Auto-Conclude Interview if the VO issued a verdict
      if (data.isConcluded) {
        localStorage.setItem('f1_interview_history', JSON.stringify(updatedHistory));
        setTimeout(() => {
          stopSpeaking();
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          router.push('/result');
        }, 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishInterview = () => {
    stopSpeaking();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    localStorage.setItem('f1_interview_history', JSON.stringify(messages));
    router.push('/result');
  };

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
      {/* Top Bar with Live Timer */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-slate-100">Kathmandu Embassy • Window Counter #03</h2>
          <p className="text-xs text-slate-400">Applicant: {profile.fullName} | {profile.targetUniversity}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Time: {formatTime(elapsedSeconds)}</span>
          </div>
          <button
            onClick={handleFinishInterview}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Conclude Interview
          </button>
        </div>
      </div>

      {/* Main Visa Window */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col my-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* Consular Visualizer */}
        <div className="bg-slate-950/80 p-6 flex flex-col items-center justify-center border-b border-slate-800/80 relative">
          <div className="relative">
            <div
              className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                isSpeaking
                  ? 'border-blue-500 scale-105 shadow-[0_0_35px_rgba(59,130,246,0.6)]'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="text-center">
                <span className="text-3xl">👮‍♂️</span>
                <div className="text-[10px] uppercase tracking-wider text-slate-300 mt-1 font-semibold">
                  Consular Officer
                </div>
              </div>
            </div>
            {isSpeaking && (
              <span className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full animate-bounce">
                <Volume2 className="w-4 h-4 text-white" />
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {isSpeaking
              ? 'Visa Officer is speaking...'
              : isProcessing
              ? 'Transcribing your audio with Whisper...'
              : isLoading
              ? 'Adjudicating your response...'
              : isListening
              ? 'Recording microphone... (Click mic to send)'
              : 'Listening at the window...'}
          </p>
        </div>

        {/* Live Conversation Transcript */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[360px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'student' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">
                {m.sender === 'student' ? 'You (Applicant)' : 'Visa Officer'} • {m.timestamp}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.sender === 'student'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {networkError && (
          <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-900/50 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{networkError}</span>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`p-3.5 rounded-full flex items-center justify-center transition cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isListening ? 'Stop and transcribe' : 'Record voice with Groq Whisper'}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : isListening ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            placeholder={
              isListening
                ? 'Recording... speak now, then click mic to send.'
                : isProcessing
                ? 'Transcribing audio...'
                : 'Type your answer or speak using the mic...'
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!textInput.trim() || isLoading || isProcessing}
            className="p-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </main>
  );
}