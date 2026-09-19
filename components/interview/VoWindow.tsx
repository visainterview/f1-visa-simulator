'use client';

import { Volume2 } from 'lucide-react';

export default function VoWindow({ isSpeaking, isLoading }: { isSpeaking: boolean; isLoading: boolean }) {
  return (
    <div className="bg-slate-950 p-6 flex flex-col items-center justify-center border-b border-slate-800 relative select-none">
      <div className="relative">
        <div
          className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
            isSpeaking
              ? 'border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.6)]'
              : 'border-slate-700 bg-slate-900'
          }`}
        >
          <div className="text-center">
            <span className="text-3xl">🇺🇸</span>
            <div className="text-[10px] uppercase font-bold text-slate-300 mt-1 font-mono tracking-wider">
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
      <p className="text-xs text-slate-400 mt-3 font-mono">
        {isSpeaking
          ? 'Visa Officer is speaking...'
          : isLoading
          ? 'Reviewing your case notes...'
          : 'Officer is listening at the counter...'}
      </p>
    </div>
  );
}