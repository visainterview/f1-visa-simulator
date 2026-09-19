'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfile } from '@/lib/types';
import { analyzeStudentCase, AnalysisResult } from '@/lib/redFlagDetector';
import { AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, Award, ArrowLeft, HelpCircle } from 'lucide-react';

export default function VoPanelPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('f1_applicant_profile');
    if (!raw) {
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(raw);
      const gross = Number(data.grossI20CostUSD ?? data.i20CostUSD ?? 0);
      const scholarship = Number(data.scholarshipUSD ?? 0);
      const net = data.netI20PayableUSD !== undefined ? Number(data.netI20PayableUSD) : Math.max(0, gross - scholarship);

      const sanitizedProfile: StudentProfile = {
        ...data,
        grossI20CostUSD: gross,
        scholarshipUSD: scholarship,
        netI20PayableUSD: net,
        annualFamilyIncomeNPR: Number(data.annualFamilyIncomeNPR ?? 0),
        age: Number(data.age ?? 18),
        gapYears: Number(data.gapYears ?? 0),
      };

      setProfile(sanitizedProfile);
      setAnalysis(analyzeStudentCase(sanitizedProfile));
    } catch (e) {
      console.error(e);
      router.push('/');
    }
  }, [router]);

  if (!profile || !analysis) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading Consular CCD Adjudication File...
      </div>
    );
  }

  const grossCost = Number(profile.grossI20CostUSD || 0);
  const scholarshipCost = Number(profile.scholarshipUSD || 0);
  const netCost = Number(profile.netI20PayableUSD || 0);
  const incomeNPR = Number(profile.annualFamilyIncomeNPR || 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto border border-slate-800/80 bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* CCD Top Bar */}
        <div className="bg-slate-800/60 px-6 py-3.5 border-b border-slate-700/60 flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 bg-slate-700/70 hover:bg-slate-600 text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit Dossier
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200 uppercase tracking-wide">
                U.S. DOS CCD SYSTEM • KATHMANDU POST
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            REF: NP-KTM-{String(profile.dob || '0000').replace(/-/g, '')}-F1 | DEFAULT 214(b) ACTIVE
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          
          {/* Candidate Dossier Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/60 p-6 rounded-xl border border-slate-800/70 text-xs">
            <div className="space-y-1.5">
              <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Applicant & Academics</div>
              <div className="text-lg font-bold text-blue-400">{profile.fullName || 'N/A'}</div>
              <div className="text-slate-300">
                DOB: {profile.dob} ({profile.age} yrs old) • {profile.address}
              </div>
              <div className="text-slate-200 font-medium mt-1">
                +2 GPA: <span className="text-emerald-400">{profile.plusTwoGpa || 'N/A'}</span> | SEE GPA: <span className="text-emerald-400">{profile.seeGpa || 'N/A'}</span>
              </div>
              <div className="text-slate-400">
                Test: <span className="text-purple-300 font-semibold">{profile.testType} {profile.testScore}</span>
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium mt-1 bg-slate-800 text-slate-300">
                {profile.isMinor ? 'Minor (<17.5)' : profile.isNearAdult ? 'Near-Adult (17.5+)' : 'Adult (18+)'}
              </div>
            </div>

            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
              <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Institution & Program</div>
              <div className="text-base font-bold text-slate-100">{profile.targetUniversity}</div>
              <div className="text-slate-300">{profile.degreeLevel || 'Undergraduate'} • {profile.major}</div>
              <div className="text-slate-400">Gross I-20: ${grossCost.toLocaleString()}/yr</div>
              {scholarshipCost > 0 && (
                <div className="text-purple-400 flex items-center gap-1 font-medium">
                  <Award className="w-3.5 h-3.5" /> Scholarship: ${scholarshipCost.toLocaleString()}
                </div>
              )}
              <div className="text-emerald-400 font-bold text-sm">Net Payable: ${netCost.toLocaleString()}/yr</div>
            </div>

            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
              <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Sponsor & Ties</div>
              <div className="text-base font-bold text-slate-100">{profile.primarySponsor}</div>
              <div className="text-slate-300">{profile.sponsorOccupation}</div>
              {profile.sponsorSubDetails && (
                <div className="text-slate-400 text-xs italic">&ldquo;{profile.sponsorSubDetails}&rdquo;</div>
              )}
              <div className="text-slate-300 font-medium">
                Annual Income: NPR {(incomeNPR / 100000).toFixed(1)} Lakhs
              </div>
              <div className="text-rose-400 font-medium">
                Prior Refusal: {profile.hasPriorRefusal ? 'YES (Sec 214b on file)' : 'None'}
              </div>
            </div>
          </div>

          {/* Green Flags vs Red Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Mitigating Factors (Green Flags)
              </div>
              {analysis.greenFlags.map((flag, idx) => (
                <div key={idx} className="p-2.5 bg-emerald-900/15 border border-emerald-800/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="leading-relaxed">{flag}</span>
                </div>
              ))}
            </div>

            <div className="p-5 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Risk Indicators (Red Flags)
              </div>
              {analysis.redFlags.map((flag, idx) => (
                <div key={idx} className="p-2.5 bg-rose-900/15 border border-rose-800/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <span className="text-rose-400 font-bold">⚠️</span>
                  <span className="leading-relaxed">{flag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Consular Inquiries */}
          <div className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Recommended Consular Grilling Lines
            </div>
            <div className="space-y-2">
              {analysis.suggestedQuestions.map((q, idx) => (
                <div key={idx} className="text-xs text-slate-200 bg-blue-950/20 p-3 rounded-lg border border-blue-900/30 leading-relaxed">
                  👉 &ldquo;{q}&rdquo;
                </div>
              ))}
            </div>
          </div>

          {/* Summon CTA */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              CCD Adjudication Checklist complete. Proceed to window interview.
            </div>
            <button
              onClick={() => router.push('/interview')}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>Summon Applicant to Window</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}