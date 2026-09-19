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

    let finScore = 75;
    let academicScore = 80;
    let tiesScore = 70;
    let confidenceScore = 80;

    const studentAnswers = history
      .filter((m) => m.sender === 'student')
      .map((m) => m.text.toLowerCase().trim());
    const combinedText = studentAnswers.join(' ');

    const feedback: string[] = [];

    // Check for nonsense, flippant, or troll answers
    const hasNonsense = studentAnswers.some(
      (ans) =>
        ans.includes('idi') ||
        ans.includes('dik') ||
        ans === 'by fun' ||
        ans === 'for fun' ||
        ans === 'idk' ||
        ans === 'i dont know' ||
        ans.length < 3
    );

    if (hasNonsense) {
      finScore = 15;
      academicScore = 10;
      tiesScore = 10;
      confidenceScore = 10;
      feedback.push(
        'Flippant or Nonsensical Answers: Responding with jokes, slang, or "I don\'t know" immediately proves lack of serious academic intent. Mandatory 214(b) refusal.'
      );
    }

    // Sibling in US Penalty
    if (data.hasSiblingInUS) {
      tiesScore -= 30;
      feedback.push(
        `Sibling in the US (${data.siblingUSStatus || 'Resident'}): Substantial Section 214(b) immigrant intent risk. The applicant failed to overcome the presumption of joining family in the U.S.`
      );
    }

    // Financial calculations
    const netCost = Number(data.netI20PayableUSD ?? data.grossI20CostUSD ?? 0);
    const incomeUSD = Number(data.annualFamilyIncomeNPR || 0) / 135;
    if (incomeUSD < netCost) {
      finScore -= 35;
      feedback.push('Financial Deficit: Stated family annual income does not support multi-year net payable I-20 expenses.');
    }

    // Home ties check
    if (!hasNonsense && !combinedText.includes('nepal') && !combinedText.includes('return')) {
      tiesScore -= 20;
      feedback.push('Weak Home Ties: Failed to establish a concrete return career trajectory in Nepal.');
    }

    const overall = Math.round((finScore + academicScore + tiesScore + confidenceScore) / 4);
    const isApproved = !hasNonsense && overall >= 65 && finScore >= 50 && tiesScore >= 50;

    if (isApproved) {
      feedback.push('Demonstrated convincing academic intent, justifiable funds, and clear career ties to Nepal.');
    }

    setEvaluation({
      verdict: isApproved ? 'ISSUED' : 'REFUSED_214B',
      overallScore: overall,
      financialScore: Math.max(0, finScore),
      academicIntentScore: Math.max(0, academicScore),
      homeTiesScore: Math.max(0, tiesScore),
      confidenceScore: Math.max(0, confidenceScore),
      redFlagsTriggered: [],
      greenFlagsTriggered: [],
      feedbackList: feedback,
    });
  }, [router]);

  if (!profile || !evaluation) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12 flex justify-center items-center font-mono">
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
                Your passport has been retained for F-1 visa issuance.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-rose-400 mb-3" />
              <h1 className="text-2xl font-bold text-rose-300">REFUSED UNDER SECTION 214(b)</h1>
              <p className="text-xs text-rose-400/80 mt-1">
                Failure to overcome presumption of immigrant intent or demonstrate bona fide non-immigrant purpose.
              </p>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Consular Scorecard.</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="text-slate-400">Financial Credibility</div>
                <div className="text-lg font-bold text-blue-400">{evaluation.financialScore}/100</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="text-slate-400">Home Ties to Nepal (214b)</div>
                <div className="text-lg font-bold text-purple-400">{evaluation.homeTiesScore}/100</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="text-slate-400">Academic Intent</div>
                <div className="text-lg font-bold text-emerald-400">{evaluation.academicIntentScore}/100</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="text-slate-400">Delivery & Seriousness</div>
                <div className="text-lg font-bold text-amber-400">{evaluation.confidenceScore}/100</div>
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
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300">
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