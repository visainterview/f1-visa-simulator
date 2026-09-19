'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile, ChatMessage, EvaluationResult } from '@/lib/types';
import { CheckCircle, XCircle, RotateCcw, FileText, ArrowLeft } from 'lucide-react';

export default function ResultPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const rawProfile = localStorage.getItem('f1_applicant_profile');
    const rawHistory = localStorage.getItem('f1_interview_history');

    if (!rawProfile) {
      router.push('/');
      return;
    }

    const data: StudentProfile = JSON.parse(rawProfile);
    const history: ChatMessage[] = rawHistory ? JSON.parse(rawHistory) : [];
    setProfile(data);

    // Look at last VO message to see if approved or refused
    const voMessages = history.filter((m) => m.sender === 'vo').map((m) => m.text.toLowerCase());
    const lastVoMessage = voMessages[voMessages.length - 1] || '';
    const isApproved = lastVoMessage.includes('approved') && !lastVoMessage.includes('not approved');

    let finScore = isApproved ? 85 : 35;
    let academicScore = isApproved ? 85 : 40;
    let tiesScore = isApproved ? 80 : 25;
    let confidenceScore = isApproved ? 90 : 30;

    const feedback: string[] = [];

    if (!isApproved) {
      feedback.push('Failed to overcome the presumption of immigrant intent under Section 214(b).');
      if (data.hasSiblingInUS) {
        tiesScore = Math.min(tiesScore, 20);
        feedback.push(`Sibling in the U.S. (${data.siblingUSStatus || 'Resident'}) elevated suspicion of chain migration.`);
      }
      if (Number(data.annualFamilyIncomeNPR || 0) / 135 < Number(data.netI20PayableUSD || 0)) {
        finScore = Math.min(finScore, 25);
        feedback.push('Declared family income does not provide a realistic financial buffer for multi-year tuition.');
      }
      feedback.push('Responses did not convey genuine, well-articulated academic and career purpose.');
    } else {
      feedback.push('Demonstrated strong non-immigrant intent, viable funding sources, and credible career direction in Nepal.');
    }

    const overall = Math.round((finScore + academicScore + tiesScore + confidenceScore) / 4);

    setEvaluation({
      verdict: isApproved ? 'ISSUED' : 'REFUSED_214B',
      overallScore: overall,
      financialScore: finScore,
      academicIntentScore: academicScore,
      homeTiesScore: tiesScore,
      confidenceScore: confidenceScore,
      redFlagsTriggered: [],
      greenFlagsTriggered: [],
      feedbackList: feedback,
    });
  }, [router]);

  if (!profile || !evaluation) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12 flex justify-center items-center font-sans">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Banner Verdict */}
        <div
          className={`p-8 text-center border-b ${
            evaluation.verdict === 'ISSUED'
              ? 'bg-emerald-950/40 border-emerald-800'
              : 'bg-rose-950/40 border-rose-800'
          }`}
        >
          {evaluation.verdict === 'ISSUED' ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 mb-3" />
              <h1 className="text-2xl font-bold text-emerald-300">VISA ISSUED (APPROVED)</h1>
              <p className="text-xs text-emerald-400/80 mt-1">
                Your passport has been retained for F-1 visa placement.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-rose-400 mb-3" />
              <h1 className="text-2xl font-bold text-rose-300">REFUSED UNDER SECTION 214(b)</h1>
              <p className="text-xs text-rose-400/80 mt-1">
                Failure to overcome the statutory presumption of immigrant intent.
              </p>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Consular Scorecard</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                <div className="text-slate-400">Financial Credibility</div>
                <div className="text-lg font-bold text-blue-400 mt-1">{evaluation.financialScore}/100</div>
              </div>
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                <div className="text-slate-400">Home Ties to Nepal (214b)</div>
                <div className="text-lg font-bold text-purple-400 mt-1">{evaluation.homeTiesScore}/100</div>
              </div>
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                <div className="text-slate-400">Academic Intent</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">{evaluation.academicIntentScore}/100</div>
              </div>
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                <div className="text-slate-400">Seriousness & Demeanor</div>
                <div className="text-lg font-bold text-amber-400 mt-1">{evaluation.confidenceScore}/100</div>
              </div>
            </div>
          </div>

          {/* Feedback Notes */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Consular Adjudication Notes
            </h3>
            <div className="space-y-2">
              {evaluation.feedbackList?.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                  👉 {item}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex gap-4">
            <button
              onClick={() => router.push('/interview')}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Retake Interview
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> New Student Profile
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}