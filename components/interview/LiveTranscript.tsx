'use client';

import { ChatMessage } from '@/lib/types';

export default function LiveTranscript({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[350px]">
      {messages.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.sender === 'student' ? 'items-end' : 'items-start'}`}>
          <div className="text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider">
            {m.sender === 'student' ? 'You (Applicant)' : 'Visa Officer'} • {m.timestamp}
          </div>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.sender === 'student'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}