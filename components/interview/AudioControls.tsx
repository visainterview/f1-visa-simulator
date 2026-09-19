'use client';

import { Mic, MicOff, Send } from 'lucide-react';

interface Props {
  textInput: string;
  setTextInput: (text: string) => void;
  isListening: boolean;
  onToggleMic: () => void;
  onSend: () => void;
  isLoading: boolean;
}

export default function AudioControls({
  textInput,
  setTextInput,
  isListening,
  onToggleMic,
  onSend,
  isLoading,
}: Props) {
  return (
    <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
      <button
        onClick={onToggleMic}
        type="button"
        className={`p-3 rounded-full flex items-center justify-center transition cursor-pointer ${
          isListening
            ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
        }`}
        title={isListening ? 'Stop listening' : 'Start speaking with mic'}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <input
        type="text"
        placeholder={isListening ? 'Speak clearly into your microphone...' : 'Type or speak your answer...'}
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
      />

      <button
        onClick={onSend}
        disabled={!textInput.trim() || isLoading}
        className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}