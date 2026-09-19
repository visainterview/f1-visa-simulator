'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile, ChatMessage } from '@/lib/types';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Radio,
  Building2,
  GraduationCap
} from 'lucide-react';

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

      if (data.isConcluded) {
        localStorage.setItem('f1_interview_history', JSON.stringify(updatedHistory));
        setTimeout(() => {
          stopSpeaking();
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          router.push('/result');
        }, 4000);
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
    <main className="min-h-screen bg-[#050811] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#050811] to-black text-slate-100 flex flex-col p-3 md:p-6">
      
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-sm">
            US
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Kathmandu Consular Post • Window #03</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Terminal
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Applicant: <strong className="text-slate-200">{profile.fullName}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3 text-blue-400" /> {profile.targetUniversity}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          <button
            onClick={handleFinishInterview}
            className="px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer border border-rose-500/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Conclude
          </button>
        </div>
      </div>

      {/* Main Consular Window Console */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col my-3 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl">
        
        {/* Officer Glass Booth Visualizer */}
        <div className="bg-gradient-to-b from-[#0a0f1d] to-[#080c16] p-6 flex flex-col items-center justify-center border-b border-white/10 relative">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-blue-500/5 blur-3xl pointer-events-none"></div>

          <div className="relative">
            {/* Animated Pulse Ring */}
            <div
              className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative ${
                isSpeaking
                  ? 'border-blue-400 scale-105 shadow-[0_0_40px_rgba(59,130,246,0.45)] bg-slate-900'
                  : 'border-white/10 bg-slate-900/80 shadow-inner'
              }`}
            >
              {/* Outer Pulse effect */}
              {isSpeaking && (
                <div className="absolute inset-0 rounded-full border border-blue-400/50 animate-ping"></div>
              )}
              
              <div className="text-center select-none">
                <span className="text-3xl filter drop-shadow">👮‍♂️</span>
                <div className="text-[10px] uppercase tracking-wider text-blue-300 font-bold mt-1">
                  Adjudicator
                </div>
              </div>
            </div>

            {isSpeaking && (
              <span className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50 animate-bounce">
                <Volume2 className="w-3.5 h-3.5 text-white" />
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-blue-400 animate-pulse'
                  : isLoading
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400'
              }`}
            ></span>
            <span className="text-xs text-slate-300 font-medium tracking-wide">
              {isSpeaking
                ? 'Officer is cross-examining...'
                : isProcessing
                ? 'Transcribing speech with Whisper...'
                : isLoading
                ? 'Analyzing response against INA 214(b)...'
                : isListening
                ? 'Listening to applicant...'
                : 'Officer is listening at the counter.'}
            </span>
          </div>
        </div>

        {/* Conversation Transcript Stream */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 max-h-[380px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'student' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-slate-400 mb-1 tracking-wider uppercase font-semibold flex items-center gap-1.5">
                {m.sender === 'student' ? (
                  <span>Applicant • {m.timestamp}</span>
                ) : (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5" /> Consular Officer • {m.timestamp}
                  </span>
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  m.sender === 'student'
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-none border border-blue-400/20'
                    : 'bg-[#0e1424] text-slate-100 border border-white/10 rounded-bl-none'
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

        {/* Input Bar */}
        <div className="p-3 md:p-4 bg-[#080c16] border-t border-white/10 flex items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`p-3 rounded-xl flex items-center justify-center transition cursor-pointer border ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-white/10'
            }`}
            title={isListening ? 'Stop recording' : 'Speak with microphone'}
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
                : 'Type your answer or speak clearly...'
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!textInput.trim() || isLoading || isProcessing}
            className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/25 border border-blue-400/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </main>
  );
}