'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile, ChatMessage } from '@/lib/types';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import {
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Clock,
  Radio,
  Shield,
  GraduationCap,
  Sparkles,
  Headphones
} from 'lucide-react';

export default function InterviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Continuous Voice-to-Voice Mode Toggle (Enabled by Default like ChatGPT Voice)
  const [voiceModeActive, setVoiceModeActive] = useState(true);

  const { speak, stopSpeaking, isSpeaking } = useVoiceOutput();
  const { isListening, transcript, startListening, stopListening } = useVoiceInput();

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
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
    if (transcript) {
      setTextInput(transcript);

      // Auto-send when user finishes speaking in Voice Mode (1.6s of silence)
      if (voiceModeActive) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (transcript.trim().length > 1) {
            handleSendMessage(transcript.trim());
          }
        }, 1600);
      }
    }
  }, [transcript, voiceModeActive]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSpeaking]);

  // Handle VO Speech Completion -> Automatically triggers Student's Mic in Voice Mode
  const handleVoFinishedSpeaking = useCallback(() => {
    if (voiceModeActive && !isLoading) {
      setTimeout(() => {
        startListening();
      }, 400);
    }
  }, [voiceModeActive, isLoading, startListening]);

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
      speak(firstGreeting, handleVoFinishedSpeaking);
    }, 600);

    return () => {
      stopSpeaking();
    };
  }, [router, speak, stopSpeaking, handleVoFinishedSpeaking]);

  const handleSendMessage = async (textToSendOverride?: string) => {
    const textToSend = textToSendOverride || textInput;
    if (!textToSend.trim() || isLoading) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopListening();
    stopSpeaking();

    const studentMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      text: textToSend.trim(),
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

      // Speak response out loud, then auto-turn on student's mic when done
      speak(voReply, handleVoFinishedSpeaking);

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
    } catch (_) {
      // Failover
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishInterview = () => {
    stopSpeaking();
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    localStorage.setItem('f1_interview_history', JSON.stringify(messages));
    router.push('/result');
  };

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-[#03050C] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/25 via-[#03050C] to-black text-slate-100 flex flex-col p-3 md:p-6 font-sans">
      
      {/* Top Header Bar */}
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-blue-600/20 to-indigo-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">U.S. Embassy Kathmandu • Consular Booth #03</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Terminal
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Candidate: <strong className="text-slate-200">{profile.fullName}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-blue-400" /> {profile.targetUniversity}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Voice to Voice Mode Toggle */}
          <button
            onClick={() => setVoiceModeActive(!voiceModeActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              voiceModeActive
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.03] border-white/10 text-slate-400'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{voiceModeActive ? 'Voice-to-Voice ON' : 'Manual Mode'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <button
            onClick={handleFinishInterview}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/25 transition cursor-pointer border border-rose-500/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Conclude
          </button>
        </div>
      </div>

      {/* Main Console Box */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col my-3 bg-[#080C16]/80 border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        
        {/* Consular Visualizer Booth */}
        <div className="bg-gradient-to-b from-[#0A0F1D] to-[#080C16] p-6 flex flex-col items-center justify-center border-b border-white/[0.08] relative">
          
          <div className="relative flex flex-col items-center">
            
            {/* Visualizer Ring */}
            <div
              className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative ${
                isSpeaking
                  ? 'border-blue-400 scale-105 shadow-[0_0_35px_rgba(59,130,246,0.4)] bg-blue-950/20'
                  : isListening
                  ? 'border-emerald-400 scale-105 shadow-[0_0_35px_rgba(16,185,129,0.4)] bg-emerald-950/20'
                  : 'border-white/10 bg-[#0A0F1D]'
              }`}
            >
              <div className="text-center select-none">
                <span className="text-3xl filter drop-shadow">🏛️</span>
              </div>
            </div>

            {/* Audio Waveform Bars */}
            <div className="flex items-center gap-1 mt-3 h-5">
              {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.8, 0.3].map((height, i) => (
                <div
                  key={i}
                  style={{
                    height: isSpeaking ? `${height * 18}px` : isListening ? `${height * 12}px` : '4px',
                    transition: 'height 0.15s ease',
                  }}
                  className={`w-1 rounded-full ${
                    isSpeaking ? 'bg-blue-400 animate-pulse' : isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="text-[11px] font-semibold text-slate-300 tracking-wide mt-2">
              OFFICER J. MILLER • CONSULAR ADJUDICATOR
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-blue-400 animate-pulse'
                  : isListening
                  ? 'bg-emerald-400 animate-pulse'
                  : isLoading
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            ></span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
              {isSpeaking
                ? 'Officer is speaking...'
                : isListening
                ? '🎤 Listening to your voice... (speak now)'
                : isLoading
                ? 'Officer is evaluating...'
                : 'Awaiting response.'}
            </span>
          </div>
        </div>

        {/* Conversation Stream */}
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
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> Consular Officer • {m.timestamp}
                  </span>
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  m.sender === 'student'
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-none border border-blue-400/20'
                    : 'bg-[#0E1528] text-slate-100 border border-white/[0.08] rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar (Works with voice or typing) */}
        <div className="p-3 md:p-4 bg-[#050811] border-t border-white/[0.08] flex items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition cursor-pointer border ${
              isListening
                ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse shadow-lg shadow-emerald-600/40'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10'
            }`}
            title={isListening ? 'Stop listening' : 'Start speaking with microphone'}
          >
            {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5" />}
          </button>

          <input
            type="text"
            placeholder={
              isListening
                ? 'Listening to your voice... (auto-sends when you pause)'
                : 'Speak with your mic or type here...'
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:bg-white/[0.04] transition"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!textInput.trim() || isLoading}
            className="p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-2xl transition cursor-pointer shadow-lg shadow-blue-500/25 border border-blue-400/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </main>
  );
}