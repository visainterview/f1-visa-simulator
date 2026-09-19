'use client';

import { AlertOctagon, HelpCircle } from 'lucide-react';

interface Props {
  flags: string[];
  suggestedQuestions: string[];
}

export default function RiskRadar({ flags, suggestedQuestions }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
      {/* Red Flags Column */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2 mb-3">
          <AlertOctagon className="w-4 h-4" /> Detected Risk Indicators (214b)
        </div>
        {flags.length === 0 ? (
          <p className="text-xs text-emerald-400">No immediate inconsistencies identified.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((flag, i) => (
              <div
                key={i}
                className="text-xs p-2.5 bg-rose-950/30 border border-rose-900/40 text-rose-300 rounded-lg"
              >
                ⚠️ {flag}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Questions Column */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4" /> Recommended Grilling Angles
        </div>
        <div className="space-y-2">
          {suggestedQuestions.map((q, i) => (
            <div key={i} className="text-xs p-2.5 bg-blue-950/20 border border-blue-900/40 text-blue-200 rounded-lg">
              👉 &ldquo;{q}&rdquo;
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}