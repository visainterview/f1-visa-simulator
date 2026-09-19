'use client';

import { StudentProfile } from '@/lib/types';
import { Building2, DollarSign, UserCheck } from 'lucide-react';

export default function ApplicantDossier({ profile }: { profile: StudentProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl font-mono">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Applicant
        </div>
        <div className="text-base font-bold text-slate-100">{profile.fullName}</div>
        <div className="text-xs text-slate-400">
          DOB: {profile.dob} ({profile.age} yrs) {profile.age < 18 && '• MINOR'}
        </div>
        <div className="text-xs text-slate-500">{profile.address}</div>
      </div>

      <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-purple-400" /> Academic Case
        </div>
        <div className="text-sm font-semibold text-slate-200">{profile.targetUniversity}</div>
        <div className="text-xs text-slate-400">
          {profile.degreeLevel} - {profile.major}
        </div>
        <div className="text-xs text-emerald-400">I-20 Cost: ${profile.i20CostUSD.toLocaleString()}/yr</div>
      </div>

      <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Sponsorship & Ties
        </div>
        <div className="text-sm font-semibold text-slate-200">{profile.primarySponsor}</div>
        <div className="text-xs text-slate-400">Income: NPR {(profile.annualFamilyIncomeNPR / 100000).toFixed(1)} Lakhs/yr</div>
        <div className="text-xs text-rose-400">
          Prior Refusals: {profile.hasPriorRefusal ? 'YES (Sec 214b)' : 'None'}
        </div>
      </div>
    </div>
  );
}